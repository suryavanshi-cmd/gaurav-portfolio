import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

let client = null;

/**
 * Server-side Supabase client using the SERVICE ROLE key.
 *
 * This key bypasses row level security and can mint credit, so it must never
 * reach a browser. It is read from the environment, never sent to a client,
 * and every route that uses it authenticates the caller first.
 */
export function supabase() {
  if (!config.supabase.enabled) {
    throw new Error('Supabase is not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  if (!client) {
    client = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'x-application-name': 'rakta-setu' } },
    });
  }
  return client;
}

/** Calls a Postgres function and throws with useful context on failure. */
export async function rpc(fn, args) {
  const { data, error } = await supabase().rpc(fn, args);
  if (error) {
    const err = new Error(`Supabase RPC ${fn} failed: ${error.message}`);
    err.cause = error;
    err.code = error.code;
    throw err;
  }
  // Our RETURNS TABLE functions come back as a single-row array.
  return Array.isArray(data) ? data[0] ?? null : data;
}
