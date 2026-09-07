'use client';

import Link from 'next/link';
import { useIntl } from '@/i18n/provider';
import { Scene } from './Scene';
import { Stars } from './ui/Field';
import type { Listing } from '@/lib/types';
import { DISTRICT_NAMES } from '@/lib/seed-content';

export function ListingCard({ listing, compact = false }: { listing: Listing; compact?: boolean }) {
  const { t, tx, money } = useIntl();
  const photo = listing.photos?.[0];
  // Six activities on a farm are often three kinds of day out; the card shows
  // the kinds, deduplicated, rather than repeating "Walks and climbs" twice.
  const categories = [...new Set((listing.activities ?? []).map((activity) => activity.category))].slice(0, 3);

  return (
    <Link
      href={`/farm/${listing.slug}`}
      className="card card-hover group block overflow-hidden focus-visible:outline-none"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.url}
            alt={tx(photo.alt) || tx(listing.title)}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            style={{ transitionTimingFunction: 'var(--ease-spring)' }}
          />
        ) : (
          <Scene
            scene={listing.scene}
            seed={listing.slug}
            className="h-full w-full transition-transform duration-700 group-hover:scale-[1.04]"
          />
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          <span className="rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
            {tx(listing.region?.name)}
          </span>
          {listing.is_featured && (
            <span className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-medium text-[var(--color-ink)] backdrop-blur-md">
              ★
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold tracking-tight">{tx(listing.host?.farm_name)}</h3>
            <p className="mt-0.5 truncate text-[13px] text-[var(--color-muted)]">
              {tx(listing.village)} · {tx(DISTRICT_NAMES[listing.district]) || listing.district}
            </p>
          </div>
          {listing.review_count > 0 && <Stars rating={listing.rating} />}
        </div>

        {!compact && (
          <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-[var(--color-ink-2)]">
            {tx(listing.title)}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {categories.map((category) => (
            <span
              key={category}
              className="rounded-full bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)] px-2.5 py-1 text-[11px] text-[var(--color-ink-2)]"
            >
              {t(`categories.${category}`)}
            </span>
          ))}
        </div>

        <div className="mt-4 border-t border-[var(--color-line)] pt-4">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[17px] font-semibold">{money(listing.base_price)}</span>
            <span className="text-[12px] text-[var(--color-muted)]">{t('common.perPersonTwoDays')}</span>
            <span className="ml-auto whitespace-nowrap text-[12px] text-[var(--color-muted)]">
              {t('listing.capacity')} {listing.max_guests}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
