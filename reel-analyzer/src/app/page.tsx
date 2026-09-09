import Link from 'next/link';
import { formatDistanceToNowStrict } from '@/lib/format-date';
import { getUser, createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { IngestPanel } from '@/components/IngestPanel';
import { SetupNotice } from '@/components/SetupNotice';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default async function HomePage() {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const user = await getUser();

  return (
    <div className="space-y-12 pt-6">
      <section className="space-y-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Find out why a reel worked
        </h1>
        <p className="text-muted-foreground mx-auto max-w-xl text-balance">
          Give it a reel and get back the hook, the structure with timestamps, the tone, who it was
          written for, and what actually made it travel.
        </p>
      </section>

      {user ? <IngestPanel /> : <SignedOutPrompt />}

      {user && <RecentReels />}
    </div>
  );
}

function SignedOutPrompt() {
  return (
    <Card className="mx-auto max-w-md">
      <CardContent className="space-y-4 text-center">
        <p className="text-sm">Sign in to analyse a reel. Five free analyses to start.</p>
        <Button asChild className="w-full">
          <Link href="/auth">Sign in</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

async function RecentReels() {
  const supabase = await createClient();

  // RLS scopes both of these to the signed-in user, so no explicit user filter
  // is needed. The job is fetched separately rather than embedded — one round
  // trip more, but it keeps the hand-written database types free of PostgREST
  // relationship metadata.
  const { data: reels } = await supabase
    .from('reels')
    .select('id, source, caption, author_handle, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!reels?.length) return null;

  const { data: jobs } = await supabase
    .from('jobs')
    .select('reel_id, status')
    .in('reel_id', reels.map((reel) => reel.id));

  const statusByReel = new Map(jobs?.map((job) => [job.reel_id, job.status]) ?? []);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium tracking-tight">Recent</h2>
      <ul className="divide-y rounded-lg border">
        {reels.map((reel) => {
          const status = statusByReel.get(reel.id) ?? 'queued';
          const done = status === 'done';

          // The report page sends an unfinished reel on to its status page,
          // so one link works whatever state the job is in.
          return (
            <li key={reel.id}>
              <Link
                href={`/reels/${reel.id}`}
                className="hover:bg-accent/50 flex items-center justify-between gap-4 px-4 py-3 transition-colors"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {reel.caption?.split('\n')[0] ||
                      (reel.author_handle ? `@${reel.author_handle}` : 'Untitled reel')}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {reel.source === 'link' ? 'From a link' : 'Uploaded'} ·{' '}
                    {formatDistanceToNowStrict(reel.created_at)}
                  </p>
                </div>
                <Badge variant={done ? 'secondary' : status === 'failed' ? 'destructive' : 'outline'}>
                  {status}
                </Badge>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
