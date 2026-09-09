import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/types/database';
import { supabaseAnonKey, supabaseUrl } from '@/lib/env';

/**
 * Refreshes the auth cookie on every request so Server Components see a live
 * session. Without this a magic-link session silently expires mid-visit.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!supabaseUrl || !supabaseAnonKey) return response;

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}
