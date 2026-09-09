import { after, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkCanCreateJob } from '@/lib/guards';
import { runJob } from '@/lib/pipeline';
import { MAX_UPLOAD_BYTES, VIDEO_BUCKET } from '@/lib/env';
import { parseShortcode } from '@/lib/providers/extraction';

// Ingestion hands off to runJob via after(), so this route carries the same
// budget as the processing route.
export const maxDuration = 300;
export const runtime = 'nodejs';

const ALLOWED_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v']);

/**
 * POST /api/reels
 *
 * Accepts either { url } as JSON or a `file` in a multipart body — the two
 * ingestion paths are peers, and both end in the same reel + job pair.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'sign in first' }, { status: 401 });
  }

  const admin = createAdminClient();

  const guard = await checkCanCreateJob(admin, user.id);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const contentType = request.headers.get('content-type') ?? '';

  try {
    const created = contentType.includes('multipart/form-data')
      ? await createFromUpload(admin, user.id, await request.formData())
      : await createFromLink(admin, user.id, await request.json());

    if ('error' in created) {
      return NextResponse.json({ error: created.error }, { status: created.status });
    }

    // Runs after the response is flushed, so the caller gets its job id
    // immediately and the status page can subscribe before the first step lands.
    after(() => runJob(created.jobId));

    return NextResponse.json({ reelId: created.reelId, jobId: created.jobId }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/reels]', error);
    return NextResponse.json({ error: 'could not start this job' }, { status: 500 });
  }
}

type Created = { reelId: string; jobId: string };
type Failed = { error: string; status: number };

async function createFromLink(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  body: unknown,
): Promise<Created | Failed> {
  const url = typeof body === 'object' && body && 'url' in body ? String((body as { url: unknown }).url) : '';

  if (!url) return { error: 'paste an Instagram reel link, or upload the video file', status: 400 };
  if (!parseShortcode(url)) {
    return { error: "that doesn't look like an Instagram reel link", status: 400 };
  }

  const { data: reel, error } = await admin
    .from('reels')
    .insert({ user_id: userId, source: 'link', instagram_url: url })
    .select('id')
    .single();

  if (error || !reel) return { error: 'could not save this reel', status: 500 };

  return withJob(admin, reel.id);
}

async function createFromUpload(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  form: FormData,
): Promise<Created | Failed> {
  const file = form.get('file');

  if (!(file instanceof File)) return { error: 'attach a video file', status: 400 };
  if (file.size === 0) return { error: 'that file is empty', status: 400 };
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: `that file is larger than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB`, status: 413 };
  }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return { error: 'upload an .mp4, .mov or .webm video', status: 415 };
  }

  const { data: reel, error } = await admin
    .from('reels')
    .insert({ user_id: userId, source: 'upload' })
    .select('id')
    .single();

  if (error || !reel) return { error: 'could not save this reel', status: 500 };

  const path = `${userId}/${reel.id}.mp4`;
  const { error: uploadError } = await admin.storage
    .from(VIDEO_BUCKET)
    .upload(path, new Uint8Array(await file.arrayBuffer()), {
      contentType: file.type || 'video/mp4',
      upsert: true,
    });

  if (uploadError) {
    // Nothing downstream can run without the file, so don't leave a reel behind.
    await admin.from('reels').delete().eq('id', reel.id);
    return { error: `could not store that video: ${uploadError.message}`, status: 500 };
  }

  await admin.from('reels').update({ video_storage_path: path }).eq('id', reel.id);

  return withJob(admin, reel.id);
}

async function withJob(
  admin: ReturnType<typeof createAdminClient>,
  reelId: string,
): Promise<Created | Failed> {
  const { data: job, error } = await admin.from('jobs').insert({ reel_id: reelId }).select('id').single();
  if (error || !job) return { error: 'could not queue this job', status: 500 };
  return { reelId, jobId: job.id };
}
