import {
  TranscriptionError,
  type TranscriptionProvider,
  type TranscriptionResult,
  type TranscriptSegment,
} from './types';
import { transcriptionApiKey } from '@/lib/env';

const API = 'https://api.assemblyai.com/v2';

type AssemblyTranscript = {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text?: string | null;
  error?: string | null;
  language_code?: string | null;
  audio_duration?: number | null;
  utterances?: { start: number; end: number; text: string }[] | null;
  words?: { start: number; end: number; text: string }[] | null;
};

/**
 * AssemblyAI takes the media URL directly, so nothing has to be downloaded into
 * the function or handed to ffmpeg — it fetches the signed Storage URL itself.
 */
export class AssemblyAIProvider implements TranscriptionProvider {
  readonly name = 'assemblyai';

  isConfigured(): boolean {
    return Boolean(transcriptionApiKey);
  }

  async transcribe(videoUrl: string): Promise<TranscriptionResult> {
    const key = transcriptionApiKey;
    if (!key) throw new TranscriptionError('TRANSCRIPTION_API_KEY is not set.');

    const created = await this.post(key, videoUrl);
    const finished = await this.poll(key, created.id);

    if (finished.status === 'error') {
      throw new TranscriptionError(finished.error ?? 'AssemblyAI could not transcribe this video.');
    }

    const text = (finished.text ?? '').trim();
    if (!text) {
      throw new TranscriptionError(
        'no speech was detected in this video — a reel with no spoken words cannot be analysed yet',
      );
    }

    return {
      kind: 'complete',
      fullText: text,
      segments: toSegments(finished),
      language: finished.language_code ?? null,
      durationSeconds: finished.audio_duration ?? null,
    };
  }

  private async post(key: string, audioUrl: string): Promise<AssemblyTranscript> {
    const response = await fetch(`${API}/transcript`, {
      method: 'POST',
      headers: { authorization: key, 'content-type': 'application/json' },
      body: JSON.stringify({
        audio_url: audioUrl,
        // Utterances give us clean sentence-level spans for the timeline chart,
        // and language detection means a Hindi or Marathi reel still works.
        speaker_labels: false,
        punctuate: true,
        format_text: true,
        language_detection: true,
      }),
    });

    if (!response.ok) {
      throw new TranscriptionError(
        `AssemblyAI rejected the job (${response.status})`,
        await response.text().catch(() => undefined),
      );
    }
    return (await response.json()) as AssemblyTranscript;
  }

  /**
   * Polls until terminal. The ceiling is generous because the whole pipeline
   * runs inside one long request, but it is bounded so a stuck transcript
   * surfaces as a failed job rather than eating the function's whole budget.
   */
  private async poll(key: string, id: string): Promise<AssemblyTranscript> {
    const deadline = Date.now() + 8 * 60 * 1000;

    while (Date.now() < deadline) {
      await sleep(3000);
      const response = await fetch(`${API}/transcript/${id}`, {
        headers: { authorization: key },
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new TranscriptionError(`AssemblyAI polling failed (${response.status})`);
      }
      const body = (await response.json()) as AssemblyTranscript;
      if (body.status === 'completed' || body.status === 'error') return body;
    }

    throw new TranscriptionError('transcription timed out after 8 minutes');
  }
}

/** AssemblyAI reports milliseconds; the rest of the app works in seconds. */
function toSegments(transcript: AssemblyTranscript): TranscriptSegment[] {
  const source = transcript.utterances?.length ? transcript.utterances : (transcript.words ?? []);
  return source.map((item) => ({
    start: item.start / 1000,
    end: item.end / 1000,
    text: item.text,
  }));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
