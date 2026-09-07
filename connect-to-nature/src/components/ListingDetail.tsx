'use client';

import Link from 'next/link';
import { useIntl } from '@/i18n/provider';
import { Scene } from './Scene';
import { Stars, Pill } from './ui/Field';
import { Reveal } from './ui/Reveal';
import { BookingPanel } from './BookingPanel';
import { ListingCard } from './ListingCard';
import { CROPS, STAY_TYPES, DISTRICT_NAMES } from '@/lib/seed-content';
import { LOCALE_META, type Locale } from '@/i18n/config';
import type { Listing, Review } from '@/lib/types';

export function ListingDetail({
  listing,
  reviews,
  similar,
}: {
  listing: Listing;
  reviews: Review[];
  similar: Listing[];
}) {
  const { t, tx, money, date, list } = useIntl();
  const months = list('months');
  const photo = listing.photos?.[0];

  return (
    <article className="pb-24">
      <div className="relative h-[52svh] min-h-[340px] overflow-hidden">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt={tx(listing.title)} className="h-full w-full object-cover" />
        ) : (
          <Scene scene={listing.scene} seed={listing.slug} className="h-full w-full" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-canvas)] via-transparent to-transparent" />
      </div>

      {/* The hero's gradient is absolutely positioned, so it paints above
          later siblings that are not. This column has to opt into the same
          layer or the card slides under the picture. */}
      <div className="relative z-10 mx-auto -mt-20 max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="card p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="leaf">✓ {t('listing.verified')}</Pill>
              <Pill>{tx(listing.region?.name)}</Pill>
              <Pill>{tx(STAY_TYPES[listing.stay_type] ?? {})}</Pill>
              {listing.review_count > 0 && <Stars rating={listing.rating} count={listing.review_count} />}
            </div>

            <h1 className="mt-4 text-[clamp(1.7rem,4vw,2.6rem)] font-semibold leading-tight tracking-[-0.03em]">
              {tx(listing.title)}
            </h1>
            <p className="mt-2 text-[15px] text-[var(--color-muted)]">
              {tx(listing.host?.farm_name)} · {tx(listing.village)}, {tx(DISTRICT_NAMES[listing.district]) || listing.district}
            </p>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-12">
            <Reveal>
              <section>
                <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  {t('listing.about')}
                </h2>
                <p className="text-[16px] leading-relaxed text-[var(--color-ink-2)]">{tx(listing.description)}</p>
              </section>
            </Reveal>

            <Reveal>
              <section className="card p-6">
                <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  {t('listing.hostedBy')}
                </h2>
                <p className="text-[17px] font-medium">{tx(listing.host?.host_name)}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-ink-2)]">{tx(listing.host?.bio)}</p>
                <dl className="mt-5 grid gap-4 text-[13px] sm:grid-cols-3">
                  <div>
                    <dt className="text-[var(--color-muted)]">{t('listing.since')}</dt>
                    <dd className="mt-0.5">{listing.host?.hosting_since}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-muted)]">{t('listing.speaks')}</dt>
                    <dd className="mt-0.5">
                      {(listing.host?.languages ?? [])
                        .map((code) => LOCALE_META[code as Locale]?.label ?? code)
                        .join(' · ')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-muted)]">{t('listing.capacity')}</dt>
                    <dd className="mt-0.5">
                      {listing.max_guests} {t('common.guests')} · {listing.bedrooms} {t('host.bedrooms')}
                    </dd>
                  </div>
                </dl>
              </section>
            </Reveal>

            <Reveal>
              <section>
                <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  {t('listing.crops')}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {listing.crops.map((crop) => (
                    <Pill key={crop}>{tx(CROPS[crop] ?? {}) || crop}</Pill>
                  ))}
                </div>
              </section>
            </Reveal>

            <Reveal>
              <section>
                <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  {t('listing.activities')}
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {(listing.activities ?? []).map((activity) => (
                    <li key={activity.id} className="card p-5">
                      <p className="text-[15px] font-medium leading-snug">{tx(activity.name)}</p>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-muted)]">{tx(activity.description)}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <Pill tone="leaf">{t(`categories.${activity.category}`)}</Pill>
                        <Pill>{activity.duration_minutes} min</Pill>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>

            <Reveal>
              <section className="card p-6">
                <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  {t('listing.included')}
                </h2>
                <p className="text-[15px] leading-relaxed text-[var(--color-ink-2)]">{t('listing.includedList')}</p>
                <dl className="mt-5 grid gap-4 text-[13px] sm:grid-cols-2">
                  <div>
                    <dt className="text-[var(--color-muted)]">{t('listing.season')}</dt>
                    <dd className="mt-0.5">{listing.best_months.map((m) => months[m - 1]).join(' · ')}</dd>
                  </div>
                  {listing.lat && listing.lng && (
                    <div>
                      <dt className="text-[var(--color-muted)]">{t('listing.location')}</dt>
                      <dd className="mt-0.5">
                        <a
                          className="underline underline-offset-4"
                          href={`https://www.google.com/maps?q=${listing.lat},${listing.lng}`}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          {listing.lat.toFixed(3)}, {listing.lng.toFixed(3)}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            </Reveal>

            <Reveal>
              <section>
                <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  {t('listing.reviews')}
                </h2>
                {reviews.length === 0 ? (
                  <p className="text-[14px] text-[var(--color-muted)]">{t('listing.noReviews')}</p>
                ) : (
                  <ul className="space-y-4">
                    {reviews.map((review) => (
                      <li key={review.id} className="card p-5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[14px] font-medium">{review.guest_name ?? '—'}</span>
                          <Stars rating={review.rating} />
                        </div>
                        <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-ink-2)]">{tx(review.comment)}</p>
                        <p className="mt-2 text-[12px] text-[var(--color-muted)]">{date(review.created_at)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </Reveal>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <BookingPanel listing={listing} />
            <Link href={`/planner?farm=${listing.slug}`} className="btn btn-outline mt-3 w-full">
              {t('listing.planHere')}
            </Link>
            <p className="mt-4 text-center text-[12px] text-[var(--color-muted)]">
              {money(listing.base_price)} {t('common.perPersonTwoDays')}
            </p>
          </aside>
        </div>

        {similar.length > 0 && (
          <section className="mt-20">
            <h2 className="mb-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
              {t('listing.similar')}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((item) => (
                <ListingCard key={item.id} listing={item} compact />
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
