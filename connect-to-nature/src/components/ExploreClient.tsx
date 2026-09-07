'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useIntl } from '@/i18n/provider';
import { ListingCard } from './ListingCard';
import { SegmentedControl } from './ui/SegmentedControl';
import { Reveal } from './ui/Reveal';
import { filterListings } from '@/lib/filters';
import type { ActivityCategory, Listing, Region } from '@/lib/types';
import { revealDelay } from '@/lib/stagger';

const CATEGORIES: ActivityCategory[] = [
  'farming', 'trekking', 'water', 'food', 'camping', 'culture', 'craft', 'stars',
];

/* Filtering happens in the browser over rows already fetched. The catalogue is
   small enough that a round trip per keystroke would be slower and less
   pleasant than filtering in place, and the same function runs on the server
   for the first paint and for anyone without JavaScript. */
export function ExploreClient({
  listings,
  regions,
  initialRegion,
  initialCategory,
}: {
  listings: Listing[];
  regions: Region[];
  initialRegion?: string;
  initialCategory?: string;
}) {
  const { t, money } = useIntl();
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState(initialRegion ?? 'all');
  const [category, setCategory] = useState(initialCategory ?? '');
  const [guests, setGuests] = useState(2);
  const [maxPrice, setMaxPrice] = useState(3500);
  const [sort, setSort] = useState<'picked' | 'price' | 'rating'>('picked');

  const results = useMemo(
    () =>
      filterListings(listings, {
        query,
        regionSlug: region === 'all' ? undefined : region,
        category: category || undefined,
        guests,
        maxPrice,
        sort,
      }),
    [listings, query, region, category, guests, maxPrice, sort],
  );

  const clear = () => {
    setQuery('');
    setRegion('all');
    setCategory('');
    setGuests(2);
    setMaxPrice(3500);
    setSort('picked');
  };

  return (
    <>
      <div className="sticky top-16 z-30 -mx-4 mb-8 border-b border-[var(--color-line)] px-4 py-4 glass sm:-mx-6 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative min-w-[220px] flex-1">
              <span className="sr-only">{t('explore.searchPlaceholder')}</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('explore.searchPlaceholder')}
                className="field pl-10"
                type="search"
              />
              <svg viewBox="0 0 20 20" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" aria-hidden="true">
                <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M13.5 13.5L18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </label>

            <SegmentedControl
              ariaLabel={t('explore.region')}
              value={region}
              onChange={setRegion}
              segments={[
                { value: 'all', label: t('common.all') },
                ...regions.map((item) => ({ value: item.slug, label: item.slug === 'kokan' ? 'Kokan' : 'Nashik' })),
              ]}
            />

            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as typeof sort)}
              className="field w-auto py-2.5 text-sm"
              aria-label={t('common.sort')}
            >
              <option value="picked">{t('explore.sortPicked')}</option>
              <option value="price">{t('explore.sortPrice')}</option>
              <option value="rating">{t('explore.sortRating')}</option>
            </select>
          </div>

          <div className="scroll-x mt-3 flex items-center gap-2 pb-1">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                className="chip shrink-0"
                data-on={category === item}
                onClick={() => setCategory((current) => (current === item ? '' : item))}
              >
                {t(`categories.${item}`)}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-6 text-[13px] text-[var(--color-muted)]">
            <label className="flex items-center gap-3">
              <span>{t('explore.guests')}</span>
              <input
                type="range" min={1} max={12} value={guests}
                onChange={(event) => setGuests(Number(event.target.value))}
                className="accent-[var(--color-leaf)]"
              />
              <span className="tabular-nums text-[var(--color-ink)]">{guests}</span>
            </label>
            <label className="flex items-center gap-3">
              <span>{t('explore.budget')}</span>
              <input
                type="range" min={1500} max={3500} step={100} value={maxPrice}
                onChange={(event) => setMaxPrice(Number(event.target.value))}
                className="accent-[var(--color-leaf)]"
              />
              <span className="tabular-nums text-[var(--color-ink)]">{money(maxPrice)}</span>
            </label>
            <span className="ml-auto tabular-nums">
              {results.length} {t('explore.results')}
            </span>
            <button type="button" onClick={clear} className="underline underline-offset-4 transition hover:text-[var(--color-ink)] cursor-pointer">
              {t('explore.clearAll')}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {results.length === 0 ? (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="measure py-16 text-[15px] text-[var(--color-muted)]"
          >
            {t('explore.none')}
          </motion.p>
        ) : (
          <motion.div key="grid" layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((listing, index) => (
              <motion.div
                key={listing.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.45, delay: revealDelay(index, 0.04, 0.2), ease: [0.22, 1, 0.36, 1] }}
              >
                <ListingCard listing={listing} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
