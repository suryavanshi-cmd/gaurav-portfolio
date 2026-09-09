/** Values shared by server and client code — no environment access, so this is safe to import into a client component. */

export const VIDEO_BUCKET = 'reel-videos';

/** Free plan ceiling; the paywall that would raise it is a later phase. */
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

/** Jobs one user may create per hour, independent of credits. */
export const RATE_LIMIT_PER_HOUR = 10;
