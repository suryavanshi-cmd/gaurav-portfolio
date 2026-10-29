/*
  Private gallery over the ccinemto-vault R2 bucket, served under /vault.

  Who can see it is decided by Cloudflare Access, not by this code: an Access
  application on www.gauravspace.com/vault signs every request it lets through
  with a JWT. This module verifies that JWT against Access's public keys and
  refuses anything without a valid one, so if the Access app is ever deleted or
  misconfigured the vault returns 403 instead of serving slides (fails closed).

  Needs, in the Worker's environment:
    VAULT                R2 binding to the ccinemto-vault bucket (wrangler.jsonc)
    VAULT_TEAM_DOMAIN    e.g. gaurav.cloudflareaccess.com  (dashboard variable)
    VAULT_POLICY_AUD     the Access application's AUD tag  (dashboard variable)
*/

export const IMG = /\.(webp|jpe?g|png|gif|avif)$/i;

export const SEC_HEADERS = {
  'x-robots-tag': 'noindex, nofollow',
  'referrer-policy': 'no-referrer',
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
};

export function forbidden() {
  return new Response('Forbidden', { status: 403, headers: SEC_HEADERS });
}

export function cleanPrefix(p) {
  p = (p || '').replace(/^\/+/, '');
  return p && !p.endsWith('/') ? p + '/' : p;
}

// ---------- R2 ----------

export async function listFolder(bucket, prefix, cursor) {
  const r = await bucket.list({ prefix: cleanPrefix(prefix), delimiter: '/', cursor: cursor || undefined, limit: 500 });
  return {
    folders: r.delimitedPrefixes || [],
    images: r.objects.map((o) => o.key).filter((k) => IMG.test(k)).sort(),
    cursor: r.truncated ? r.cursor : null,
  };
}

export async function firstImage(bucket, prefix) {
  let cursor;
  for (let i = 0; i < 3; i++) {
    const r = await bucket.list({ prefix: cleanPrefix(prefix), cursor, limit: 50 });
    const hit = r.objects.map((o) => o.key).filter((k) => IMG.test(k)).sort()[0];
    if (hit) return hit;
    if (!r.truncated) return null;
    cursor = r.cursor;
  }
  return null;
}

export async function imageResponse(bucket, key, requestHeaders) {
  if (!key || !IMG.test(key)) return new Response('Not found', { status: 404, headers: SEC_HEADERS });
  const obj = await bucket.get(key, { onlyIf: requestHeaders });
  if (!obj) return new Response('Not found', { status: 404, headers: SEC_HEADERS });
  const h = new Headers(SEC_HEADERS);
  obj.writeHttpMetadata(h);
  h.set('etag', obj.httpEtag);
  h.set('cache-control', 'private, max-age=86400');
  if (!h.get('content-type')) h.set('content-type', key.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
  if (!('body' in obj) || !obj.body) return new Response(null, { status: 304, headers: h });
  return new Response(obj.body, { headers: h });
}

// ---------- Cloudflare Access JWT ----------

let certCache = { at: 0, team: '', keys: [] };

function b64uBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  s += '==='.slice((s.length + 3) % 4);
  const bin = atob(s);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
const b64uJson = (s) => JSON.parse(new TextDecoder().decode(b64uBytes(s)));

async function accessKeys(team, fetchImpl, fresh) {
  if (!fresh && certCache.team === team && certCache.keys.length && Date.now() - certCache.at < 3_600_000) {
    return certCache.keys;
  }
  const r = await fetchImpl(`https://${team}/cdn-cgi/access/certs`);
  const j = await r.json();
  certCache = { at: Date.now(), team, keys: j.keys || [] };
  return certCache.keys;
}

export async function accessOk(headers, env, fetchImpl = fetch) {
  const token = headers.get('cf-access-jwt-assertion');
  const teamRaw = env?.VAULT_TEAM_DOMAIN;
  const audWanted = env?.VAULT_POLICY_AUD;
  if (!token || !teamRaw || !audWanted) return false;
  try {
    const team = String(teamRaw).replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return false;
    const header = b64uJson(h);
    const payload = b64uJson(p);
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(audWanted)) return false;
    if (!payload.exp || payload.exp * 1000 < Date.now()) return false;
    if (payload.iss !== `https://${team}`) return false;
    let jwk = (await accessKeys(team, fetchImpl)).find((k) => k.kid === header.kid);
    if (!jwk) jwk = (await accessKeys(team, fetchImpl, true)).find((k) => k.kid === header.kid);
    if (!jwk) return false;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64uBytes(s), new TextEncoder().encode(`${h}.${p}`));
  } catch {
    return false;
  }
}
