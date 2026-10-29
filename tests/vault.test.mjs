import test from 'node:test';
import assert from 'node:assert/strict';
import { accessOk, listFolder, firstImage, imageResponse, cleanPrefix } from '../lib/vault.mjs';

/*
  The vault is private because every request must carry a Cloudflare Access
  JWT that verifies. If that check ever loosens, the slides become public with
  no error anywhere, so the refusals are asserted here as carefully as the
  happy path. The R2 bucket is a small in-memory stand-in with the same list
  semantics (prefix + delimiter).
*/

const kp = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true, ['sign', 'verify'],
);
const jwk = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1', alg: 'RS256' };
const fakeFetch = async () => ({ json: async () => ({ keys: [jwk] }) });
const b64u = (b) => Buffer.from(b).toString('base64url');
const env = { VAULT_TEAM_DOMAIN: 'team.cloudflareaccess.com', VAULT_POLICY_AUD: 'AUD123' };

async function token({ aud = 'AUD123', iss = 'https://team.cloudflareaccess.com', exp = Date.now() / 1000 + 600, kid = 'k1' } = {}) {
  const h = b64u(JSON.stringify({ alg: 'RS256', kid }));
  const p = b64u(JSON.stringify({ aud: [aud], iss, exp, email: 'me@example.com' }));
  const s = b64u(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(`${h}.${p}`)));
  return `${h}.${p}.${s}`;
}
const hdr = (t) => new Headers(t ? { 'cf-access-jwt-assertion': t } : {});

test('access: a valid Access token is accepted', async () => {
  assert.equal(await accessOk(hdr(await token()), env, fakeFetch), true);
});

test('access: missing, wrong-app, expired, foreign-issuer and tampered tokens are refused', async () => {
  assert.equal(await accessOk(hdr(), env, fakeFetch), false);
  assert.equal(await accessOk(hdr(await token({ aud: 'OTHER' })), env, fakeFetch), false);
  assert.equal(await accessOk(hdr(await token({ exp: Date.now() / 1000 - 5 })), env, fakeFetch), false);
  assert.equal(await accessOk(hdr(await token({ iss: 'https://evil.cloudflareaccess.com' })), env, fakeFetch), false);
  assert.equal(await accessOk(hdr(await token({ kid: 'unknown' })), env, fakeFetch), false);
  const good = await token();
  assert.equal(await accessOk(hdr(good.slice(0, -4) + 'AAAA'), env, fakeFetch), false);
  assert.equal(await accessOk(hdr('not.a.jwt'), env, fakeFetch), false);
});

test('access: fails closed when the vault is not configured', async () => {
  assert.equal(await accessOk(hdr(await token()), {}, fakeFetch), false);
});

const keys = ['a/c1/02.webp', 'a/c1/01.webp', 'a/c2/01.webp', 'top.webp', 'a/note.txt'];
const bucket = {
  async list({ prefix = '', delimiter }) {
    const objects = [];
    const prefixes = new Set();
    for (const k of keys.filter((k) => k.startsWith(prefix))) {
      const rest = k.slice(prefix.length);
      if (delimiter && rest.includes('/')) prefixes.add(prefix + rest.split('/')[0] + '/');
      else objects.push({ key: k });
    }
    return { objects, delimitedPrefixes: [...prefixes], truncated: false };
  },
  async get(k) {
    return keys.includes(k) ? { body: 'IMG', httpEtag: '"e"', writeHttpMetadata: (h) => h.set('content-type', 'image/webp') } : null;
  },
};

test('listing: folders and sorted images per level, non-images dropped', async () => {
  assert.deepEqual(await listFolder(bucket, ''), { folders: ['a/'], images: ['top.webp'], cursor: null });
  assert.deepEqual(await listFolder(bucket, 'a'), { folders: ['a/c1/', 'a/c2/'], images: [], cursor: null });
  assert.deepEqual((await listFolder(bucket, 'a/c1/')).images, ['a/c1/01.webp', 'a/c1/02.webp']);
  assert.equal(cleanPrefix('/x/y'), 'x/y/');
});

test('covers and images: first slide by name, only image keys served', async () => {
  assert.equal(await firstImage(bucket, 'a/'), 'a/c1/01.webp');
  assert.equal(await firstImage(bucket, 'missing/'), null);
  assert.equal((await imageResponse(bucket, 'a/c1/01.webp', new Headers())).status, 200);
  assert.equal((await imageResponse(bucket, 'a/note.txt', new Headers())).status, 404);
  assert.equal((await imageResponse(bucket, 'nope.webp', new Headers())).status, 404);
});
