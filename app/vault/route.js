import { VAULT_PAGE } from '../../lib/vault-page.mjs';
import { SEC_HEADERS, forbidden } from '../../lib/vault.mjs';
import { vaultEnv } from '../../lib/vault-env.mjs';

// Private ccinemto slide vault. Raw HTML from a route handler so the portfolio
// layout does not wrap it; access is enforced in vaultEnv (Cloudflare Access).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  if (!(await vaultEnv(request))) return forbidden();
  return new Response(VAULT_PAGE, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', ...SEC_HEADERS },
  });
}
