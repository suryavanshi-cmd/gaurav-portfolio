import Link from 'next/link';
import { Clapperboard } from 'lucide-react';
import { getUser } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/env';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SignOutButton } from '@/components/SignOutButton';

export async function SiteNav() {
  const user = isSupabaseConfigured ? await getUser() : null;

  let credits: number | null = null;
  if (user) {
    try {
      const { data } = await createAdminClient()
        .from('profiles')
        .select('credits_remaining')
        .eq('id', user.id)
        .maybeSingle();
      credits = data?.credits_remaining ?? null;
    } catch {
      // The service-role key is optional for browsing; only the pipeline needs it.
    }
  }

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Clapperboard className="size-5 text-primary" />
          Reel Analyzer
        </Link>

        <div className="flex items-center gap-3">
          {credits !== null && (
            <Badge variant="secondary" className="tabular-nums">
              {credits} {credits === 1 ? 'credit' : 'credits'}
            </Badge>
          )}
          {user ? (
            <SignOutButton />
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link href="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
