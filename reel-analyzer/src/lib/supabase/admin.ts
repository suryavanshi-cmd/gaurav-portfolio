import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';
import { requirePublicSupabaseConfig, requireServiceRoleKey } from '@/lib/env';

/**
 * Service-role client. Bypasses RLS, so it must never be constructed in code
 * that can reach the browser — only route handlers under /api use it, and every
 * one of them checks ownership itself before touching a row.
 */
export function createAdminClient() {
  const { url } = requirePublicSupabaseConfig();
  return createSupabaseClient<Database>(url, requireServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
