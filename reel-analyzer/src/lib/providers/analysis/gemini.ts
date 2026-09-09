import { GoogleGenAI, Type } from '@google/genai';
import { geminiApiKey, geminiModel } from '@/lib/env';
import { analysisSchema } from './schema';
import {
  AnalysisError,
  SYSTEM_PROMPT,
  buildPrompt,
  type AnalysisInput,
  type AnalysisOutput,
  type AnalysisProvider,
} from './types';

/**
 * Gemini's responseSchema is a subset of OpenAPI 3.0 — it has no
 * `additionalProperties`, so this cannot be the same object handed to Claude.
 * `propertyOrdering` is Gemini-specific and worth setting: without it field
 * order can drift between calls, which makes cached/compared outputs noisier.
 */
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  required: [
    'summary',
    'hook_analysis',
    'structure_breakdown',
    'tone',
    'target_audience',
    'virality_factors',
    'actionable_takeaways',
  ],
  propertyOrdering: [
    'summary',
    'hook_analysis',
    'structure_breakdown',
    'tone',
    'target_audience',
    'virality_factors',
    'actionable_takeaways',
  ],
  properties: {
    summary: {
      type: Type.STRING,
      description: 'Two to four sentences on what the reel is about and what it is trying to achieve.',
    },
    hook_analysis: {
      type: Type.STRING,
      description:
        'What the first three seconds do to stop the scroll, why it works or fails, and what it promises the viewer.',
    },
    structure_breakdown: {
      type: Type.ARRAY,
      description:
        'The reel split into hook, body and CTA, in order, with timestamps taken from the transcript segments.',
      items: {
        type: Type.OBJECT,
        required: ['section', 'start_seconds', 'end_seconds', 'description'],
        propertyOrdering: ['section', 'start_seconds', 'end_seconds', 'description'],
        properties: {
          section: { type: Type.STRING, enum: ['hook', 'body', 'cta'] },
          start_seconds: { type: Type.NUMBER, description: 'Start of this section in seconds.' },
          end_seconds: { type: Type.NUMBER, description: 'End of this section in seconds.' },
          description: { type: Type.STRING, description: 'What happens here and why it is placed here.' },
        },
      },
    },
    tone: {
      type: Type.STRING,
      description: 'The voice and register of the delivery, in a short phrase plus a sentence of justification.',
    },
    target_audience: {
      type: Type.STRING,
      description: 'Who this is for, specifically — the viewer it is written to reach.',
    },
    virality_factors: {
      type: Type.ARRAY,
      description: 'Concrete things helping or hurting this reel spread. Specific to this reel, not generic advice.',
      items: {
        type: Type.OBJECT,
        required: ['factor', 'explanation'],
        propertyOrdering: ['factor', 'explanation'],
        properties: {
          factor: { type: Type.STRING, description: 'Short name for the factor.' },
          explanation: {
            type: Type.STRING,
            description: 'Why it matters here, referencing the transcript or metrics.',
          },
        },
      },
    },
    actionable_takeaways: {
      type: Type.ARRAY,
      description: 'Specific changes the creator could make next time. Each one a single imperative sentence.',
      items: { type: Type.STRING },
    },
  },
};

/**
 * Gemini analysis provider.
 *
 * Same contract as the Claude one: the response is schema-constrained on the
 * way out and zod-validated on the way in, so whichever provider produced a
 * report, the database sees the same shape or the job fails.
 */
export class GeminiAnalysisProvider implements AnalysisProvider {
  readonly name = 'gemini';

  isConfigured(): boolean {
    return Boolean(geminiApiKey);
  }

  async analyse(input: AnalysisInput): Promise<AnalysisOutput> {
    if (!geminiApiKey) {
      throw new AnalysisError('GEMINI_API_KEY is not set — the analysis step cannot run.');
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    const response = await this.generateWithRetry(ai, buildPrompt(input));

    const text = (response.text ?? '').trim();
    if (!text) {
      // A blocked prompt comes back as a finishReason rather than an exception.
      const reason = response.candidates?.[0]?.finishReason;
      throw new AnalysisError(
        reason && reason !== 'STOP'
          ? `Gemini stopped early (${reason}) and returned nothing`
          : 'Gemini returned an empty response',
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new AnalysisError('Gemini returned output that was not valid JSON', error);
    }

    const result = analysisSchema.safeParse(parsed);
    if (!result.success) {
      throw new AnalysisError(`the analysis did not match the expected shape: ${result.error.message}`);
    }

    return {
      analysis: result.data,
      modelVersion: response.modelVersion ?? geminiModel,
      raw: parsed,
    };
  }

  /**
   * A popular model answering 503 UNAVAILABLE ("high demand") is a queueing
   * signal, not a verdict on the request — retrying the same call a moment
   * later usually succeeds. Failing the whole job on the first one would throw
   * away a completed transcript over a few seconds of congestion.
   *
   * Only transient classes are retried. A bad key or a malformed request fails
   * immediately, because repeating those just wastes the user's time.
   */
  private async generateWithRetry(ai: GoogleGenAI, contents: string, attempts = 4) {
    let lastError: unknown;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await ai.models.generateContent({
          model: geminiModel,
          contents,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        });
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);

        if (/API key|API_KEY_INVALID|PERMISSION_DENIED|INVALID_ARGUMENT/i.test(message)) {
          throw new AnalysisError('the Gemini API key was rejected or the request was malformed', error);
        }

        const transient = /UNAVAILABLE|RESOURCE_EXHAUSTED|INTERNAL|DEADLINE_EXCEEDED|\b(429|500|502|503|504)\b/i.test(
          message,
        );
        if (!transient || attempt === attempts - 1) break;

        // 2s, 4s, 8s — long enough for a demand spike to clear, short enough
        // to stay inside the request's budget.
        const wait = 2000 * 2 ** attempt;
        console.warn(`[gemini] ${message.slice(0, 120)} — retrying in ${wait}ms`);
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
    }

    const message = lastError instanceof Error ? lastError.message : String(lastError);
    if (/UNAVAILABLE|high demand/i.test(message)) {
      throw new AnalysisError(
        `Gemini (${geminiModel}) is overloaded right now — this usually clears in a minute, try again`,
        lastError,
      );
    }
    if (/RESOURCE_EXHAUSTED|quota/i.test(message)) {
      throw new AnalysisError('Gemini is rate limiting or out of quota — try again shortly', lastError);
    }
    throw new AnalysisError(`the analysis step failed: ${message}`, lastError);
  }
}
