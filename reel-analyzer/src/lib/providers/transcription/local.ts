import type { TranscriptionProvider, TranscriptionResult } from './types';
import { workerSharedSecret } from '@/lib/env';

/**
 * Hands the job to a faster-whisper worker running on the user's own machine
 * (scripts/local_whisper_worker.py). Nothing is transcribed in the request:
 * the job is parked in `transcribing`, the worker claims it over HTTP, and
 * posting the transcript back resumes the pipeline at the analysis stage.
 *
 * This is the ₹0 path — no transcription vendor, and no always-on cloud
 * instance to forget about.
 */
export class LocalWorkerProvider implements TranscriptionProvider {
  readonly name = 'local-whisper';

  isConfigured(): boolean {
    return Boolean(workerSharedSecret);
  }

  async transcribe(_videoUrl: string): Promise<TranscriptionResult> {
    return {
      kind: 'deferred',
      note: 'waiting for the local faster-whisper worker to pick this up',
    };
  }
}
