import { getCloudflareContext } from '@opennextjs/cloudflare';
import { sessionOk } from './vault.mjs';

// The Worker env, or null when not running on Cloudflare (e.g. `next dev`)
// or when the vault is not configured.
export async function workerEnv() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env?.VAULT && env?.VAULT_PASSWORD ? env : null;
  } catch {
    return null;
  }
}

// The env for a signed-in /vault request, or null. Every data route calls this.
export async function vaultEnv(request) {
  const env = await workerEnv();
  if (!env) return null;
  return (await sessionOk(request.headers, env)) ? env : null;
}
