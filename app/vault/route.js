import { VAULT_PAGE } from '../../lib/vault-page.mjs';
import { loginPage } from '../../lib/vault-login.mjs';
import { SEC_HEADERS, makeSession, passwordMatches, sessionCookie, sessionOk } from '../../lib/vault.mjs';
import { workerEnv } from '../../lib/vault-env.mjs';

// Private ccinemto slide vault. Raw HTML from a route handler so the portfolio
// layout does not wrap it. GET shows the gallery to a signed-in browser and the
// password screen to anyone else; POST checks the password.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HTML = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', ...SEC_HEADERS };

export async function GET(request) {
  const env = await workerEnv();
  if (!env) return new Response(loginPage('The vault is not set up yet.'), { status: 503, headers: HTML });
  if (await sessionOk(request.headers, env)) return new Response(VAULT_PAGE, { headers: HTML });
  return new Response(loginPage(), { status: 401, headers: HTML });
}

export async function POST(request) {
  const env = await workerEnv();
  if (!env) return new Response(loginPage('The vault is not set up yet.'), { status: 503, headers: HTML });
  let password = '';
  try {
    password = String((await request.formData()).get('password') || '').slice(0, 200);
  } catch {}
  if (!(await passwordMatches(password, env))) {
    await new Promise((r) => setTimeout(r, 800)); // slows guessing
    return new Response(loginPage('Wrong password.'), { status: 401, headers: HTML });
  }
  return new Response(null, {
    status: 303,
    headers: { location: '/vault', 'set-cookie': sessionCookie(await makeSession(env)), ...SEC_HEADERS },
  });
}
