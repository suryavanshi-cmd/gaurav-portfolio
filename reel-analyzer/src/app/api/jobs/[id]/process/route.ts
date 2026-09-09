import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runJob } from '@/lib/pipeline';

/**
 * The long one. Download (link reels), transcribe and analyse all happen inside
 * this single request — there is no queue or worker service in v1, which is why
 * Fluid Compute and a high maxDuration matter on the Vercel project.
 */
export const maxDuration = 300;
export const runtime = 'nodejs';

/**
 * POST /api/jobs/[id]/process
 *
 * Normally the ingestion route starts a job itself; this endpoint is how a
 * stalled or failed job gets retried, so it verifies the caller owns the reel
 * rather than trusting the job id alone.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'sign in first' }, { status: 401 });

  const admin = createAdminClient();

  const { data: job } = await admin.from('jobs').select('id, status, reel_id').eq('id', id).maybeSingle();
  if (!job) return NextResponse.json({ error: 'no such job' }, { status: 404 });

  const { data: reel } = await admin.from('reels').select('user_id').eq('id', job.reel_id).maybeSingle();
  if (!reel || reel.user_id !== user.id) {
    return NextResponse.json({ error: 'no such job' }, { status: 404 });
  }

  if (job.status !== 'queued' && job.status !== 'failed') {
    return NextResponse.json({ error: 'this job is already running' }, { status: 409 });
  }

  await runJob(id);

  const { data: finished } = await admin.from('jobs').select('status, error_message').eq('id', id).maybeSingle();
  return NextResponse.json({ status: finished?.status ?? 'unknown', error: finished?.error_message ?? null });
}
