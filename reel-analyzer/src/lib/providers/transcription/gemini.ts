import { GoogleGenAI, Type, createPartFromUri, type Part } from '@google/genai';
import { geminiApiKey, geminiTranscriptionModel } from '@/lib/env';
import { describeGeminiFailure, withGeminiRetry } from '@/lib/providers/gemini-retry';
import {
  TranscriptionError,
  type TranscriptionProvider,
  type TranscriptionResult,
  type TranscriptSegment,
} from './types';

/**
 * Gemini reads the .mp4 directly — video in, timestamped text out — so this
 * path needs no ffmpeg, no audio extraction, and no second vendor. Unlike the
 * local worker it runs inside the request, which is what makes it the one
 * transcription option that works on Vercel.
 *
 * Note it is a general model, not `gemini-*-transcribe`: the dedicated
 * transcription models reject video ("image input modality is not enabled"),
 * because they take audio only, and extracting that audio is exactly the
 * ffmpeg dependency this avoids.
 */
export class GeminiTranscriptionProvider implements TranscriptionProvider {
  readonly name = 'gemini';

  isConfigured(): boolean {
    return Boolean(geminiApiKey);
  }

  async transcribe(videoUrl: string): Promise<TranscriptionResult> {
    if (!geminiApiKey) throw new TranscriptionError('GEMINI_API_KEY is not set.');

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new TranscriptionError(`could not read the stored video (${response.status})`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    const mimeType = response.headers.get('content-type')?.split(';')[0] || 'video/mp4';

    const part = await this.toPart(ai, bytes, mimeType);

    const result = await withGeminiRetry(
      () =>
        ai.models.generateContent({
          model: geminiTranscriptionModel,
          contents: [{ role: 'user', parts: [part, { text: PROMPT }] }],
          config: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA },
        }),
      {
        label: 'gemini:transcribe',
        onFatal: (message, cause) =>
          new TranscriptionError(`the Gemini request was rejected: ${message}`, cause),
        onExhausted: (message, cause) =>
          new TranscriptionError(describeGeminiFailure(message, geminiTranscriptionModel), cause),
      },
    );

    const text = (result.text ?? '').trim();
    if (!text) throw new TranscriptionError('Gemini returned nothing for this video');

    let parsed: { language?: string | null; segments?: TranscriptSegment[] };
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new TranscriptionError('Gemini returned a transcript that was not valid JSON', error);
    }

    const segments = (parsed.segments ?? []).filter(
      (segment) => typeof segment?.text === 'string' && segment.text.trim().length > 0,
    );

    if (!segments.length) {
      throw new TranscriptionError(
        'no speech was detected in this video — a reel with no spoken words cannot be analysed yet',
      );
    }

    return {
      kind: 'complete',
      fullText: segments.map((segment) => segment.text.trim()).join(' '),
      segments,
      language: parsed.language ?? null,
      // The transcript's own last timestamp is a better duration than anything
      // we could infer here without decoding the container.
      durationSeconds: segments[segments.length - 1]?.end ?? null,
    };
  }

  /**
   * Small files ride inline; larger ones go through the Files API, which has no
   * practical size ceiling for a reel but needs the upload to finish processing
   * before it can be referenced.
   */
  private async toPart(ai: GoogleGenAI, bytes: Uint8Array, mimeType: string): Promise<Part> {
    if (bytes.byteLength <= INLINE_LIMIT_BYTES) {
      return { inlineData: { mimeType, data: Buffer.from(bytes).toString('base64') } };
    }

    const uploaded = await ai.files.upload({
      file: new Blob([bytes as BlobPart], { type: mimeType }),
      config: { mimeType },
    });

    if (!uploaded.name) throw new TranscriptionError('the Gemini upload returned no file handle');

    const ready = await this.waitForActive(ai, uploaded.name);
    if (!ready.uri) throw new TranscriptionError('the uploaded video never became readable');

    return createPartFromUri(ready.uri, ready.mimeType ?? mimeType);
  }

  private async waitForActive(ai: GoogleGenAI, name: string) {
    const deadline = Date.now() + 5 * 60 * 1000;

    while (Date.now() < deadline) {
      const file = await ai.files.get({ name });
      if (file.state === 'ACTIVE') return file;
      if (file.state === 'FAILED') {
        throw new TranscriptionError(`Gemini could not process the video: ${file.error?.message ?? 'unknown'}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new TranscriptionError('the video was still processing after 5 minutes');
  }
}

/** Inline data counts against the request body, so keep well under the cap. */
const INLINE_LIMIT_BYTES = 15 * 1024 * 1024;

const PROMPT = `Transcribe the speech in this video verbatim.

Split it into sentence-level segments in order, each with accurate start and end times in seconds. Report the spoken language as a short code such as "en" or "hi".

Transcribe only what is actually said. Do not summarise, translate, describe the visuals, or add commentary. If nobody speaks, return an empty segment list.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  required: ['language', 'segments'],
  propertyOrdering: ['language', 'segments'],
  properties: {
    language: { type: Type.STRING, description: 'Short code for the spoken language, e.g. "en".' },
    segments: {
      type: Type.ARRAY,
      description: 'Sentence-level segments in chronological order.',
      items: {
        type: Type.OBJECT,
        required: ['start', 'end', 'text'],
        propertyOrdering: ['start', 'end', 'text'],
        properties: {
          start: { type: Type.NUMBER, description: 'Start time in seconds.' },
          end: { type: Type.NUMBER, description: 'End time in seconds.' },
          text: { type: Type.STRING, description: 'What is said in this segment, verbatim.' },
        },
      },
    },
  },
};
