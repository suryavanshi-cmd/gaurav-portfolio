'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { useIntl } from '@/i18n/provider';
import { Sheet } from './ui/Sheet';
import { Field } from './ui/Field';
import type { ItineraryItem, Listing } from '@/lib/types';
import { PLATFORM_FEE_RATE } from '@/lib/env';

interface BookingResult {
  code: string;
  demo: boolean;
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
  const [form, setForm] = useState({ name: '', phone: '', note: '' });

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
      }

      setResult({ code, demo: Boolean(payload.demo) });
    } catch {
      setError(t('common.error'));
    } finally {
      setBusy(false);
    }
  }

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
        onClose={() => { setOpen(false); setResult(null); }}
        title={result ? t('booking.success') : `${t('booking.title')} ${tx(listing.host?.farm_name)}`}
        closeLabel={t('common.close')}
      >
        {result ? (
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
            <button type="button" onClick={() => { setOpen(false); setResult(null); }} className="btn btn-primary mt-6 w-full">
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
              {busy ? t('booking.processing') : t('booking.pay')}
            </button>
          </form>
        )}
      </Sheet>
    </>
  );
}
