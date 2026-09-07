'use client';

import Link from 'next/link';
import { useIntl } from '@/i18n/provider';
import { Scene } from './Scene';
import type { TripPackage } from '@/lib/types';

export function PackageCard({ pkg }: { pkg: TripPackage }) {
  const { t, tx, money } = useIntl();
  const listing = pkg.listing;

  return (
    <Link href={`/packages/${pkg.slug}`} className="card card-hover group flex flex-col overflow-hidden">
      <div className="relative aspect-[16/9] overflow-hidden">
        <Scene
          scene={listing?.scene ?? pkg.region?.hero_scene ?? 'orchard'}
          seed={pkg.slug}
          className="h-full w-full transition-transform duration-700 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <span className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-medium text-[var(--color-ink)]">
            {tx(pkg.region?.name)}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[17px] font-semibold tracking-tight">{tx(pkg.title)}</h3>
        <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-[var(--color-muted)]">{tx(pkg.summary)}</p>
        <div className="mt-auto flex items-baseline justify-between border-t border-[var(--color-line)] pt-4">
          <span className="text-[12px] text-[var(--color-muted)]">
            {pkg.itinerary.length} · {t('packages.dayPlan')}
          </span>
          <span>
            <span className="text-[12px] text-[var(--color-muted)]">{t('common.from')} </span>
            <span className="text-[17px] font-semibold">{money(pkg.price_per_person)}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
