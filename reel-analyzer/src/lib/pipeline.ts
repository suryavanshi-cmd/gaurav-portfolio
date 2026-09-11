import { createAdminClient } from '@/lib/supabase/admin';
import { VIDEO_BUCKET } from '@/lib/env';
import { getExtractionProvider, ExtractionError, UPLOAD_INSTEAD } from '@/lib/providers/extraction';
import {
  getTranscriptionProvider,
  TranscriptionError,
  type TranscriptSegment,
} from '@/lib/providers/transcription';
import { AnalysisError, analyseReel } from '@/lib/providers/analysis';
import type { JobRow, JobStatus, ReelRow } from '@/lib/types/database';

type Admin = ReturnType<typeof createAdminClient>;

/** Signed URLs are handed to a third party, so they are short-lived by design. */
const SIGNED_URL_TTL_SECONDS = 60 * 30;

async function setStatus(
  admin: Admin,
  jobId: string,
  status: JobStatus,
  extra: Partial<Pick<JobRow, 'error_message' | 'started_at' | 'finished_at' | 'claimed_at'>> = {},
) {
  await admin.from('jobs').update({ status, ...extra }).eq('id', jobId);
}

async function loadJobAndReel(admin: Admin, jobId: string) {
  const { data: job, error: jobError } = await admin.from('jobs').select('*').eq('id', jobId).single();
  if (jobError || !job) throw new Error('job not found');

  const { data: reel, error: reelError } = await admin
    .from('reels')
    .select('*')
    .eq('id', job.reel_id)
    .single();
  if (reelError || !reel) throw new Error('reel not found');

  return { job: job as JobRow, reel: reel as ReelRow };
}

/**
 * The whole pipeline, in one long-running request: fetch (link reels only),
 * transcribe, analyse. Each stage writes its status first, so a Realtime
 * subscriber sees the step change before the work for it starts.
 *
 * When the transcription provider is the local worker, this returns after the
 * `transcribing` write and the worker resumes at `runAnalysisStage`.
 */
export async function runJob(jobId: string): Promise<void> {
  const admin = createAdminClient();

  try {
    const { reel } = await loadJobAndReel(admin, jobId);

    await setStatus(admin, jobId, 'fetching', { started_at: new Date().toISOString(), error_message: null });

    const storagePath = reel.video_storage_path ?? (await fetchLinkReel(admin, reel));

    await setStatus(admin, jobId, 'transcribing', { claimed_at: null });

    const provider = getTranscriptionProvider();
    if (!provider) {
      throw new TranscriptionError(
        'no transcription provider is configured on this deployment — set TRANSCRIPTION_API_KEY, or WORKER_SHARED_SECRET for the local worker',
      );
    }

    const signedUrl = await createSignedUrl(admin, storagePath);
    const result = await provider.transcribe(signedUrl);

    if (result.kind === 'deferred') {
      // The local worker has the job now. It calls back into
      // /api/jobs/[id]/transcript, which picks the pipeline up again.
      return;
    }

    await saveTranscript(admin, reel.id, result.fullText, result.segments, result.language);

    if (result.durationSeconds && !reel.duration_seconds) {
      await admin.from('reels').update({ duration_seconds: result.durationSeconds }).eq('id', reel.id);
    }

    await runAnalysisStage(jobId);
  } catch (error) {
    await failJob(jobId, error);
  }
}

/**
 * Analysis, split out because two paths reach it: the inline pipeline above,
 * and the local worker posting a transcript back.
 */
