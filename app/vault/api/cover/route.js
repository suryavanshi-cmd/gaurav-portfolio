import { SEC_HEADERS, firstImage, imageResponse, unauthorized } from '../../../../lib/vault.mjs';
import { vaultEnv } from '../../../../lib/vault-env.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const env = await vaultEnv(request);
  if (!env) return unauthorized();
  const key = await firstImage(env.VAULT, new URL(request.url).searchParams.get('prefix'));
  if (!key) return new Response('No image', { status: 404, headers: SEC_HEADERS });
  return imageResponse(env.VAULT, key, request.headers);
}
