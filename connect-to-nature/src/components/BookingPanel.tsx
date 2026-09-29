'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';
import { useIntl } from '@/i18n/provider';
import { Sheet } from './ui/Sheet';
import { Field } from './ui/Field';
import type { ItineraryItem, Listing, PaymentMethod } from '@/lib/types';
import { PLATFORM_FEE_RATE, RAZORPAY_KEY_ID } from '@/lib/env';
import { PAYMENT_METHODS, type CheckoutEvent } from '@/lib/payments';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { usePaymentFormat } from './payments/PaymentLog';

interface BookingResult {
  code: string;
  demo: boolean;
}

/* Test mode, until Razorpay keys are added: a booking the server has already
   confirmed, waiting on a payment that moves no money but is recorded in full. */
interface PendingPayment {
  code: string;
  amount: number;
}

interface TestPayment {
  reference: string;
  method: PaymentMethod;
  created_at: string;
  stored: boolean;
}

/* The shortest a payment is allowed to look. A request that answers in 40ms
   makes "processing" flash past too fast to read, and a payment that seems to
   happen instantly reads as one that did not happen at all. */
const MIN_PROCESSING_MS = 1100;

function logCheckout(code: string, event: CheckoutEvent, method?: PaymentMethod) {
  void fetch('/api/payments/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'event', bookingCode: code, event, method }),
    keepalive: true,
  }).catch(() => {});
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

