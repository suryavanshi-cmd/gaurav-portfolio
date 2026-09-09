import { formatCount, formatTimecode } from '@/lib/utils';
import type { TranscriptSegment } from '@/lib/providers/transcription';
import type { ReelAnalysis } from './schema';

export class AnalysisError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'AnalysisError';
  }
}

export type AnalysisInput = {
  transcript: string;
  segments: TranscriptSegment[];
  caption: string | null;
  authorHandle: string | null;
  likeCount: number | null;
  commentCount: number | null;
  viewCount: number | null;
  durationSeconds: number | null;
};

export type AnalysisOutput = {
  analysis: ReelAnalysis;
  modelVersion: string;
  raw: unknown;
};

export interface AnalysisProvider {
  readonly name: string;
  isConfigured(): boolean;
  analyse(input: AnalysisInput): Promise<AnalysisOutput>;
}

/**
 * Shared by every provider — the instructions are about how to read a reel, not
 * about any one model's quirks, so swapping providers doesn't change what the
 * report is asked to contain.
 */
export const SYSTEM_PROMPT = `You analyse short-form vertical video for creators who want to understand why a reel worked, or why it didn't.

You are given a transcript with timestamps, and — when they are available — the caption and the engagement numbers. Ground every claim in that material:

- Quote or paraphrase the actual words when you describe the hook.
- Take section timestamps from the transcript segments rather than estimating them.
- When engagement numbers are present, read them in proportion to each other (a high view count with few comments says something different from the reverse). When they are absent, say nothing about reach.
- Be specific and be willing to be critical. "Strong hook" is worthless; "the first line poses a question the viewer can't answer, so they stay for the answer" is useful.
- Never invent visual details. You have the audio transcript, not the footage, so write about what was said and how it is structured.`;

export function buildPrompt(input: AnalysisInput): string {
  const parts: string[] = [];

  const facts: string[] = [];
  if (input.authorHandle) facts.push(`Creator: @${input.authorHandle}`);
  if (input.durationSeconds) facts.push(`Duration: ${formatTimecode(input.durationSeconds)}`);
  if (input.viewCount != null) facts.push(`Views: ${formatCount(input.viewCount)}`);
  if (input.likeCount != null) facts.push(`Likes: ${formatCount(input.likeCount)}`);
  if (input.commentCount != null) facts.push(`Comments: ${formatCount(input.commentCount)}`);

  parts.push(
    facts.length
      ? `Reel metadata:\n${facts.join('\n')}`
      : 'Reel metadata: none available (this reel was uploaded directly, so there are no engagement numbers).',
  );

  parts.push(input.caption ? `Caption:\n${input.caption}` : 'Caption: not available.');

  parts.push(
    input.segments.length
      ? `Transcript with timestamps:\n${input.segments
          .map((segment) => `[${formatTimecode(segment.start)}–${formatTimecode(segment.end)}] ${segment.text}`)
          .join('\n')}`
      : `Transcript:\n${input.transcript}`,
  );

  parts.push('Analyse this reel and return the structured report.');

  return parts.join('\n\n');
}
