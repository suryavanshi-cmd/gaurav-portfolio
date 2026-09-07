import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, isSupabaseConfigured } from '../env';

/* The anon client, carrying the visitor's session cookie. Everything it reads
   and writes goes through row-level security — this is the client the app uses
   almost everywhere. */
export async function createServerSupabase() {
  if (!isSupabaseConfigured) return null;
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(items) {
        try {
          items.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a server component, where cookies are read-only. The
          // middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/* The service-role client bypasses row-level security completely. It is used in
   exactly two places — admin approvals and the payment webhook — and must never
   be constructed in code that can reach the browser. */
export function createAdminSupabase() {
  if (!isSupabaseConfigured || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

export async function getSessionUser() {
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function getProfile() {
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id, role, full_name, phone, email, preferred_language')
    .eq('id', userData.user.id)
    .maybeSingle();
  return data ?? null;
}
