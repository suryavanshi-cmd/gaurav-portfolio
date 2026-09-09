/** What the link path can recover about a reel before it is transcribed. */
export type ExtractedReel = {
  /** Direct URL to the .mp4, valid only for a short window. */
  videoUrl: string;
  caption: string | null;
  authorHandle: string | null;
  likeCount: number | null;
  commentCount: number | null;
  viewCount: number | null;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
};

/**
 * Thrown when a link cannot be resolved. The message is shown to the user
 * verbatim, so it always names the upload path as the way forward.
 */
export class ExtractionError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'ExtractionError';
  }
}

export const UPLOAD_INSTEAD =
  "couldn't fetch this reel automatically — please upload the video file instead";

export interface ExtractionProvider {
  readonly name: string;
  /** Whether the provider has the credentials it needs. */
  isConfigured(): boolean;
  extract(instagramUrl: string): Promise<ExtractedReel>;
}
