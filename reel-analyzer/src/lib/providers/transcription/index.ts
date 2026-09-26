import { transcriptionProvider } from '@/lib/env';
import { AssemblyAIProvider } from './assemblyai';
import { GeminiTranscriptionProvider } from './gemini';
import { LocalWorkerProvider } from './local';
import type { TranscriptionProvider } from './types';

export * from './types';

/**
 * TRANSCRIPTION_PROVIDER picks the path:
 *   gemini     — reads the video directly inside the request (default, and the
 *                only one of the three that works on a serverless deployment)
 *   assemblyai — managed, also in-request, needs its own key
 *   local      — faster-whisper on your own machine, resumed over HTTP; free,
 *                but there is no worker on Vercel to pick the job up
 *
 * Unset, whichever key is configured wins, Gemini first — that key is already
 * required for the analysis step, so a one-key deployment just works.
 */
export function getTranscriptionProvider(): TranscriptionProvider | null {
  const byName: Record<string, () => TranscriptionProvider> = {
    gemini: () => new GeminiTranscriptionProvider(),
    assemblyai: () => new AssemblyAIProvider(),
    local: () => new LocalWorkerProvider(),
  };

  if (transcriptionProvider && byName[transcriptionProvider]) {
    const chosen = byName[transcriptionProvider]();
    return chosen.isConfigured() ? chosen : null;
  }

  const fallbacks = [new GeminiTranscriptionProvider(), new AssemblyAIProvider(), new LocalWorkerProvider()];
  return fallbacks.find((provider) => provider.isConfigured()) ?? null;
}
