import type { Booking, Payment, PaymentEvent, PaymentMethod } from './types';

/* Everything about payments that both the server and the browser need. */

export const PAYMENT_METHODS: readonly PaymentMethod[] = ['upi', 'card', 'netbanking'];

export const CHECKOUT_EVENTS = ['checkout.opened', 'checkout.method_selected', 'checkout.cancelled'] as const;
export type CheckoutEvent = (typeof CHECKOUT_EVENTS)[number];

/* The events the log can contain, in the order a payment normally produces
   them. The interface names each one from this list, so an event it does not
   know is shown by its raw name rather than dropped. */
export const KNOWN_EVENTS = [
  'booking.created',
  'checkout.opened',
  'checkout.method_selected',
  'checkout.cancelled',
  'payment.order_created',
  'payment.initiated',
  'payment.succeeded',
  'payment.signature_rejected',
  'payment.failed',
  'booking.confirmed',
] as const;

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === 'string' && (PAYMENT_METHODS as readonly string[]).includes(value);
}

/* With no database at all, the whole site runs on seed content and stores
   nothing. These give the demo bookings a payment and a log each, so the
   history screens show what they will look like rather than an empty box. */
export function demoLedger(booking: Booking): { payments: Payment[]; payment_events: PaymentEvent[] } {
  const at = (offsetSeconds: number) =>
    new Date(new Date(booking.created_at).getTime() + offsetSeconds * 1000).toISOString();
  const paymentId = `${booking.id}-pay`;
  const reference = `TEST-${booking.code.replace(/[^A-Z0-9]/g, '').slice(-6)}`;
  const steps: [string, number, Record<string, unknown>, boolean][] = [
    ['booking.created', 0, { code: booking.code, amount: booking.total_amount, guests: booking.guest_count }, false],
    ['checkout.opened', 2, {}, false],
    ['checkout.method_selected', 9, { method: 'upi' }, false],
    ['payment.initiated', 14, { method: 'upi', amount: booking.total_amount, currency: 'INR' }, true],
    ['payment.succeeded', 16, { reference, provider: 'test' }, true],
    ['booking.confirmed', 16, { status: booking.status }, true],
  ];
  return {
    payments: [{
      id: paymentId,
      booking_id: booking.id,
      provider: 'test',
      method: 'upi',
      amount: booking.total_amount,
      currency: 'INR',
      status: 'succeeded',
      reference,
      provider_order_id: null,
      provider_payment_id: null,
      created_at: at(16),
    }],
    payment_events: steps.map(([event, offset, detail, linked], i) => ({
      id: i + 1,
      booking_id: booking.id,
      payment_id: linked ? paymentId : null,
      event,
      detail,
      created_at: at(offset),
    })),
  };
}
