import { after, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { runAnalysisStage, saveTranscript } from '@/lib/pipeline';
import { workerSharedSecret } from '@/lib/env';

export const maxDuration = 300;
export const runtime = 'nodejs';

const bodySchema = z.object({
  full_text: z.string().min(1),
  language: z.string().nullable().optional(),
  duration_seconds: z.number().nullable().optional(),
  segments: z
    .array(z.object({ start: z.number(), end: z.number(), text: z.string() }))
    .default([]),
});

/**
 * POST /api/jobs/[id]/transcript
 *
 * How the local worker hands its transcript back. Saving it resumes the
 * pipeline at the analysis stage, so from the status page's point of view the
 * local and managed transcription paths look identical.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!workerSharedSecret) {
    return NextResponse.json({ error: 'WORKER_SHARED_SECRET is not set' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${workerSharedSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'malformed transcript payload' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: job } = await admin.from('jobs').select('id, reel_id, status').eq('id', id).maybeSingle();
  if (!job) return NextResponse.json({ error: 'no such job' }, { status: 404 });
  if (job.status !== 'transcribing') {
    return NextResponse.json({ error: `job is ${job.status}, not transcribing` }, { status: 409 });
  }

  const { full_text, segments, language, duration_seconds } = parsed.data;

  await saveTranscript(admin, job.reel_id, full_text, segments, language ?? null);

  if (duration_seconds) {
    await admin.from('reels').update({ duration_seconds }).eq('id', job.reel_id);
  }

  after(() => runAnalysisStage(id));

  return NextResponse.json({ ok: true });
}