export function BookingPanel({
  listing,
  packageSlug,
  itinerary,
  variant = 'card',
}: {
  listing: Listing;
  packageSlug?: string;
  itinerary?: ItineraryItem[];
  variant?: 'card' | 'inline';
}) {
  const { t, tx, money, locale } = useIntl();
  const [guests, setGuests] = useState(2);
  const [startDate, setStartDate] = useState(tomorrow());
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [pending, setPending] = useState<PendingPayment | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [paying, setPaying] = useState(false);
  const [payment, setPayment] = useState<TestPayment | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', note: '' });
  const reduced = useReducedMotion();
  const { when, methodLabel } = usePaymentFormat();

  const total = listing.base_price * guests;
  const fee = Math.round(total * PLATFORM_FEE_RATE);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingSlug: listing.slug,
          packageSlug,
          startDate,
          guests,
          name: form.name,
          phone: form.phone,
          note: form.note || undefined,
          language: locale,
          itinerary,
        }),
      });

      const payload = await response.json();

      if (response.status === 401) {
        setError(t('booking.signInFirst'));
        return;
      }
      if (!response.ok) {
        setError(t('common.error'));
        return;
      }

      const code: string = payload.booking.code;

      // A configured gateway takes over here; otherwise the booking is already
      // confirmed and marked as a demo by the API.
      if (!payload.demo) {
        const ready = await loadRazorpay();
        const orderResponse = await fetch('/api/payments/razorpay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'order', bookingCode: code }),
        });
        if (ready && orderResponse.ok && window.Razorpay) {
          const order = await orderResponse.json();
          const checkout = new window.Razorpay({
            key: order.keyId,
            amount: order.amount,
            currency: 'INR',
            name: tx(listing.host?.farm_name),
            description: tx(listing.title),
            order_id: order.orderId,
            prefill: { name: form.name, contact: form.phone },
            theme: { color: '#157f5f' },
            handler: async (response: Record<string, string>) => {
              await fetch('/api/payments/razorpay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verify', bookingCode: code, ...response }),
              });
              setResult({ code, demo: false });
            },
          });
          checkout.open();
          return;
        }
        // A gateway is configured but its checkout would not open: the booking
        // exists and is waiting on payment, which is what the result says.
        setResult({ code, demo: false });
        return;
      }

      // No gateway: the booking is confirmed, and the test payment step takes
      // over from here.
      setPending({ code, amount: Number(payload.booking.total_amount ?? total) });
      logCheckout(code, 'checkout.opened');
    } catch {
      setError(t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  function choose(next: PaymentMethod) {
    setMethod(next);
    if (pending) logCheckout(pending.code, 'checkout.method_selected', next);
  }

  async function pay() {
    if (!pending) return;
    setPaying(true);
    setError(null);
    const started = Date.now();
    try {
      const response = await fetch('/api/payments/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pay', bookingCode: pending.code, method }),
      });
      const body = await response.json().catch(() => null);
      const wait = MIN_PROCESSING_MS - (Date.now() - started);
      if (wait > 0 && !reduced) await new Promise((resolve) => setTimeout(resolve, wait));
      if (!response.ok || !body?.payment) {
        setError(t('booking.payFailed'));
        return;
      }
      setPayment({
        reference: body.payment.reference,
        method: body.payment.method ?? method,
        created_at: body.payment.created_at,
        stored: Boolean(body.stored),
      });
    } catch {
      setError(t('booking.payFailed'));
    } finally {
      setPaying(false);
    }
  }

  function close() {
    // Walking away from the payment step is worth a line in the log too.
    if (pending && !payment) logCheckout(pending.code, 'checkout.cancelled');
    setOpen(false);
    setResult(null);
    setPending(null);
    setPayment(null);
    setError(null);
  }

  const stage = payment ? 'paid' : pending ? 'pay' : result ? 'result' : 'form';
  const sheetTitle =
    stage === 'paid' ? t('booking.paid')
    : stage === 'pay' ? t('booking.payTitle')
    : stage === 'result' ? t('booking.success')
    : `${t('booking.title')} ${tx(listing.host?.farm_name)}`;

  const rows = (
    <>
      <div className="flex items-baseline justify-between">
        <span className="text-[26px] font-semibold tracking-tight">{money(listing.base_price)}</span>
        <span className="text-[13px] text-[var(--color-muted)]">{t('common.perPersonTwoDays')}</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Field label={t('booking.startDate')}>
          <input
            type="date"
            className="field"
            value={startDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </Field>
        <Field label={t('booking.guests')}>
          <div className="flex items-center gap-3">
            <button type="button" className="btn btn-ghost h-11 w-11 p-0 text-lg" onClick={() => setGuests((n) => Math.max(1, n - 1))} aria-label="-">−</button>
            <span className="min-w-8 text-center text-lg tabular-nums">{guests}</span>
            <button type="button" className="btn btn-ghost h-11 w-11 p-0 text-lg" onClick={() => setGuests((n) => Math.min(listing.max_guests, n + 1))} aria-label="+">+</button>
          </div>
        </Field>
      </div>

      <dl className="mt-5 space-y-2 border-t border-[var(--color-line)] pt-4 text-[14px]">
        <div className="flex justify-between">
          <dt className="text-[var(--color-muted)]">{t('booking.stay')} × {guests}</dt>
          <dd className="tabular-nums">{money(total)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[var(--color-muted)]">{t('booking.fee')}</dt>
          <dd className="tabular-nums text-[var(--color-muted)]">{money(fee)}</dd>
        </div>
        <div className="flex justify-between font-medium">
          <dt>{t('booking.total')}</dt>
          <dd className="tabular-nums">{money(total)}</dd>
        </div>
        <div className="flex justify-between text-[13px] text-[var(--color-leaf)]">
          <dt>{t('booking.farmerGets')}</dt>
          <dd className="tabular-nums">{money(total - fee)}</dd>
        </div>
      </dl>

      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary mt-5 w-full py-3.5">
        {t('listing.book')}
      </button>
      <p className="mt-3 text-center text-[12px] text-[var(--color-muted)]">{t('listing.farmerKeeps')}</p>
    </>
  );

  return (
    <>
      {variant === 'card' ? <div className="card p-6">{rows}</div> : <div>{rows}</div>}

      <Sheet
        open={open}
        onClose={close}
        title={sheetTitle}
        closeLabel={t('common.close')}
      >
        {stage === 'paid' && payment && pending ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <SuccessMark reduced={reduced} />
            <p className="mt-5 text-center text-[28px] font-semibold tabular-nums tracking-tight">{money(pending.amount)}</p>
            <p className="mx-auto mt-2 max-w-sm text-center text-[14px] leading-relaxed text-[var(--color-muted)]">
              {t('booking.paidBody', {
                amount: money(pending.amount),
                method: methodLabel(payment.method),
                host: tx(listing.host?.host_name),
                phone: form.phone,
              })}
            </p>

            <dl className="mt-6 divide-y divide-[var(--color-line)] rounded-2xl bg-[var(--color-surface-2)] px-4 text-[14px]">
              {[
                [t('booking.paymentRef'), payment.reference],
                [t('booking.bookingRef'), pending.code],
                [t('payments.method'), methodLabel(payment.method)],
                [t('booking.paidAt'), when(payment.created_at, true)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-[var(--color-muted)]">{label}</dt>
                  <dd className="font-medium tracking-wide tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-3 text-center text-[12px] text-[var(--color-muted)]">
              {t('booking.testMode')}{payment.stored ? '' : ` · ${t('booking.notStored')}`}
            </p>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <Link href="/trips" onClick={close} className="btn btn-outline">{t('booking.history')}</Link>
              <button type="button" onClick={close} className="btn btn-primary">{t('common.close')}</button>
            </div>
          </motion.div>
        ) : stage === 'pay' && pending ? (
          <div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[13px] text-[var(--color-muted)]">{t('booking.bookingRef')} · {pending.code}</p>
                <p className="mt-1 text-[30px] font-semibold tabular-nums tracking-tight">{money(pending.amount)}</p>
              </div>
              <span className="mb-2 rounded-full bg-[color-mix(in_srgb,var(--color-sun)_20%,transparent)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-clay)]">
                {t('booking.testMode')}
              </span>
            </div>

            <p className="mt-6 text-[13px] font-medium text-[var(--color-muted)]">{t('booking.payWith')}</p>
            <div role="radiogroup" aria-label={t('booking.payWith')} className="mt-2 grid gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={method === m}
                  disabled={paying}
                  onClick={() => choose(m)}
                  className={clsx(
                    'flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-[border-color,background-color,box-shadow] duration-300',
                    method === m
                      ? 'border-[var(--color-leaf)] bg-[var(--color-leaf-soft)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-leaf)_14%,transparent)]'
                      : 'border-[var(--color-line-strong)] hover:bg-[color-mix(in_srgb,var(--color-ink)_4%,transparent)]',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={clsx(
                      'grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors',
                      method === m ? 'border-[var(--color-leaf)]' : 'border-[var(--color-line-strong)]',
                    )}
                  >
                    {method === m && <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-leaf)]" />}
                  </span>
                  <span className="flex-1">
                    <span className="block text-[15px] font-medium">{t(`booking.${m}`)}</span>
                    <span className="block text-[12px] text-[var(--color-muted)]">{t(`booking.${m}Sub`)}</span>
                  </span>
                </button>
              ))}
            </div>

            {error && <p role="alert" className="mt-4 text-[13px] text-[var(--color-clay)]">{error}</p>}

            <button type="button" onClick={pay} disabled={paying} className="btn btn-primary mt-6 w-full py-3.5">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={paying ? 'paying' : 'pay'}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="inline-flex items-center gap-2"
                >
                  {paying && (
                    <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  )}
                  {paying ? t('booking.paying') : t('booking.payAmount', { amount: money(pending.amount) })}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        ) : result ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <p className="text-[15px] leading-relaxed">
              {t('booking.successBody', {
                host: tx(listing.host?.host_name),
                phone: form.phone,
              })}
            </p>
            <p className="mt-4 rounded-2xl bg-[var(--color-surface-2)] px-4 py-3 text-[14px]">
              {t('booking.ref')} · <span className="font-semibold tracking-wide">{result.code}</span>
            </p>
            {result.demo && (
              <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-muted)]">{t('booking.demoNote')}</p>
            )}
            <button type="button" onClick={close} className="btn btn-primary mt-6 w-full">
              {t('common.close')}
            </button>
          </motion.div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Field label={t('booking.name')}>
              <input required className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
            </Field>
            <Field label={t('booking.phone')}>
              <input required type="tel" className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" inputMode="tel" />
            </Field>
            <Field label={t('booking.note')}>
              <textarea rows={3} className="field resize-none" placeholder={t('booking.notePlaceholder')} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </Field>

            <dl className="space-y-1.5 rounded-2xl bg-[var(--color-surface-2)] p-4 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-[var(--color-muted)]">{startDate} · {guests} {t('common.guests')}</dt>
                <dd className="font-medium tabular-nums">{money(total)}</dd>
              </div>
              <div className="flex justify-between text-[13px] text-[var(--color-leaf)]">
                <dt>{t('booking.farmerGets')}</dt>
                <dd className="tabular-nums">{money(total - fee)}</dd>
              </div>
            </dl>

            {error && <p className="text-[13px] text-[var(--color-clay)]">{error}</p>}

            <button type="submit" disabled={busy} className="btn btn-primary w-full py-3.5">
              {busy ? t('booking.processing') : RAZORPAY_KEY_ID ? t('booking.pay') : t('booking.continue')}
            </button>
          </form>
        )}
      </Sheet>
    </>
  );
}

/* The tick on the success screen: the circle closes, then the check is drawn
   through it. Reduced motion gets it already drawn. */
function SuccessMark({ reduced }: { reduced: boolean }) {
  const draw = (delay: number) =>
    reduced
      ? { initial: false as const }
      : {
          initial: { pathLength: 0 },
          animate: { pathLength: 1 },
          transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] as const },
        };
  return (
    <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[var(--color-leaf-soft)] text-[var(--color-leaf)]">
      <svg viewBox="0 0 52 52" width="56" height="56" aria-hidden="true">
        <motion.circle cx="26" cy="26" r="22" fill="none" stroke="currentColor" strokeWidth="3" {...draw(0)} />
        <motion.path
          d="M16 27 l7 7 l14 -15"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...draw(0.35)}
        />
      </svg>
    </div>
  );
}
