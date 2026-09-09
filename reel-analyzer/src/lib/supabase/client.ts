'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/types/database';

/**
 * Browser client. Referencing the env vars literally (rather than through a
 * helper) is deliberate — Next inlines NEXT_PUBLIC_* only at literal call sites.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  return createBrowserClient<Database>(url, key);
}
