import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets — and notably not /api/jobs/*/process,
    // which is called machine-to-machine and carries no cookie to refresh.
    '/((?!_next/static|_next/image|favicon.ico|api/jobs|api/worker|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)',
  ],
};
