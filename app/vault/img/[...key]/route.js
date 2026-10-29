import { forbidden, imageResponse } from '../../../../lib/vault.mjs';
import { vaultEnv } from '../../../../lib/vault-env.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const env = await vaultEnv(request);
  if (!env) return forbidden();
  const { key } = await params;
  return imageResponse(env.VAULT, (key || []).join('/'), request.headers);
}
