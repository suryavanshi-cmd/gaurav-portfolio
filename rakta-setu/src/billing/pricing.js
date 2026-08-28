import { config } from '../config.js';

/**
 * Model rates in USD per million tokens, as published by Anthropic.
 *
 * These are the numbers the whole billing system is built on, so they are
 * constants in one place rather than scattered literals. When Anthropic
 * changes a price, this table is the only edit — and because BILLING_MODEL
 * selects a row from it, switching models automatically switches rates.
 *
 * `supportsEffort` matters: `output_config.effort` is rejected by Haiku 4.5,
 * so the extraction request must not send it when running on Haiku.
 */
export const MODEL_RATES = {
  'claude-haiku-4-5': { inputPerMTok: 1, outputPerMTok: 5, contextTokens: 200_000, maxPdfPages: 100, supportsEffort: false },
  'claude-sonnet-5': { inputPerMTok: 2, outputPerMTok: 10, contextTokens: 1_000_000, maxPdfPages: 600, supportsEffort: true },
  'claude-sonnet-4-6': { inputPerMTok: 3, outputPerMTok: 15, contextTokens: 1_000_000, maxPdfPages: 600, supportsEffort: true },
  'claude-opus-5': { inputPerMTok: 5, outputPerMTok: 25, contextTokens: 1_000_000, maxPdfPages: 600, supportsEffort: true },
  'claude-opus-4-8': { inputPerMTok: 5, outputPerMTok: 25, contextTokens: 1_000_000, maxPdfPages: 600, supportsEffort: true },
  'claude-opus-4-7': { inputPerMTok: 5, outputPerMTok: 25, contextTokens: 1_000_000, maxPdfPages: 600, supportsEffort: true },
  'claude-opus-4-6': { inputPerMTok: 5, outputPerMTok: 25, contextTokens: 1_000_000, maxPdfPages: 600, supportsEffort: true },
  'claude-fable-5': { inputPerMTok: 10, outputPerMTok: 50, contextTokens: 1_000_000, maxPdfPages: 600, supportsEffort: true },
};

export function ratesFor(model = config.billing.model) {
  const rates = MODEL_RATES[model];
  if (!rates) {
    throw new Error(
      `No published rate for model "${model}". Add it to MODEL_RATES in src/billing/pricing.js — `
      + 'billing must never fall back to a guessed price.',
    );
  }
  return rates;
}

/** True USD cost of a completed call, from the usage block the API returned. */
export function costUsd({ inputTokens, outputTokens, model = config.billing.model }) {
  const rates = ratesFor(model);
  return (inputTokens / 1e6) * rates.inputPerMTok + (outputTokens / 1e6) * rates.outputPerMTok;
}

export function usdToInr(usd) {
  return usd * config.billing.usdToInr;
}

/**
 * What the user is charged, in the platform's own token currency.
 *
 * Deliberately a straight sum of input + output rather than a price-weighted
 * one: it is the number a patient-facing lab can actually reason about, and
 * the margin between it and the true cost absorbs the 5x output premium.
 * `docs/BILLING.md` works through the arithmetic.
 */
export function billedTokens({ inputTokens, outputTokens }) {
  return Math.max(0, Math.round(inputTokens + outputTokens));
}

/** Rupee value of a token quantity at the purchase rate (₹10 → 9000 tokens). */
export function tokensToInr(tokens) {
  if (config.billing.tokensPerInr <= 0) return 0;
  return tokens / config.billing.tokensPerInr;
}

export function inrToTokens(inr) {
  return Math.floor(inr * config.billing.tokensPerInr);
}

/**
 * Pre-flight estimate, used to size the credit hold.
 *
 * `exactInputTokens` comes from the token-counting endpoint when it is
 * available — that is a real count of the actual request, not a guess, and it
 * is free to call. The page heuristic is the fallback for when that call
 * fails, and it is also how the output allowance is sized (output length
 * genuinely cannot be known in advance).
 *
 * The result is padded by ESTIMATE_SAFETY_MARGIN so that a slightly
 * under-estimated hold does not routinely let a call overrun the balance.
 */
export function estimateTokens({ pageCount, exactInputTokens = null }) {
  const pages = Math.max(1, pageCount || 1);
  const inputEstimate = Number.isFinite(exactInputTokens) && exactInputTokens > 0
    ? exactInputTokens
    : pages * config.billing.tokensPerPage;

  const outputEstimate = Math.min(
    config.billing.maxOutputTokens,
    pages * config.billing.outputTokensPerPage,
  );

  const total = (inputEstimate + outputEstimate) * config.billing.estimateSafetyMargin;
  return {
    inputEstimate: Math.round(inputEstimate),
    outputEstimate: Math.round(outputEstimate),
    totalEstimate: Math.ceil(total),
    exact: Number.isFinite(exactInputTokens) && exactInputTokens > 0,
  };
}

/** Rough page count for a PDF without fully parsing it — counts /Type /Page. */
export function estimatePdfPages(buffer) {
  const text = buffer.toString('latin1');
  const matches = text.match(/\/Type\s*\/Page[^s]/g);
  if (matches && matches.length > 0) return matches.length;
  const countMatch = text.match(/\/Count\s+(\d+)/);
  if (countMatch) return Math.max(1, Number.parseInt(countMatch[1], 10));
  // ~40KB per page is a reasonable fallback for a scanned lab report.
  return Math.max(1, Math.ceil(buffer.length / 40_000));
}

/** Current UTC billing period, used to key platform_usage. */
export function currentPeriod(now = new Date()) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}
