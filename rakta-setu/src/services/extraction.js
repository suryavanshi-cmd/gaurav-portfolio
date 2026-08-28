import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { log } from '../logger.js';
import { ANALYTES } from '../domain/analytes.js';
import { ratesFor } from '../billing/pricing.js';

/**
 * AI-backed PDF extraction — the metered feature.
 *
 * The free path (`src/parsers/`) reads a PDF's text layer locally and costs
 * nothing; it stays the default and is never billed. This module exists for
 * the reports that path refuses: scans and image-only PDFs with no text to
 * read. Those are the ones worth paying for, so those are the ones metered.
 *
 * Output is constrained to the analyte vocabulary in `domain/analytes.js`, so
 * whatever comes back flows into the existing interpret/report pipeline
 * unchanged.
 */

let client = null;
function getClient() {
  if (!config.ai.apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  if (!client) client = new Anthropic({ apiKey: config.ai.apiKey });
  return client;
}

const ANALYTE_KEYS = ANALYTES.map((a) => a.key);

/**
 * A strict tool is how the response is pinned to a schema: `strict: true`
 * guarantees `tool_use.input` validates, so no defensive parsing of prose.
 */
const EXTRACTION_TOOL = {
  name: 'record_blood_report',
  description:
    'Record every laboratory test result and patient detail found in the blood report. '
    + 'Report only what is printed on the page. Never infer, complete, or invent a value: '
    + 'a wrong number here becomes medical advice sent to a patient.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['patient', 'measurements', 'page_count', 'unreadable'],
    properties: {
      patient: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'age', 'sex', 'phone', 'lab_no', 'collected_at', 'reported_at', 'doctor'],
        properties: {
          name: { type: ['string', 'null'], description: 'Patient name exactly as printed, without Mr/Mrs/Shri titles.' },
          age: { type: ['integer', 'null'], description: 'Age in completed years.' },
          sex: { type: ['string', 'null'], description: 'Exactly "male" or "female", or null if not printed.' },
          phone: { type: ['string', 'null'], description: 'Mobile number as printed, digits and separators only.' },
          lab_no: { type: ['string', 'null'], description: 'Lab / report / sample number.' },
          collected_at: { type: ['string', 'null'], description: 'Sample collection date as printed.' },
          reported_at: { type: ['string', 'null'], description: 'Report date as printed.' },
          doctor: { type: ['string', 'null'], description: 'Referring doctor.' },
        },
      },
      measurements: {
        type: 'array',
        description: 'One entry per test result. Omit any test not in the allowed key list.',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['key', 'value', 'unit', 'raw_label'],
          properties: {
            key: { type: 'string', enum: ANALYTE_KEYS, description: 'Which known test this row is.' },
            value: { type: 'number', description: 'The numeric result exactly as printed — do not rescale or convert units.' },
            unit: { type: ['string', 'null'], description: 'The unit exactly as printed, e.g. "g/dL", "lakhs/cumm", "10^3/uL".' },
            raw_label: { type: ['string', 'null'], description: 'The test name as printed on the report.' },
          },
        },
      },
      page_count: { type: 'integer', description: 'Number of pages in the document.' },
      unreadable: {
        type: 'boolean',
        description: 'True if the document is too blurred, cropped or low quality to read reliably.',
      },
    },
  },
};

const SYSTEM_PROMPT = `You transcribe blood test reports from scanned documents into structured data.

You are reading a scanned pathology report from an Indian laboratory. Transcribe it exactly.

Rules:
- Copy every value exactly as printed. Do not convert units, do not rescale, do not round.
  If platelets read "1.45 lakhs/cumm", record value 1.45 and unit "lakhs/cumm" — downstream code handles scaling.
- Only record a test if you can actually read both its name and its value. Skip anything blurred,
  cut off, or ambiguous. A missing result is safe; a guessed result is not.
- Only use keys from the allowed list. Tests outside it are ignored, not forced into a near match.
- Reference ranges printed on the report are NOT results — never record them as values.
- If the scan is too poor to read reliably, set unreadable to true and return whatever you are certain of.

Always answer by calling the record_blood_report tool.`;

