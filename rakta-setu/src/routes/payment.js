import express from 'express';
import { config } from '../config.js';
import { log, maskPhone } from '../logger.js';
import { requireUser } from '../billing/auth.js';
import { supabase, rpc } from '../billing/supabaseClient.js';
import { inrToTokens } from '../billing/pricing.js';
import {
  createOrder, verifyWebhookSignature, verifyCheckoutSignature, parseWebhookEvent,
} from '../billing/razorpay.js';

export const paymentRoutes = express.Router();

/**
 * POST /api/payment/create-order
 *
 * Creates a Razorpay order and records it as a pending payment row. The row
 * is what later binds the webhook's order_id back to a user — the webhook
 * itself carries no authenticated identity, so without this row there would be
 * no safe way to know whose account to credit.
 */
paymentRoutes.post('/create-order', requireUser, async (req, res) => {
  const amountInr = Number(req.body?.amount_inr);
  const { minTopUpInr, maxTopUpInr } = config.razorpay;

  if (!Number.isFinite(amountInr) || amountInr < minTopUpInr || amountInr > maxTopUpInr) {
    return res.status(400).json({
      error: `रक्कम ₹${minTopUpInr} ते ₹${maxTopUpInr} या दरम्यान असावी.`,
      error_en: `amount_inr must be between ${minTopUpInr} and ${maxTopUpInr}`,
    });
  }

  // Rounded to paise here so the order amount and the credited amount agree.
  const amount = Math.round(amountInr * 100) / 100;
  const tokens = inrToTokens(amount);

  try {
    const order = await createOrder({
      amountInr: amount,
      receipt: `rs_${Date.now().toString(36)}`,
      notes: { user_id: req.user.id, tokens: String(tokens) },
    });

    const { error } = await supabase().from('payments').insert({
      user_id: req.user.id,
      razorpay_order_id: order.id,
      amount_inr: amount,
      status: 'created',
      notes: { tokens },
    });
    if (error) throw new Error(`could not record pending payment: ${error.message}`);

    return res.json({
      order_id: order.id,
      amount_inr: amount,
      amount_paise: order.amountPaise,
      currency: order.currency,
      tokens_on_success: tokens,
      razorpay_key_id: config.razorpay.keyId,
      display: { mr: `₹${amount} भरल्यावर तुम्हाला ${tokens.toLocaleString('en-IN')} क्रेडिट मिळतील.` },
    });
  } catch (err) {
    log.error(`create-order failed: ${err.message}`);
    return res.status(502).json({ error: 'पेमेंट सुरू करता आलं नाही. कृपया पुन्हा प्रयत्न करा.' });
  }
});

/**
 * POST /api/payment/webhook
 *
 * The only path that adds credit.
 *
 * `req.body` is a Buffer here, not a parsed object — server.js mounts
 * express.raw() on this path ahead of express.json(). The signature is an HMAC
 * over the exact bytes Razorpay sent, so re-serialising a parsed object would
 * produce a different digest and reject every legitimate call.
 *
 * Idempotency has two layers because Razorpay retries until it gets a 2xx:
 * the event id is recorded here, and fn_credit_payment refuses to credit an
 * order that is already marked paid.
 */
paymentRoutes.post('/webhook', async (req, res) => {
  const signature = req.get('x-razorpay-signature');
  const eventId = req.get('x-razorpay-event-id') || null;
  const rawBody = req.body;

  if (!verifyWebhookSignature({ rawBody, signature })) {
    log.warn('rejected a Razorpay webhook with an invalid signature');
    return res.status(400).json({ error: 'invalid signature' });
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody));
  } catch {
    return res.status(400).json({ error: 'malformed payload' });
  }

  const { event, orderId, paymentId, amountInr } = parseWebhookEvent(payload);
  log.info(`Razorpay webhook: ${event} order=${orderId ?? '-'} payment=${paymentId ?? '-'}`);

  // Acknowledge fast; Razorpay retries anything that is not a prompt 2xx.
  res.status(200).json({ received: true });

  try {
    if (eventId) {
      const { error } = await supabase()
        .from('webhook_events')
        .insert({ id: eventId, event_type: event, payload });
      if (error) {
        // 23505 = unique violation: we have already handled this exact event.
        if (error.code === '23505') {
          log.info(`webhook ${eventId} already processed — ignoring replay`);
          return;
        }
        log.warn(`could not record webhook event ${eventId}: ${error.message}`);
      }
    }

    if (event === 'payment.captured' || event === 'order.paid') {
      if (!orderId) {
        log.warn('paid webhook carried no order id — nothing to credit');
        return;
      }

      // Tokens are computed from the amount Razorpay reports, never from
      // anything the client sent.
      const tokens = inrToTokens(amountInr ?? 0);
      const result = await rpc('fn_credit_payment', {
        p_order_id: orderId,
        p_payment_id: paymentId,
        p_amount_inr: amountInr ?? 0,
        p_tokens: tokens,
      });

      if (!result?.ok) {
        log.error(`webhook referenced unknown order ${orderId} — refusing to credit`);
        return;
      }
      if (result.already_credited) {
        log.info(`order ${orderId} was already credited — replay ignored`);
        return;
      }
      log.info(`credited ${tokens} tokens to ${result.credited_user_id} (balance now ${result.new_balance_tokens})`);
      return;
    }

    if (event === 'payment.failed' && orderId) {
      await rpc('fn_mark_payment_failed', { p_order_id: orderId, p_payment_id: paymentId });
      log.info(`marked order ${orderId} failed`);
    }
  } catch (err) {
    // Already replied 200. Log loudly — this is money, and a silent failure
    // here means a paying user is not credited.
    log.error(`WEBHOOK PROCESSING FAILED for order ${orderId}: ${err.message}`);
  }
});

/**
 * POST /api/payment/verify — optional immediate confirmation for the browser.
 * Confirms Checkout's signature so the UI can react at once. It deliberately
 * does NOT credit: the webhook does that, because the browser may never call.
 */
paymentRoutes.post('/verify', requireUser, async (req, res) => {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body ?? {};

  if (!verifyCheckoutSignature({ orderId, paymentId, signature })) {
    return res.status(400).json({ verified: false, error: 'पेमेंटची पडताळणी झाली नाही.' });
  }

  const { data } = await supabase()
    .from('payments')
    .select('status, credited_tokens')
    .eq('razorpay_order_id', orderId)
    .eq('user_id', req.user.id)
    .maybeSingle();

  return res.json({
    verified: true,
    credited: data?.status === 'paid',
    credited_tokens: data?.credited_tokens ?? 0,
    display: {
      mr: data?.status === 'paid'
        ? 'पेमेंट यशस्वी! तुमचे क्रेडिट जमा झाले आहेत.'
        : 'पेमेंट मिळालं. क्रेडिट काही क्षणांत जमा होतील.',
    },
  });
});
