/*
  Private gallery over the ccinemto-vault R2 bucket, served under /vault.

  Locked by a single password. Every /vault request must carry a session
  cookie signed with that password; without VAULT_PASSWORD set, nobody can sign
  in at all (fails closed).

  Needs, in the Worker's environment:
    VAULT            R2 binding to the ccinemto-vault bucket (wrangler.jsonc)
    VAULT_PASSWORD   Worker secret, pushed from the GitHub secret of the same
                     name by .github/workflows/deploy-cloudflare.yml
*/

export const IMG = /\.(webp|jpe?g|png|gif|avif)$/i;

export const SEC_HEADERS = {
  'x-robots-tag': 'noindex, nofollow',
  'referrer-policy': 'no-referrer',
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
};

export function unauthorized() {
  return new Response('Sign in at /vault', { status: 401, headers: SEC_HEADERS });
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

// ---------- Password session ----------

/*
  One password, held only as the VAULT_PASSWORD secret on the Worker (never in
  this repo). Signing in sets an HttpOnly cookie carrying an expiry and an
  HMAC of that expiry keyed by the password, so nothing secret sits in the
  browser, sessions cannot be forged without the password, and changing the
  password logs every session out.
*/

export const SESSION_COOKIE = 'vault_session';
export const SESSION_DAYS = 30;
const enc = new TextEncoder();

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('');
}

function sameString(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function passwordMatches(input, env) {
  const real = env?.VAULT_PASSWORD;
  if (!real || typeof input !== 'string' || !input) return false;
  // Compare fixed-length digests so the time taken says nothing about the password.
  const [a, b] = await Promise.all([hmacHex('vault-compare', input), hmacHex('vault-compare', real)]);
  return sameString(a, b);
}

export async function makeSession(env, now = Date.now()) {
  const exp = Math.floor(now / 1000) + SESSION_DAYS * 86400;
  return `${exp}.${await hmacHex(env.VAULT_PASSWORD, `vault-session:${exp}`)}`;
}

export function readCookie(headers, name) {
  const raw = headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}

export async function sessionOk(headers, env, now = Date.now()) {
  if (!env?.VAULT_PASSWORD) return false;
  const value = readCookie(headers, SESSION_COOKIE);
  const m = /^(\d{9,12})\.([0-9a-f]{64})$/.exec(value);
  if (!m) return false;
  if (Number(m[1]) * 1000 < now) return false;
  return sameString(m[2], await hmacHex(env.VAULT_PASSWORD, `vault-session:${m[1]}`));
}

export function sessionCookie(value) {
  return `${SESSION_COOKIE}=${value}; Path=/vault; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}`;
}

export const CLEAR_COOKIE = `${SESSION_COOKIE}=; Path=/vault; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