/** Builds the request body once, so token counting and the real call cannot drift apart. */
function buildRequest(pdfBase64) {
  const rates = ratesFor(config.billing.model);

  const request = {
    model: config.billing.model,
    max_tokens: config.billing.maxOutputTokens,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    tools: [EXTRACTION_TOOL],
    tool_choice: { type: 'tool', name: 'record_blood_report' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
          { type: 'text', text: 'Transcribe every test result and patient detail from this blood report.' },
        ],
      },
    ],
  };

  // effort is rejected outright by Haiku 4.5, so only send it where supported.
  if (rates.supportsEffort) request.output_config = { effort: 'low' };

  return request;
}

/**
 * Exact input-token count for the real request. Free to call and far more
 * accurate than a per-page heuristic, so the credit hold is sized from this
 * whenever the call succeeds. Returns null on failure — the caller falls back
 * to the heuristic rather than blocking the user on a metering nicety.
 */
export async function countInputTokens(pdfBase64) {
  try {
    const request = buildRequest(pdfBase64);
    const result = await getClient().messages.countTokens({
      model: request.model,
      system: request.system,
      tools: request.tools,
      messages: request.messages,
    });
    return result.input_tokens ?? null;
  } catch (err) {
    log.warn(`token counting failed, falling back to the page heuristic: ${err.message}`);
    return null;
  }
}

export class ExtractionFailed extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ExtractionFailed';
    this.code = code;
  }
}

/**
 * Runs the extraction.
 *
 * Always returns the usage block, including on the failure paths that still
 * consumed tokens — the caller has an open credit hold and must be able to
 * settle it against what was really spent.
 */
export async function extractFromPdf(pdfBase64) {
  const request = buildRequest(pdfBase64);
  let response;

  try {
    response = await getClient().messages.create(request);
  } catch (err) {
    if (err instanceof Anthropic.BadRequestError) {
      throw new ExtractionFailed(`The API rejected this PDF: ${err.message}`, 'BAD_REQUEST');
    }
    if (err instanceof Anthropic.AuthenticationError) {
      throw new ExtractionFailed('ANTHROPIC_API_KEY is invalid.', 'AUTH');
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new ExtractionFailed('Rate limited by the API — try again shortly.', 'RATE_LIMIT');
    }
    if (err instanceof Anthropic.APIError) {
      throw new ExtractionFailed(`API error ${err.status}: ${err.message}`, 'API_ERROR');
    }
    throw err;
  }

  const usage = {
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
    cacheReadTokens: response.usage?.cache_read_input_tokens ?? 0,
    cacheWriteTokens: response.usage?.cache_creation_input_tokens ?? 0,
  };

  if (response.stop_reason === 'refusal') {
    const err = new ExtractionFailed('The model declined to process this document.', 'REFUSAL');
    err.usage = usage;
    throw err;
  }

  const toolUse = response.content.find((b) => b.type === 'tool_use' && b.name === 'record_blood_report');
  if (!toolUse) {
    const err = new ExtractionFailed('The model returned no structured result.', 'NO_TOOL_USE');
    err.usage = usage;
    throw err;
  }

  const extracted = toolUse.input;

  if (extracted.unreadable && (extracted.measurements ?? []).length === 0) {
    const err = new ExtractionFailed(
      'The scan is too unclear to read any result reliably.',
      'UNREADABLE',
    );
    err.usage = usage;
    throw err;
  }

  return {
    usage,
    model: response.model ?? config.billing.model,
    pageCount: extracted.page_count ?? null,
    unreadable: Boolean(extracted.unreadable),
    patient: normalisePatient(extracted.patient ?? {}),
    measurements: (extracted.measurements ?? [])
      .filter((m) => m && typeof m.key === 'string' && Number.isFinite(m.value))
      .map((m) => ({ key: m.key, value: m.value, unit: m.unit ?? null, rawLabel: m.raw_label ?? null })),
  };
}

/** Maps the tool's snake_case shape onto the one the rest of the app already uses. */
function normalisePatient(p) {
  const sex = typeof p.sex === 'string' ? p.sex.toLowerCase().trim() : null;
  return {
    name: p.name ?? null,
    age: Number.isFinite(p.age) ? p.age : null,
    sex: sex === 'male' || sex === 'female' ? sex : null,
    phone: p.phone ?? null,
    labNo: p.lab_no ?? null,
    collectedAt: p.collected_at ?? null,
    reportedAt: p.reported_at ?? null,
    doctor: p.doctor ?? null,
  };
}
