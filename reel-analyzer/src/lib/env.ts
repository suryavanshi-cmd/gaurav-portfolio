/**
 * Every credential the app reads, in one place.
 *
 * Two conventions are supported for the Supabase pair, because the portfolio's
 * other apps already use the un-prefixed names: NEXT_PUBLIC_* wins when set,
 * SUPABASE_* is the fallback. Anything read in the browser has to be
 * NEXT_PUBLIC_* to survive the bundler, so the public helpers below reference
 * both spellings literally rather than through a computed key.
 */

function first(...values: (string | undefined)[]): string | undefined {
  return values.find((value) => value && value.length > 0);
}

export const supabaseUrl = first(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_URL,
);

export const supabaseAnonKey = first(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  process.env.SUPABASE_ANON_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  process.env.SUPABASE_PUBLISHABLE_KEY,
);

export function requirePublicSupabaseConfig(): { url: string; anonKey: string } {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return { url: supabaseUrl, anonKey: supabaseAnonKey };
}

/** True when the app can talk to Supabase at all — used to render a setup notice instead of crashing. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function requireServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — the processing route cannot write job state.');
  }
  return key;
}

export const transcriptionProvider = (process.env.TRANSCRIPTION_PROVIDER ?? 'assemblyai').toLowerCase();
export const transcriptionApiKey = process.env.TRANSCRIPTION_API_KEY;

export const extractionProvider = (process.env.EXTRACTION_PROVIDER ?? 'meta').toLowerCase();
export const extractionApiKey = process.env.EXTRACTION_API_KEY;
export const instagramAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

export const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
export const analysisModel = process.env.ANTHROPIC_MODEL ?? 'claude-opus-5';

/** Shared secret the local faster-whisper worker presents when claiming a job. */
export const workerSharedSecret = process.env.WORKER_SHARED_SECRET;

/**
 * Absolute origin of this deployment. Needed for magic-link redirects and for
 * the ingestion route to call the processing route by URL.
 */
export function siteUrl(): string {
  const explicit = first(process.env.NEXT_PUBLIC_SITE_URL, process.env.SITE_URL);
  if (explicit) return explicit.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export const VIDEO_BUCKET = 'reel-videos';

/** Free plan ceiling; the paywall that would raise it is a later phase. */
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

/** Jobs one user may create per hour, independent of credits. */
export const RATE_LIMIT_PER_HOUR = 10;
