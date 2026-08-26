import crypto from 'node:crypto';
import { config } from '../config.js';
import { log } from '../logger.js';

/**
 * Razorpay integration over the REST API.
 *
 * Uses fetch rather than the SDK: the two calls we need are a POST and an
 * HMAC, and a payment path with no extra transitive dependencies is easier to
 * audit than one with them.
 */

const API_BASE = 'https://api.razorpay.com/v1';

function authHeader() {
  const { keyId, keySecret } = config.razorpay;
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
}

/**
 * Creates an order. Razorpay works in paise, so ₹10.00 is 1000 — passing
 * rupees here would silently charge a hundredth of the intended amount, so
 * the conversion happens once, in this function, and is rounded not truncated.
 */
export async function createOrder({ amountInr, receipt, notes = {} }) {
  const amountPaise = Math.round(Number(amountInr) * 100);
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new Error(`Invalid order amount: ${amountInr}`);
  }

  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: amountPaise,
      currency: config.razorpay.currency,
      receipt: String(receipt).slice(0, 40),
      notes,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.error?.description || `Razorpay order creation failed (${res.status})`);
    err.status = res.status;
    err.detail = body?.error;
    throw err;
  }

  log.info(`Razorpay order created: ${body.id} for ₹${amountInr}`);
  return { id: body.id, amountPaise: body.amount, currency: body.currency, status: body.status };
}

/**
 * Verifies a webhook.
 *
 * The signature is an HMAC over the EXACT bytes Razorpay sent. It must be
 * computed on the raw body — re-serialising a parsed object changes key order
 * and whitespace and produces a different digest, which is the most common way
 * this check is broken. `src/server.js` mounts express.raw() on the webhook
 * path ahead of express.json() so `req.body` here is still a Buffer.
 */
export function verifyWebhookSignature({ rawBody, signature }) {
  const secret = config.razorpay.webhookSecret;
  if (!secret) {
    log.error('RAZORPAY_WEBHOOK_SECRET is not set — refusing to trust any webhook');
    return false;
  }
  if (!signature || !rawBody) return false;

  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), 'utf8');
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature).trim(), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Verifies the signature Razorpay Checkout hands the browser on success.
 *
 * Note this is a DIFFERENT scheme from the webhook: it signs
 * `order_id|payment_id` with the API key secret, not the raw body with the
 * webhook secret. It is good enough to show the user a confirmation, but it
 * is not what credits the account — the webhook is, because a browser can
 * simply never call back.
 */
export function verifyCheckoutSignature({ orderId, paymentId, signature }) {
  const secret = config.razorpay.keySecret;
  if (!secret || !orderId || !paymentId || !signature) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature).trim(), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Pulls the fields we care about out of a webhook envelope. */
export function parseWebhookEvent(payload) {
  const event = payload?.event ?? null;
  const entity = payload?.payload?.payment?.entity
    ?? payload?.payload?.order?.entity
    ?? null;

  return {
    event,
    orderId: entity?.order_id ?? entity?.id ?? null,
    paymentId: payload?.payload?.payment?.entity?.id ?? null,
    amountInr: Number.isFinite(entity?.amount) ? entity.amount / 100 : null,
    status: entity?.status ?? null,
  };
}
