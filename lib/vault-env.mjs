import { getCloudflareContext } from '@opennextjs/cloudflare';
import { accessOk } from './vault.mjs';

/*
  Resolves the Worker env for a /vault request, or null when the request is not
  signed by Cloudflare Access or the vault is not configured. Every /vault route
  calls this first.
*/
export async function vaultEnv(request) {
  let env;
  try {
    ({ env } = await getCloudflareContext({ async: true }));
  } catch {
    return null; // not running on Cloudflare (e.g. `next dev`): no vault
  }
  if (!env?.VAULT) return null;
  return (await accessOk(request.headers, env)) ? env : null;
}
