export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
};

export type TranscriptionComplete = {
  kind: 'complete';
  fullText: string;
  segments: TranscriptSegment[];
  language: string | null;
  durationSeconds: number | null;
};

/**
 * The local-worker provider cannot finish inside the request. It parks the job
 * in `transcribing`, and the worker resumes the pipeline over HTTP when it has
 * a transcript.
 */
export type TranscriptionDeferred = {
  kind: 'deferred';
  note: string;
};

export type TranscriptionResult = TranscriptionComplete | TranscriptionDeferred;

export class TranscriptionError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'TranscriptionError';
  }
}

export interface TranscriptionProvider {
  readonly name: string;
  isConfigured(): boolean;
  /** `videoUrl` is a short-lived signed URL to the file in Supabase Storage. */
  transcribe(videoUrl: string): Promise<TranscriptionResult>;
}
