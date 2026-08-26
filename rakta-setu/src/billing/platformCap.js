import { rpc } from './supabaseClient.js';
import { config } from '../config.js';
import { log } from '../logger.js';
import { currentPeriod, usdToInr } from './pricing.js';

/**
 * Account-level spend backstop.
 *
 * This is the last line of defence, not the primary control — it can only stop
 * spending after money has been spent, and it depends on this process being
 * the only thing using the API key. The authoritative limit belongs in the
 * Anthropic Console, where it is enforced upstream of anything running here.
 *
 * It is deliberately independent of user balances: it exists to catch the case
 * where the platform's own pricing is wrong, or credits are issued by mistake,
 * and would otherwise run up an unbounded bill.
 */

export class PlatformCapExceeded extends Error {
  constructor({ spendUsd, capUsd, period }) {
    super(`Platform spend cap reached for ${period}: $${spendUsd.toFixed(2)} of $${capUsd.toFixed(2)}`);
    this.name = 'PlatformCapExceeded';
    this.spendUsd = spendUsd;
    this.capUsd = capUsd;
    this.period = period;
  }
}

/** Throws PlatformCapExceeded when this month's spend is at or over the cap. */
export async function assertUnderCap() {
  const cap = config.billing.monthlySpendCapUsd;
  if (!cap || cap <= 0) return { capped: false, spendUsd: 0, capUsd: 0 };

  const period = currentPeriod();
  const spendUsd = Number(await rpc('fn_platform_spend', { p_period: period }) ?? 0);

  if (spendUsd >= cap) {
    log.error(`PLATFORM SPEND CAP REACHED — ${period}: $${spendUsd.toFixed(4)} >= $${cap}. New extractions are disabled.`);
    throw new PlatformCapExceeded({ spendUsd, capUsd: cap, period });
  }

  // Warn while there is still time to react.
  if (spendUsd >= cap * 0.8) {
    log.warn(`platform spend at ${((spendUsd / cap) * 100).toFixed(0)}% of the monthly cap ($${spendUsd.toFixed(2)} / $${cap})`);
  }

  return { capped: false, spendUsd, capUsd: cap, period };
}

/** Adds a completed call's true cost to this month's running total. */
export async function recordSpend(usd) {
  if (!usd || usd <= 0) return 0;
  const period = currentPeriod();
  const total = await rpc('fn_record_platform_spend', {
    p_period: period,
    p_usd: usd,
    p_inr: usdToInr(usd),
  });
  return Number(total ?? 0);
}

export async function currentSpend() {
  const period = currentPeriod();
  const spendUsd = Number(await rpc('fn_platform_spend', { p_period: period }) ?? 0);
  return { period, spendUsd, capUsd: config.billing.monthlySpendCapUsd };
}
