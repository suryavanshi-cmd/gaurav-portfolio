import { transcriptionProvider } from '@/lib/env';
import { AssemblyAIProvider } from './assemblyai';
import { LocalWorkerProvider } from './local';
import type { TranscriptionProvider } from './types';

export * from './types';

/**
 * TRANSCRIPTION_PROVIDER picks the path:
 *   assemblyai — managed, runs inside the Vercel request (default)
 *   local      — faster-whisper on your own machine, resumed over HTTP
 */
export function getTranscriptionProvider(): TranscriptionProvider | null {
  const provider =
    transcriptionProvider === 'local' ? new LocalWorkerProvider() : new AssemblyAIProvider();
  return provider.isConfigured() ? provider : null;
}
