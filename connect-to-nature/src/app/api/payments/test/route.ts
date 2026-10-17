import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { isRazorpayConfigured, isSupabaseConfigured } from '@/lib/env';
import { CHECKOUT_EVENTS, PAYMENT_METHODS } from '@/lib/payments';

/* Test-mode payments, for as long as Razorpay is not configured.

   POST { action: 'event', bookingCode, event, method? }  → one line in the checkout log
   POST { action: 'pay', bookingCode, method }            → a successful test payment

   Nothing moves money. What this does do is leave the same trail a real
   payment will: a payment row with an amount, a method and a reference, and a
   log of every step. Both writes go through database functions that check the
   booking is the caller's and that the server itself marked it as a test
   booking, so this route cannot be used to mark a real booking paid — and it
   refuses outright once a gateway is configured. */

const EventInput = z.object({
  action: z.literal('event'),
  bookingCode: z.string().min(4).max(40),
  event: z.enum(CHECKOUT_EVENTS),
  method: z.enum(PAYMENT_METHODS as [string, ...string[]]).optional(),
});

const PayInput = z.object({
  action: z.literal('pay'),
  bookingCode: z.string().min(4).max(40),
  method: z.enum(PAYMENT_METHODS as [string, ...string[]]),
});

const STATUS_FOR: Record<string, number> = {
  auth_required: 401,
  booking_not_found: 404,
  not_a_test_booking: 409,
  unknown_event: 400,
  unknown_method: 400,
};

function failure(message: string | undefined) {
  const code = message && message in STATUS_FOR ? message : 'payment_failed';
  return NextResponse.json({ error: code }, { status: STATUS_FOR[code] ?? 500 });
}

export async function POST(request: Request) {
  if (isRazorpayConfigured) {
    return NextResponse.json({ error: 'gateway_configured' }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const event = EventInput.safeParse(body);
  const pay = PayInput.safeParse(body);
  if (!event.success && !pay.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  /* No database: the site is running on seed content and stores nothing, so
     the payment is described rather than recorded — and says so. */
  if (!isSupabaseConfigured) {
    if (event.success) return NextResponse.json({ ok: true, stored: false });
    return NextResponse.json({
      stored: false,
      payment: {
        reference: `TEST-${randomBytes(5).toString('hex').toUpperCase()}`,
        method: pay.data!.method,
        status: 'succeeded',
        provider: 'test',
        created_at: new Date().toISOString(),
      },
    });
  }

  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  if (event.success) {
    const { error } = await supabase.rpc('log_checkout_event', {
      booking_code: event.data.bookingCode,
      event_name: event.data.event,
      pay_method: event.data.method ?? null,
    });
    return error ? failure(error.message) : NextResponse.json({ ok: true, stored: true });
  }

  const { data, error } = await supabase.rpc('record_test_payment', {
    booking_code: pay.data!.bookingCode,
    pay_method: pay.data!.method,
  });
  if (error || !data) return failure(error?.message);
  return NextResponse.json({ stored: true, payment: data });
}
