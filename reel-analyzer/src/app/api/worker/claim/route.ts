import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSignedUrl } from '@/lib/pipeline';
import { transcriptionProvider, workerSharedSecret } from '@/lib/env';

export const runtime = 'nodejs';

/**
 * POST /api/worker/claim
 *
 * The local faster-whisper worker polls this for a job parked in `transcribing`
 * and gets back a signed URL to the video. Authenticated by a shared secret
 * rather than a user session — there is no browser on the other end.
 */
export async function POST(request: Request) {
  if (transcriptionProvider !== 'local') {
    return NextResponse.json({ error: 'this deployment does not use the local worker' }, { status: 409 });
  }
  if (!workerSharedSecret) {
    return NextResponse.json({ error: 'WORKER_SHARED_SECRET is not set' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${workerSharedSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Atomic claim with a lease. A plain select-and-return handed the same row to
  // every poll, so one worker re-claimed a job it was already transcribing and
  // two workers would duplicate the whole download-and-transcribe.
  const { data: claimed, error } = await admin.rpc('claim_transcription_job', {
    p_lease_seconds: 900,
  });

  if (error) {
    console.error('[worker/claim]', error);
    return NextResponse.json({ error: 'could not claim a job' }, { status: 500 });
  }

  const job = claimed?.[0];
  if (!job) return NextResponse.json({ job: null });

  const { data: reel } = await admin
    .from('reels')
    .select('video_storage_path')
    .eq('id', job.reel_id)
    .maybeSingle();

  if (!reel?.video_storage_path) {
    await admin
      .from('jobs')
      .update({ status: 'failed', error_message: 'the video file is missing', finished_at: new Date().toISOString() })
      .eq('id', job.job_id);
    return NextResponse.json({ job: null });
  }

  return NextResponse.json({
    job: { id: job.job_id, videoUrl: await createSignedUrl(admin, reel.video_storage_path) },
  });
}
