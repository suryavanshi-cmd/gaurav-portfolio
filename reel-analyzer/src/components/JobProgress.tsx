'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { JobStatus } from '@/lib/types/database';

const STEPS: { status: JobStatus; label: string; detail: string }[] = [
  { status: 'fetching', label: 'Fetching', detail: 'Getting the video ready' },
  { status: 'transcribing', label: 'Transcribing', detail: 'Turning speech into timestamped text' },
  { status: 'analyzing', label: 'Analyzing', detail: 'Reading the structure and the hook' },
];

const ORDER: JobStatus[] = ['queued', 'fetching', 'transcribing', 'analyzing', 'done'];

/**
 * Subscribes to the job row over Realtime — no polling. RLS applies to the
 * stream as well as to reads, so a subscriber only ever receives their own job.
 */
export function JobProgress({
  jobId,
  reelId,
  initialStatus,
  initialError,
}: {
  jobId: string;
  reelId: string;
  initialStatus: JobStatus;
  initialError: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<JobStatus>(initialStatus);
  const [error, setError] = useState<string | null>(initialError);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | undefined;
    let cancelled = false;

    (async () => {
      // Realtime enforces row-level security, so the socket has to carry the
      // user's token *before* subscribing. The session is read from cookies
      // asynchronously, and subscribing first connects as `anon` — the jobs
      // policy then filters out every event and the page sits on its initial
      // status forever, looking like the job has stalled.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data.session) {
        await supabase.realtime.setAuth(data.session.access_token);
      }
      if (cancelled) return;

      channel = supabase
        .channel(`job:${jobId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `id=eq.${jobId}` },
          (payload) => {
            const next = payload.new as { status: JobStatus; error_message: string | null };
            setStatus(next.status);
            setError(next.error_message);
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [jobId]);

  useEffect(() => {
    if (status === 'done') router.push(`/reels/${reelId}`);
  }, [status, reelId, router]);

  if (status === 'failed') {
    return (
      <div className="space-y-4 rounded-lg border border-destructive/40 bg-destructive/5 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-destructive mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-medium">This one didn&apos;t go through</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {error ?? 'something went wrong while processing this reel'}
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/">Try again</Link>
        </Button>
      </div>
    );
  }

  const currentIndex = ORDER.indexOf(status);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Working on it</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          This takes a minute or two. You can leave this page open — it updates itself.
        </p>
      </div>

      <ol className="space-y-1">
        {STEPS.map((step) => {
          const stepIndex = ORDER.indexOf(step.status);
          const done = currentIndex > stepIndex;
          const active = status === step.status;

          return (
            <li
              key={step.status}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 transition-colors',
                active && 'bg-accent/60',
              )}
            >
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs',
                  done && 'border-primary bg-primary text-primary-foreground',
                  active && 'border-primary',
                )}
              >
                {done ? <Check className="size-3.5" /> : active ? <Loader2 className="size-3.5 animate-spin" /> : null}
              </span>
              <span className="min-w-0">
                <span className={cn('block text-sm font-medium', !done && !active && 'text-muted-foreground')}>
                  {step.label}
                </span>
                <span className="text-muted-foreground block text-xs">{step.detail}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
