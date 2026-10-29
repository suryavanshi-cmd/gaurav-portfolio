import test from 'node:test';
import assert from 'node:assert/strict';
import {
  listFolder, firstImage, imageResponse, cleanPrefix,
  passwordMatches, makeSession, sessionOk, sessionCookie, SESSION_COOKIE,
} from '../lib/vault.mjs';
import { loginPage } from '../lib/vault-login.mjs';

/*
  The vault is private because every request must carry a session cookie
  signed with VAULT_PASSWORD. If that check ever loosens, the slides become
  public with no error anywhere, so the refusals are asserted here as carefully
  as the happy path. The R2 bucket is a small in-memory stand-in with the same
  list semantics (prefix + delimiter). The password below is a test value.
*/

const env = { VAULT_PASSWORD: 'test-password-123' };
const withCookie = (v) => new Headers({ cookie: `other=1; ${SESSION_COOKIE}=${v}` });

test('password: only the exact password matches', async () => {
  assert.equal(await passwordMatches('test-password-123', env), true);
  for (const wrong of ['', 'test-password-12', 'test-password-1234', 'TEST-PASSWORD-123', ' test-password-123']) {
    assert.equal(await passwordMatches(wrong, env), false, JSON.stringify(wrong));
  }
  assert.equal(await passwordMatches('anything', {}), false, 'no password configured means nobody gets in');
});

test('session: a cookie made by sign-in is accepted', async () => {
  const v = await makeSession(env);
  assert.equal(await sessionOk(withCookie(v), env), true);
  assert.match(sessionCookie(v), /HttpOnly; Secure; SameSite=Strict/);
});

test('session: missing, forged, expired and other-password cookies are refused', async () => {
  assert.equal(await sessionOk(new Headers(), env), false);
  assert.equal(await sessionOk(withCookie('garbage'), env), false);
  const v = await makeSession(env);
  const [exp, sig] = v.split('.');
  assert.equal(await sessionOk(withCookie(`${Number(exp) + 86400}.${sig}`), env), false, 'stretched expiry');
  assert.equal(await sessionOk(withCookie(`${exp}.${'0'.repeat(64)}`), env), false, 'forged signature');
  const old = await makeSession(env, Date.now() - 31 * 86400 * 1000);
  assert.equal(await sessionOk(withCookie(old), env), false, 'expired');
  assert.equal(await sessionOk(withCookie(v), { VAULT_PASSWORD: 'changed' }), false, 'password changed');
  assert.equal(await sessionOk(withCookie(v), {}), false, 'not configured');
});

test('login page never contains the password', () => {
  assert.equal(loginPage('Wrong password.').includes(env.VAULT_PASSWORD), false);
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
