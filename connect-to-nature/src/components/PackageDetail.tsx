'use client';

import Link from 'next/link';
import { useIntl } from '@/i18n/provider';
import { Scene } from './Scene';
import { Itinerary } from './Itinerary';
import { BookingPanel } from './BookingPanel';
import { Pill } from './ui/Field';
import { Reveal } from './ui/Reveal';
import type { TripPackage } from '@/lib/types';

export function PackageDetail({ pkg }: { pkg: TripPackage }) {
  const { t, tx, money } = useIntl();
  const listing = pkg.listing;

  return (
    <article className="pb-24">
      <div className="relative h-[46svh] min-h-[300px] overflow-hidden">
        <Scene scene={listing?.scene ?? pkg.region?.hero_scene ?? 'orchard'} seed={pkg.slug} className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-canvas)] via-transparent to-transparent" />
      </div>

      <div className="relative z-10 mx-auto -mt-16 max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="card p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="grape">{tx(pkg.region?.name)}</Pill>
              <Pill>{pkg.duration_days} {t('common.day')}</Pill>
              <Pill tone="leaf">{money(pkg.price_per_person)} {t('common.perPerson')}</Pill>
            </div>
            <h1 className="mt-4 text-[clamp(1.7rem,4vw,2.6rem)] font-semibold leading-tight tracking-[-0.03em]">
              {tx(pkg.title)}
            </h1>
            <p className="measure mt-3 text-[16px] leading-relaxed text-[var(--color-ink-2)]">{tx(pkg.summary)}</p>
            {listing && (
              <Link href={`/farm/${listing.slug}`} className="btn btn-outline mt-5 text-sm">
                {t('packages.viewFarm')} · {tx(listing.host?.farm_name)}
              </Link>
            )}
          </div>
        </Reveal>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <section>
            <h2 className="mb-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
              {t('packages.dayPlan')}
            </h2>
            <Itinerary items={pkg.itinerary} />
          </section>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            {listing ? (
              <BookingPanel listing={listing} packageSlug={pkg.slug} itinerary={pkg.itinerary} />
            ) : (
              <div className="card p-6 text-[14px] text-[var(--color-muted)]">{t('common.error')}</div>
            )}
          </aside>
        </div>
      </div>
    </article>
  );
}
