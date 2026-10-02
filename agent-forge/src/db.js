import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

let cached = null;

/** The service-role Supabase client. Server-side only -- never ship this key. */
export function db() {
  if (cached) return cached;
  const { url, key } = config.supabase.client;
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** supabase-js returns {data, error}; throwing keeps call sites linear. */
export function unwrap({ data, error }, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
  return data;
}
