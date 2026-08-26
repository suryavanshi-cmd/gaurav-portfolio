import express from 'express';
import { config } from '../config.js';
import { log } from '../logger.js';
import { requireUser } from '../billing/auth.js';
import { getBalance } from '../billing/credits.js';
import { tokensToInr, estimateTokens } from '../billing/pricing.js';

export const userRoutes = express.Router();

/**
 * GET /api/user/balance
 *
 * What the frontend shows before an upload. The balance is read from
 * Supabase on every call — there is no client-supplied figure anywhere in
 * this path, and nothing here is cached.
 */
userRoutes.get('/balance', requireUser, async (req, res) => {
  try {
    const balance = await getBalance(req.user.id);

    // How many typical pages the remaining credit actually buys — more useful
    // to a lab than a raw token count.
    const perPage = estimateTokens({ pageCount: 1 }).totalEstimate;
    const pagesRemaining = perPage > 0 ? Math.floor(balance.availableTokens / perPage) : 0;

    res.json({
      user_id: req.user.id,
      balance_tokens: balance.balanceTokens,
      reserved_tokens: balance.reservedTokens,
      available_tokens: balance.availableTokens,
      balance_inr: Number(balance.balanceInr.toFixed(2)),
      approx_pages_remaining: pagesRemaining,
      approx_cost_per_page_tokens: perPage,
      tokens_per_inr: config.billing.tokensPerInr,
      min_topup_inr: config.razorpay.minTopUpInr,
      updated_at: balance.updatedAt,
      display: {
        mr: balance.availableTokens > 0
          ? `तुमच्याकडे ${balance.availableTokens.toLocaleString('en-IN')} क्रेडिट शिल्लक आहेत (अंदाजे ${pagesRemaining} पानं).`
          : 'तुमचे क्रेडिट संपले आहेत. कृपया रिचार्ज करा.',
      },
    });
  } catch (err) {
    log.error(`balance lookup failed: ${err.message}`);
    res.status(503).json({ error: 'शिल्लक तपासता आली नाही. कृपया पुन्हा प्रयत्न करा.' });
  }
});

/** GET /api/user/rates — so the top-up screen can show what money buys. */
userRoutes.get('/rates', (req, res) => {
  res.json({
    tokens_per_inr: config.billing.tokensPerInr,
    example: {
      inr: 10,
      tokens: Math.floor(10 * config.billing.tokensPerInr),
      inr_value_of_1000_tokens: Number(tokensToInr(1000).toFixed(3)),
    },
    min_topup_inr: config.razorpay.minTopUpInr,
    max_topup_inr: config.razorpay.maxTopUpInr,
    currency: config.razorpay.currency,
    razorpay_key_id: config.razorpay.keyId, // publishable — safe for the browser
  });
});
