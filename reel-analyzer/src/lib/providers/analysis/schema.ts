import { z } from 'zod';

/**
 * The report contract. This is both the JSON Schema handed to Claude via
 * `output_config.format` and — through zod — the runtime check on what comes
 * back, so a malformed response fails the job instead of reaching the report
 * page half-empty.
 */

export const structureSegmentSchema = z.object({
  section: z.enum(['hook', 'body', 'cta']),
  start_seconds: z.number(),
  end_seconds: z.number(),
  description: z.string(),
});

export const viralityFactorSchema = z.object({
  factor: z.string(),
  explanation: z.string(),
});

export const analysisSchema = z.object({
  summary: z.string(),
  hook_analysis: z.string(),
  structure_breakdown: z.array(structureSegmentSchema),
  tone: z.string(),
  target_audience: z.string(),
  virality_factors: z.array(viralityFactorSchema),
  actionable_takeaways: z.array(z.string()),
});

export type StructureSegment = z.infer<typeof structureSegmentSchema>;
export type ViralityFactor = z.infer<typeof viralityFactorSchema>;
export type ReelAnalysis = z.infer<typeof analysisSchema>;

/**
 * Hand-written rather than derived, because the API needs `additionalProperties:
 * false` on every object and the descriptions here are doing prompt work — they
 * are the most reliable place to say what each field should contain.
 */
export const ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
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
      type: 'string',
      description: 'Two to four sentences on what the reel is about and what it is trying to achieve.',
    },
    hook_analysis: {
      type: 'string',
      description:
        'What the first three seconds do to stop the scroll, why it works or fails, and what it promises the viewer.',
    },
    structure_breakdown: {
      type: 'array',
      description:
        'The reel split into hook, body and CTA, in order, with timestamps taken from the transcript segments. Omit a section only if it genuinely is not present.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['section', 'start_seconds', 'end_seconds', 'description'],
        properties: {
          section: { type: 'string', enum: ['hook', 'body', 'cta'] },
          start_seconds: { type: 'number', description: 'Start of this section in seconds.' },
          end_seconds: { type: 'number', description: 'End of this section in seconds.' },
          description: { type: 'string', description: 'What happens in this section and why it is placed here.' },
        },
      },
    },
    tone: {
      type: 'string',
      description: 'The voice and register of the delivery, in a short phrase plus a sentence of justification.',
    },
    target_audience: {
      type: 'string',
      description: 'Who this is for, specifically — the viewer it is written to reach.',
    },
    virality_factors: {
      type: 'array',
      description: 'The concrete things helping or hurting this reel spread. Be specific to this reel, not generic advice.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['factor', 'explanation'],
        properties: {
          factor: { type: 'string', description: 'Short name for the factor.' },
          explanation: { type: 'string', description: 'Why it matters here, referencing the transcript or metrics.' },
        },
      },
    },
    actionable_takeaways: {
      type: 'array',
      description: 'Specific changes the creator could make on the next reel. Each one a single imperative sentence.',
      items: { type: 'string' },
    },
  },
} as const;
