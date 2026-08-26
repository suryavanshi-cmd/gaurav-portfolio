#!/usr/bin/env node
/**
 * Offline checks for the billing arithmetic and the Razorpay signature logic.
 *
 * Runs with no credentials, no network and no database — everything here is
 * pure. Run it after changing a rate, the token conversion, or anything in
 * src/billing/pricing.js.
 *
 *   npm run billing-check
 */
import crypto from 'node:crypto';
import { config } from '../src/config.js';
import {
  MODEL_RATES, ratesFor, costUsd, usdToInr, billedTokens,
  tokensToInr, inrToTokens, estimateTokens, estimatePdfPages, currentPeriod,
} from '../src/billing/pricing.js';
import { verifyWebhookSignature, verifyCheckoutSignature } from '../src/billing/razorpay.js';

let failures = 0;
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

function check(label, got, want, compare = (a, b) => a === b) {
  const ok = compare(got, want);
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  — got ${got}, want ${want}`}`);
}

console.log('\n── rates ──');
check('every model has input < output rate',
  Object.values(MODEL_RATES).every((r) => r.inputPerMTok < r.outputPerMTok), true);
check('haiku 4.5 is $1 / $5',
  `${MODEL_RATES['claude-haiku-4-5'].inputPerMTok}/${MODEL_RATES['claude-haiku-4-5'].outputPerMTok}`, '1/5');
check('an unknown model throws rather than guessing a price',
  (() => { try { ratesFor('claude-does-not-exist'); return false; } catch { return true; } })(), true);

console.log('\n── cost of one 1000-in / 500-out call on Haiku 4.5 ──');
const usd = costUsd({ inputTokens: 1000, outputTokens: 500, model: 'claude-haiku-4-5' });
check('costs $0.0035', near(usd, 0.0035), true);
check(`converts to ₹${usdToInr(usd).toFixed(4)} at ₹${config.billing.usdToInr}/USD`,
  near(usdToInr(usd), 0.0035 * config.billing.usdToInr), true);

console.log('\n── credit conversion ──');
check(`₹10 buys ${inrToTokens(10)} tokens`, inrToTokens(10), 10 * config.billing.tokensPerInr);
check('token → ₹ → token round-trips', inrToTokens(tokensToInr(9000)), 9000);
check('billed tokens = input + output', billedTokens({ inputTokens: 1000, outputTokens: 500 }), 1500);

console.log('\n── margin (this is what keeps the service solvent) ──');
const charged = billedTokens({ inputTokens: 1000, outputTokens: 500 });
const revenue = tokensToInr(charged);
const cost = usdToInr(usd);
console.log(`  charge ₹${revenue.toFixed(4)} · true cost ₹${cost.toFixed(4)} · margin ${(revenue / cost).toFixed(1)}x`);
check('the charge exceeds the true cost', revenue > cost, true);

console.log('\n── estimation ──');
const heuristic = estimateTokens({ pageCount: 2 });
check('2 pages estimates above zero', heuristic.totalEstimate > 0, true);
check('heuristic is flagged as not exact', heuristic.exact, false);
const exact = estimateTokens({ pageCount: 2, exactInputTokens: 5000 });
check('a real token count is flagged exact', exact.exact, true);
check('the safety margin pads the hold', exact.totalEstimate > 5000, true);
check('more pages cost more',
  estimateTokens({ pageCount: 10 }).totalEstimate > estimateTokens({ pageCount: 1 }).totalEstimate, true);
check('output allowance is capped',
  estimateTokens({ pageCount: 10_000 }).outputEstimate <= config.billing.maxOutputTokens, true);

console.log('\n── pdf page counting ──');
const fakePdf = Buffer.from('%PDF-1.4\n/Type /Page \n/Type /Page \n/Type /Pages /Count 2\n', 'latin1');
check('counts 2 pages', estimatePdfPages(fakePdf), 2);
check('never returns zero', estimatePdfPages(Buffer.from('%PDF-1.4 nothing here')) >= 1, true);

console.log('\n── razorpay webhook signature ──');
const secret = config.razorpay.webhookSecret || 'test_webhook_secret';
const body = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1' } } } }));
const good = crypto.createHmac('sha256', secret).update(body).digest('hex');

process.env.RAZORPAY_WEBHOOK_SECRET = secret;
config.razorpay.webhookSecret = secret;

check('a valid signature is accepted', verifyWebhookSignature({ rawBody: body, signature: good }), true);
check('a tampered body is rejected',
  verifyWebhookSignature({ rawBody: Buffer.concat([body, Buffer.from(' ')]), signature: good }), false);
check('a wrong signature is rejected', verifyWebhookSignature({ rawBody: body, signature: 'deadbeef' }), false);
check('a missing signature is rejected', verifyWebhookSignature({ rawBody: body, signature: null }), false);
check('re-serialising the parsed body breaks the signature (why raw bytes matter)',
  verifyWebhookSignature({ rawBody: Buffer.from(JSON.stringify(JSON.parse(body.toString()), null, 2)), signature: good }), false);

console.log('\n── razorpay checkout signature ──');
config.razorpay.keySecret = 'test_key_secret';
const checkoutSig = crypto.createHmac('sha256', 'test_key_secret').update('order_1|pay_1').digest('hex');
check('a valid checkout signature is accepted',
  verifyCheckoutSignature({ orderId: 'order_1', paymentId: 'pay_1', signature: checkoutSig }), true);
check('a swapped order id is rejected',
  verifyCheckoutSignature({ orderId: 'order_2', paymentId: 'pay_1', signature: checkoutSig }), false);

console.log('\n── period key ──');
check('formats as YYYY-MM', currentPeriod(new Date(Date.UTC(2026, 7, 26))), '2026-08');

console.log(`\n${failures === 0 ? '✅ all billing self-tests passed' : `❌ ${failures} FAILURE(S)`}\n`);
process.exit(failures === 0 ? 0 : 1);
