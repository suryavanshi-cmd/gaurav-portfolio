import { rpc } from './supabaseClient.js';
import { config } from '../config.js';
import { log } from '../logger.js';
import { tokensToInr } from './pricing.js';

/**
 * The credit ledger, as seen from Node.
 *
 * Every function here is a thin wrapper over one Postgres function. That is
 * deliberate: each balance change needs a row lock to be safe under
 * concurrency, and doing read-modify-write from here over separate queries
 * would reintroduce exactly the race the SQL is written to prevent.
 */

/** Current balance. Always read server-side — a client-supplied balance is never trusted. */
export async function getBalance(userId) {
  const row = await rpc('fn_user_balance', { p_user_id: userId });
  if (!row) {
    return { balanceTokens: 0, reservedTokens: 0, availableTokens: 0, balanceInr: 0, updatedAt: null };
  }
  return {
    balanceTokens: Number(row.balance_tokens ?? 0),
    reservedTokens: Number(row.reserved_tokens ?? 0),
    availableTokens: Number(row.available_tokens ?? 0),
    balanceInr: Number(row.balance_inr ?? 0),
    updatedAt: row.updated_at ?? null,
  };
}

export class InsufficientCredit extends Error {
  constructor({ required, available }) {
    super(`Insufficient credit: need ${required} tokens, ${available} available`);
    this.name = 'InsufficientCredit';
    this.required = required;
    this.available = available;
    this.shortfallTokens = Math.max(0, required - available);
    this.shortfallInr = Math.ceil(tokensToInr(this.shortfallTokens) * 100) / 100;
  }
}

/**
 * Pre-flight gate. Places a hold on the estimated cost and returns its id.
 *
 * Holding rather than merely checking is what makes concurrent uploads safe:
 * a plain check-then-spend lets two requests both observe the same balance and
 * both proceed. Throws InsufficientCredit, which the route turns into a 402.
 */
export async function reserve({ userId, tokens, pdfId }) {
  let row = await rpc('fn_reserve_credits', {
    p_user_id: userId,
    p_tokens: tokens,
    p_pdf_id: pdfId ?? null,
  });

  // Self-healing. A process that died mid-extraction — a serverless timeout, a
  // cold-start kill — leaves its reservation behind. On a long-running server
  // the boot-time sweep clears those; a serverless deployment never boots, so
  // nothing would ever release them and the user could not spend credit they
  // had already paid for. Notice it exactly where it bites: a refusal while
  // the account still shows tokens reserved.
  if (!row?.ok) {
    const balance = await getBalance(userId);
    if (balance.reservedTokens > 0) {
      const freed = Number(await rpc('fn_expire_user_holds', { p_user_id: userId }) ?? 0);
      if (freed > 0) {
        log.warn(`released ${freed} stale hold(s) for ${userId} and retrying the reservation`);
        row = await rpc('fn_reserve_credits', {
          p_user_id: userId,
          p_tokens: tokens,
          p_pdf_id: pdfId ?? null,
        });
      }
    }
  }

  if (!row?.ok) {
    throw new InsufficientCredit({
      required: tokens,
      available: Number(row?.available_tokens ?? 0),
    });
  }

  log.debug(`credit hold ${row.hold_id}: ${tokens} tokens for ${pdfId}`);
  return {
    holdId: row.hold_id,
    availableAfter: Number(row.available_tokens ?? 0),
    balanceTokens: Number(row.current_balance ?? 0),
  };
}

/**
 * Post-call reconciliation. Releases the hold and charges what was actually
 * used, from the usage block the API returned.
 *
 * Idempotent on the Postgres side, so a retry cannot double-charge.
 */
export async function settle({
  holdId, status, inputTokens = 0, outputTokens = 0,
  billed = 0, costInr = 0, costUsd = 0, model = null, error = null,
}) {
  const row = await rpc('fn_settle_hold', {
    p_hold_id: holdId,
    p_status: status,
    p_input_tokens: Math.round(inputTokens),
    p_output_tokens: Math.round(outputTokens),
    p_billed_tokens: Math.round(billed),
    p_cost_inr: costInr,
    p_cost_usd: costUsd,
    p_tokens_per_inr: config.billing.tokensPerInr,
    p_model: model,
    p_error: error ? String(error).slice(0, 500) : null,
  });

  return {
    alreadySettled: Boolean(row?.already_settled),
    balanceTokens: Number(row?.new_balance_tokens ?? 0),
    balanceInr: Number(row?.new_balance_inr ?? 0),
  };
}

/**
 * Hands back tokens stranded by a crashed process. Called on boot, and worth
 * scheduling (pg_cron, or a timer) in a long-running deployment.
 */
export async function expireStaleHolds() {
  const count = await rpc('fn_expire_stale_holds', {});
  const n = Number(count ?? 0);
  if (n > 0) log.warn(`released ${n} stale credit hold(s) left by an earlier crash`);
  return n;
}
