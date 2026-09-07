'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useIntl } from '@/i18n/provider';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Pill } from '../ui/Field';
import { Scene } from '../Scene';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import type { HostContext } from '@/lib/host-queries';
import { DISTRICT_NAMES } from '@/lib/seed-content';

type Tab = 'bookings' | 'earnings' | 'calendar' | 'listing';

export function HostDashboard({ context }: { context: HostContext }) {
  const { t, tx, money, date } = useIntl();
  const [tab, setTab] = useState<Tab>('bookings');
  const [dates, setDates] = useState<string[]>(context.openDates);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const { listing, bookings, earnings, demo } = context;

  const bookedDates = bookings
    .filter((booking) => booking.status !== 'cancelled')
    .flatMap((booking) => {
      const out: string[] = [];
      const cursor = new Date(`${booking.start_date}T12:00:00`);
      const end = new Date(`${booking.end_date}T12:00:00`);
      while (cursor < end) {
        out.push(cursor.toISOString().slice(0, 10));
        cursor.setDate(cursor.getDate() + 1);
      }
      return out;
    });

  async function saveDates() {
    if (!listing) return;
    setBusy(true);
    await fetch('/api/host/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: listing.id, dates, isAvailable: true }),
    });
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.7rem,4vw,2.4rem)] font-semibold tracking-[-0.03em]">
            {listing ? tx(listing.host?.farm_name) : t('host.dashboard')}
          </h1>
          {listing && (
            <p className="mt-1 text-[15px] text-[var(--color-muted)]">
              {tx(listing.village)}, {tx(DISTRICT_NAMES[listing.district]) || listing.district} · {t(`status.${listing.status}`)}
            </p>
          )}
        </div>
        {demo && <Pill tone="warn">{t('common.demoBadge')}</Pill>}
      </header>

      <SegmentedControl<Tab>
        value={tab}
        onChange={setTab}
        segments={[
          { value: 'bookings', label: t('host.bookings') },
          { value: 'earnings', label: t('host.earnings') },
          { value: 'calendar', label: t('host.calendar') },
          { value: 'listing', label: t('host.myListing') },
        ]}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8"
        >
          {tab === 'bookings' && (
            bookings.length === 0 ? (
              <p className="card p-7 text-[16px] text-[var(--color-muted)]">{t('host.noBookings')}</p>
            ) : (
              <ul className="space-y-4">
                {bookings.map((booking) => (
                  <li key={booking.id} className="card p-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <Pill tone={booking.status === 'confirmed' ? 'leaf' : 'neutral'}>
                        {t(`status.${booking.status}`)}
                      </Pill>
                      <span className="text-[13px] tracking-wide text-[var(--color-muted)]">{booking.code}</span>
                    </div>
                    <p className="mt-3 text-[19px] font-medium">{booking.guest_name}</p>
                    <p className="mt-1 text-[16px] text-[var(--color-ink-2)]">
                      <a href={`tel:${booking.guest_phone.replace(/\s/g, '')}`} className="underline underline-offset-4">
                        {booking.guest_phone}
                      </a>
                    </p>
                    <p className="mt-2 text-[15px] text-[var(--color-muted)]">
                      {date(booking.start_date)} → {date(booking.end_date)} · {booking.guest_count} {t('common.guests')}
                    </p>
                    {booking.guest_note && (
                      <p className="mt-3 rounded-2xl bg-[var(--color-surface-2)] p-4 text-[15px]">{booking.guest_note}</p>
                    )}
                    <p className="mt-4 text-[17px] font-semibold text-[var(--color-leaf)]">
                      {money(Number(booking.farmer_amount))}
                    </p>
                  </li>
                ))}
              </ul>
            )
          )}

          {tab === 'earnings' && (
            <div className="grid gap-5 sm:grid-cols-3">
              {[
                { label: t('host.earningsMonth'), value: earnings.month },
                { label: t('host.earningsTotal'), value: earnings.total },
                { label: t('host.earningsPending'), value: earnings.pending },
              ].map((stat) => (
                <div key={stat.label} className="card p-6">
                  <p className="text-[14px] text-[var(--color-muted)]">{stat.label}</p>
                  <p className="mt-2 text-[30px] font-semibold tabular-nums tracking-tight">{money(stat.value)}</p>
                </div>
              ))}
              <p className="text-[15px] leading-relaxed text-[var(--color-muted)] sm:col-span-3">
                {t('host.p4sub')}
              </p>
            </div>
          )}

          {tab === 'calendar' && (
            <div className="card p-6 sm:p-8">
              <AvailabilityCalendar
                openDates={dates}
                bookedDates={bookedDates}
                onChange={setDates}
                readOnly={!listing}
              />
              <button type="button" onClick={saveDates} disabled={busy || !listing} className="btn btn-primary mt-6 py-3.5 text-[16px]">
                {busy ? t('common.saving') : saved ? t('common.save') + ' ✓' : t('common.save')}
              </button>
            </div>
          )}

          {tab === 'listing' && listing && (
            <div className="card overflow-hidden">
              <div className="aspect-[16/6]">
                <Scene scene={listing.scene} seed={listing.slug} className="h-full w-full" />
              </div>
              <div className="p-6 sm:p-8">
                <h2 className="text-[22px] font-semibold tracking-tight">{tx(listing.title)}</h2>
                <p className="mt-3 text-[16px] leading-relaxed text-[var(--color-ink-2)]">{tx(listing.description)}</p>
                <dl className="mt-6 grid gap-4 text-[15px] sm:grid-cols-3">
                  <div>
                    <dt className="text-[var(--color-muted)]">{t('host.price')}</dt>
                    <dd className="mt-1 font-medium">{money(listing.base_price)}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-muted)]">{t('host.maxGuests')}</dt>
                    <dd className="mt-1 font-medium">{listing.max_guests}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-muted)]">{t('trips.status')}</dt>
                    <dd className="mt-1 font-medium">{t(`status.${listing.status}`)}</dd>
                  </div>
                </dl>
                <Link href={`/farm/${listing.slug}`} className="btn btn-outline mt-7 py-3.5 text-[16px]">
                  {t('packages.viewFarm')}
                </Link>
              </div>
            </div>
          )}

          {tab === 'listing' && !listing && (
            <div className="card p-7">
              <p className="text-[16px] text-[var(--color-muted)]">{t('host.noBookings')}</p>
              <Link href="/shetkari/onboarding" className="btn btn-primary mt-5 py-3.5 text-[16px]">
                {t('host.start')}
              </Link>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
