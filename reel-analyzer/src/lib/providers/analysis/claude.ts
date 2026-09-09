import Anthropic from '@anthropic-ai/sdk';
import { analysisModel, anthropicApiKey } from '@/lib/env';
import { ANALYSIS_JSON_SCHEMA, analysisSchema } from './schema';
import {
  AnalysisError,
  SYSTEM_PROMPT,
  buildPrompt,
  type AnalysisInput,
  type AnalysisOutput,
  type AnalysisProvider,
} from './types';

/**
 * Claude analysis provider.
 *
 * The response is constrained by a JSON schema (`output_config.format`) rather
 * than parsed out of prose, then re-validated with zod — the schema constrains
 * the model, zod protects the database write.
 */
export class ClaudeAnalysisProvider implements AnalysisProvider {
  readonly name = 'claude';

  isConfigured(): boolean {
    return Boolean(anthropicApiKey);
  }

  async analyse(input: AnalysisInput): Promise<AnalysisOutput> {
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
}
