'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useIntl } from '@/i18n/provider';
import { Scene } from './Scene';
import { Pill, Field } from './ui/Field';
import { SegmentedControl } from './ui/SegmentedControl';
import type { Booking } from '@/lib/types';

export function TripsClient({ bookings, demo }: { bookings: Booking[]; demo: boolean }) {
  const { t, tx, money, date } = useIntl();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const today = new Date().toISOString().slice(0, 10);

  const shown = bookings.filter((booking) =>
    tab === 'upcoming' ? booking.end_date >= today : booking.end_date < today,
  );

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-12 sm:px-6">
      <h1 className="text-[clamp(1.9rem,4.4vw,2.6rem)] font-semibold tracking-[-0.03em]">{t('trips.title')}</h1>

      <div className="mt-6">
        <SegmentedControl
          value={tab}
          onChange={setTab}
          segments={[
            { value: 'upcoming', label: t('trips.upcoming') },
            { value: 'past', label: t('trips.past') },
          ]}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 space-y-4"
        >
          {shown.length === 0 ? (
            <div className="card p-8">
              <p className="text-[15px] text-[var(--color-muted)]">{t('trips.none')}</p>
              <Link href="/explore" className="btn btn-primary mt-5">{t('trips.browse')}</Link>
            </div>
          ) : (
            shown.map((booking) => (
              <article key={booking.id} className="card overflow-hidden sm:flex">
                <div className="h-36 w-full shrink-0 sm:h-auto sm:w-56">
                  <Scene
                    scene={booking.listing?.scene ?? 'orchard'}
                    seed={booking.listing?.slug ?? booking.code}
                    className="h-full w-full"
                  />
                </div>
                <div className="flex-1 p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={booking.status === 'confirmed' ? 'leaf' : 'neutral'}>
                      {t(`status.${booking.status}`)}
                    </Pill>
                    <Pill tone={booking.payment_status === 'paid' ? 'leaf' : 'warn'}>
                      {t(`status.${booking.payment_status}`)}
                    </Pill>
                    <span className="text-[12px] tracking-wide text-[var(--color-muted)]">{booking.code}</span>
                  </div>

                  <h2 className="mt-3 text-[17px] font-semibold tracking-tight">
                    {tx(booking.listing?.host?.farm_name) || booking.listing_id}
                  </h2>
                  <p className="mt-1 text-[14px] text-[var(--color-muted)]">
                    {date(booking.start_date)} → {date(booking.end_date)} · {booking.guest_count} {t('common.guests')}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="text-[15px] font-semibold tabular-nums">{money(booking.total_amount)}</span>
                    {booking.listing && (
                      <Link href={`/farm/${booking.listing.slug}`} className="btn btn-ghost text-[13px]">
                        {t('packages.viewFarm')}
                      </Link>
                    )}
                  </div>

                  {booking.status === 'completed' && (
                    <ReviewForm booking={booking} demo={demo} />
                  )}
                </div>
              </article>
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ReviewForm({ booking, demo }: { booking: Booking; demo: boolean }) {
  const { t, locale } = useIntl();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (done) {
    return <p className="mt-4 text-[13px] text-[var(--color-leaf)]">{t('trips.reviewThanks')}</p>;
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-outline mt-4 text-[13px]">
        {t('trips.writeReview')}
      </button>
    );
  }

  return (
    <form
      className="mt-4 space-y-3 border-t border-[var(--color-line)] pt-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        if (!demo) {
          await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookingId: booking.id,
              listingId: booking.listing_id,
              rating,
              comment,
              language: locale,
            }),
          });
        }
        setBusy(false);
        setDone(true);
      }}
    >
      <Field label={t('trips.rating')}>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              aria-label={`${value}`}
              className="text-2xl leading-none transition-transform hover:scale-110 cursor-pointer"
              style={{ color: value <= rating ? 'var(--color-sun)' : 'var(--color-line-strong)' }}
            >
              ★
            </button>
          ))}
        </div>
      </Field>
      <Field label={t('trips.comment')}>
        <textarea
          required
          rows={3}
          className="field resize-none"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </Field>
      <button type="submit" disabled={busy} className="btn btn-primary text-[13px]">
        {t('trips.submitReview')}
      </button>
    </form>
  );
}
