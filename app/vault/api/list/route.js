import { SEC_HEADERS, forbidden, listFolder } from '../../../../lib/vault.mjs';
import { vaultEnv } from '../../../../lib/vault-env.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const env = await vaultEnv(request);
  if (!env) return forbidden();
  const url = new URL(request.url);
  const body = await listFolder(env.VAULT, url.searchParams.get('prefix'), url.searchParams.get('cursor'));
  return Response.json(body, { headers: { 'cache-control': 'no-store', ...SEC_HEADERS } });
}
