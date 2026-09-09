import Anthropic from '@anthropic-ai/sdk';
import { analysisModel, anthropicApiKey } from '@/lib/env';
import { formatCount, formatTimecode } from '@/lib/utils';
import type { TranscriptSegment } from '@/lib/providers/transcription';
import { ANALYSIS_JSON_SCHEMA, analysisSchema, type ReelAnalysis } from './schema';

export * from './schema';

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

const SYSTEM_PROMPT = `You analyse short-form vertical video for creators who want to understand why a reel worked, or why it didn't.

You are given a transcript with timestamps, and — when they are available — the caption and the engagement numbers. Ground every claim in that material:

- Quote or paraphrase the actual words when you describe the hook.
- Take section timestamps from the transcript segments rather than estimating them.
- When engagement numbers are present, read them in proportion to each other (a high view count with few comments says something different from the reverse). When they are absent, say nothing about reach.
- Be specific and be willing to be critical. "Strong hook" is worthless; "the first line poses a question the viewer can't answer, so they stay for the answer" is useful.
- Never invent visual details. You have the audio transcript, not the footage, so write about what was said and how it is structured.`;

/**
 * Structured-output client for the report.
 *
 * The response is constrained by a JSON schema (`output_config.format`) rather
 * than parsed out of prose, and then re-validated with zod — the schema
 * constrains the model, and zod protects the database write.
 */
export async function analyseReel(input: AnalysisInput): Promise<AnalysisOutput> {
  if (!anthropicApiKey) {
    throw new AnalysisError('ANTHROPIC_API_KEY is not set — the analysis step cannot run.');
  }

  const client = new Anthropic({ apiKey: anthropicApiKey });

  let response;
  try {
    response = await client.messages.create({
      model: analysisModel,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      output_config: {
        format: { type: 'json_schema', schema: ANALYSIS_JSON_SCHEMA },
      },
      messages: [{ role: 'user', content: buildPrompt(input) }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new AnalysisError('the Claude API key was rejected', error);
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new AnalysisError('the Claude API is rate limiting this account — try again shortly', error);
    }
    throw new AnalysisError('the analysis step failed', error);
  }

  if (response.stop_reason === 'refusal') {
    throw new AnalysisError('the model declined to analyse this reel');
  }

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  if (!text) throw new AnalysisError('the model returned an empty response');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new AnalysisError('the model returned output that was not valid JSON', error);
  }

  const result = analysisSchema.safeParse(parsed);
  if (!result.success) {
    throw new AnalysisError(`the analysis did not match the expected shape: ${result.error.message}`);
  }

  return { analysis: result.data, modelVersion: response.model, raw: parsed };
}

function buildPrompt(input: AnalysisInput): string {
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
