import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured, HOST_SUBDOMAIN } from '@/lib/env';

/* Two portals, one deployment.

   www.connecttonature.com serves the traveller portal from /(customer), and
   shetkari.connecttonature.com serves the farmer portal from /shetkari. The
   subdomain is rewritten onto the path here, so both portals share one build,
   one database and one session cookie — a farmer who signs in on the shetkari
   subdomain is signed in on the main site too.

   The /shetkari path also works directly on the root domain, which is what
   makes the host portal reachable on localhost and on Vercel preview URLs
   where no subdomain exists. */

const PORTAL_HEADER = 'x-ctn-portal';

function isHostPortal(hostname: string): boolean {
  const host = hostname.split(':')[0];
  return (
    host.startsWith(`${HOST_SUBDOMAIN}.`) ||
    host === `${HOST_SUBDOMAIN}.localhost` ||
    host.startsWith('host.')
  );
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') ?? '';
  const portal = isHostPortal(hostname) || url.pathname.startsWith('/shetkari') ? 'host' : 'customer';

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PORTAL_HEADER, portal);

  let response: NextResponse;
  if (portal === 'host' && !url.pathname.startsWith('/shetkari')) {
    url.pathname = `/shetkari${url.pathname === '/' ? '' : url.pathname}`;
    response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }
  response.headers.set(PORTAL_HEADER, portal);

  // Refresh the Supabase session so server components see a live token. Without
  // this a signed-in host is signed out the moment their access token expires.
  if (isSupabaseConfigured) {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(items) {
          items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    await supabase.auth.getUser();
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
