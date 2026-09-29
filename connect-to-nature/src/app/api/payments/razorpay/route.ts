import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, isRazorpayConfigured } from '@/lib/env';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';

/* Razorpay, over its REST API rather than through the SDK — an order is one
   POST and a verification is one HMAC, and a marketplace this size does not
   need another dependency for that.

   POST  { action: 'order', bookingCode }   → creates the order to open checkout with
   POST  { action: 'verify', … }            → checks the signature, marks the booking paid

   Both steps also write to the payment ledger — the same payments row and
   payment log that test mode fills in — so switching the gateway on changes
   where the money comes from and nothing about the history. Those writes need
   the service role; without it the payment still goes through and only the
   log is skipped. */

type Admin = NonNullable<ReturnType<typeof createAdminSupabase>>;

async function logEvent(
  admin: Admin | null,
  bookingId: string,
  event: string,
  detail: Record<string, unknown>,
  paymentId: string | null = null,
) {
  if (!admin) return;
  await admin.from('payment_events').insert({ booking_id: bookingId, payment_id: paymentId, event, detail });
}

const OrderInput = z.object({ action: z.literal('order'), bookingCode: z.string().min(4) });
const VerifyInput = z.object({
  action: z.literal('verify'),
  bookingCode: z.string().min(4),
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

export async function POST(request: Request) {
  if (!isRazorpayConfigured) {
    return NextResponse.json({ error: 'payments_not_configured', demo: true }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const order = OrderInput.safeParse(body);
  if (order.success) {
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, code, total_amount, guest_name, guest_phone, traveler_id')
      .eq('code', order.data.bookingCode)
      .maybeSingle();
    if (!booking) return NextResponse.json({ error: 'booking_not_found' }, { status: 404 });

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')}`,
      },
      body: JSON.stringify({
        // Razorpay counts in paise.
        amount: Math.round(Number(booking.total_amount) * 100),
        currency: 'INR',
        receipt: booking.code,
        notes: { booking_code: booking.code, guest: booking.guest_name },
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'order_failed', detail: await response.text() }, { status: 502 });
    }
    const created = await response.json();
    await supabase.from('bookings').update({ razorpay_order_id: created.id }).eq('id', booking.id);

    const admin = createAdminSupabase();
    if (admin) {
      const { data: payment } = await admin
        .from('payments')
        .insert({
          booking_id: booking.id,
          traveler_id: booking.traveler_id,
          provider: 'razorpay',
          amount: booking.total_amount,
          status: 'created',
          reference: created.id,
          provider_order_id: created.id,
        })
        .select('id')
        .single();
      await logEvent(admin, booking.id, 'payment.order_created',
        { order_id: created.id, amount: booking.total_amount, currency: 'INR' }, payment?.id ?? null);
    }
    return NextResponse.json({ orderId: created.id, amount: created.amount, keyId: RAZORPAY_KEY_ID });
  }

  const verify = VerifyInput.safeParse(body);
  if (verify.success) {
    const expected = createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${verify.data.razorpay_order_id}|${verify.data.razorpay_payment_id}`)
      .digest('hex');
    const given = verify.data.razorpay_signature;
    const ok =
      expected.length === given.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(given));

    const admin = createAdminSupabase();
    const { data: target } = await (admin ?? supabase)
      .from('bookings').select('id').eq('code', verify.data.bookingCode).maybeSingle();

    if (!ok) {
      if (target) {
        await logEvent(admin, target.id, 'payment.signature_rejected',
          { order_id: verify.data.razorpay_order_id });
      }
      return NextResponse.json({ error: 'bad_signature' }, { status: 400 });
    }

    // Marking a booking paid is the one write a guest must not be able to make
    // themselves, so it goes through the service role after the signature check.
    const writer = admin ?? supabase;
    const { error } = await writer
      .from('bookings')
      .update({
        payment_status: 'paid',
        status: 'confirmed',
        razorpay_payment_id: verify.data.razorpay_payment_id,
      })
      .eq('code', verify.data.bookingCode)
      .eq('razorpay_order_id', verify.data.razorpay_order_id);

    if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 });

    if (admin && target) {
      const { data: payment } = await admin
        .from('payments')
        .update({ status: 'succeeded', provider_payment_id: verify.data.razorpay_payment_id })
        .eq('provider_order_id', verify.data.razorpay_order_id)
        .select('id')
        .maybeSingle();
      await logEvent(admin, target.id, 'payment.succeeded',
        { reference: verify.data.razorpay_payment_id, provider: 'razorpay' }, payment?.id ?? null);
      await logEvent(admin, target.id, 'booking.confirmed', { status: 'confirmed' }, payment?.id ?? null);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
}