export async function runAnalysisStage(jobId: string): Promise<void> {
  const admin = createAdminClient();

  try {
    const { reel } = await loadJobAndReel(admin, jobId);

    await setStatus(admin, jobId, 'analyzing');

    const { data: transcript } = await admin
      .from('transcripts')
      .select('*')
      .eq('reel_id', reel.id)
      .maybeSingle();

    if (!transcript) throw new AnalysisError('there is no transcript to analyse');

    const { analysis, modelVersion, raw } = await analyseReel({
      transcript: transcript.full_text,
      segments: (transcript.segments as TranscriptSegment[] | null) ?? [],
      caption: reel.caption,
      authorHandle: reel.author_handle,
      likeCount: reel.like_count,
      commentCount: reel.comment_count,
      viewCount: reel.view_count,
      durationSeconds: reel.duration_seconds,
    });

    const { error } = await admin.from('analyses').upsert(
      {
        reel_id: reel.id,
        summary: analysis.summary,
        hook_analysis: analysis.hook_analysis,
        structure_breakdown: analysis.structure_breakdown,
        tone: analysis.tone,
        target_audience: analysis.target_audience,
        virality_factors: analysis.virality_factors,
        actionable_takeaways: analysis.actionable_takeaways,
        raw_model_output: raw as never,
        model_version: modelVersion,
      },
      { onConflict: 'reel_id' },
    );
    if (error) throw new AnalysisError(`could not save the analysis: ${error.message}`);

    // Credit is spent on a completed analysis, not on job creation — a job that
    // fails halfway costs the user nothing.
    await admin.rpc('consume_credit', { p_user_id: reel.user_id });

    await setStatus(admin, jobId, 'done', { finished_at: new Date().toISOString(), error_message: null });
  } catch (error) {
    await failJob(jobId, error);
  }
}

/**
 * Link path. Resolves the reel through the extraction provider, then copies the
 * video into Storage so that every downstream step works the same way whichever
 * way the reel arrived.
 */
async function fetchLinkReel(admin: Admin, reel: ReelRow): Promise<string> {
  if (!reel.instagram_url) {
    throw new ExtractionError(`this reel has no link and no uploaded file — ${UPLOAD_INSTEAD}`);
  }

  const provider = getExtractionProvider();
  if (!provider) {
    throw new ExtractionError(
      `link fetching is not configured on this deployment — ${UPLOAD_INSTEAD}`,
    );
  }

  const extracted = await provider.extract(reel.instagram_url);

  const response = await fetch(extracted.videoUrl);
  if (!response.ok) {
    throw new ExtractionError(`the video file could not be downloaded (${response.status}) — ${UPLOAD_INSTEAD}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());

  const path = `${reel.user_id}/${reel.id}.mp4`;
  const { error } = await admin.storage
    .from(VIDEO_BUCKET)
    .upload(path, bytes, { contentType: 'video/mp4', upsert: true });
  if (error) throw new ExtractionError(`the video could not be stored: ${error.message}`);

  await admin
    .from('reels')
    .update({
      video_storage_path: path,
      caption: extracted.caption,
      author_handle: extracted.authorHandle,
      like_count: extracted.likeCount,
      comment_count: extracted.commentCount,
      view_count: extracted.viewCount,
      duration_seconds: extracted.durationSeconds,
      thumbnail_url: extracted.thumbnailUrl,
    })
    .eq('id', reel.id);

  return path;
}

export async function createSignedUrl(admin: Admin, path: string): Promise<string> {
  const { data, error } = await admin.storage.from(VIDEO_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) throw new Error(`could not sign the video URL: ${error?.message ?? 'unknown error'}`);
  return data.signedUrl;
}

export async function saveTranscript(
  admin: Admin,
  reelId: string,
  fullText: string,
  segments: TranscriptSegment[],
  language: string | null,
) {
  const { error } = await admin
    .from('transcripts')
    .upsert({ reel_id: reelId, full_text: fullText, segments, language }, { onConflict: 'reel_id' });
  if (error) throw new TranscriptionError(`could not save the transcript: ${error.message}`);
}

/**
 * Every failure ends here. The message is written for the person reading the
 * status page, so it says what to do next rather than naming an internal step.
 */
async function failJob(jobId: string, error: unknown): Promise<void> {
  const admin = createAdminClient();
  const message =
    error instanceof ExtractionError || error instanceof TranscriptionError || error instanceof AnalysisError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'something went wrong while processing this reel';

  console.error(`[job ${jobId}] failed:`, error);

  await admin
    .from('jobs')
    .update({ status: 'failed', error_message: message, finished_at: new Date().toISOString() })
    .eq('id', jobId);
}
