'use client';

import Link from 'next/link';
import { useIntl } from '@/i18n/provider';
import { Reveal } from './ui/Reveal';
import { Scene } from './Scene';
import type { Region } from '@/lib/types';
import { revealDelay } from '@/lib/stagger';

/* Regions come out of the regions table, not out of the code — an admin can add
   a third vibhag and this section grows a card. */
export function RegionCards({ regions }: { regions: Region[] }) {
  const { t, tx } = useIntl();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {regions.map((region, index) => (
        <Reveal key={region.id} delay={revealDelay(index)}>
          <article className="card card-hover h-full overflow-hidden">
            <div className="relative aspect-[16/7] overflow-hidden">
              <Scene scene={region.hero_scene} seed={region.slug} className="h-full w-full" />
            </div>
            <div className="p-6 sm:p-7">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold tracking-tight">{tx(region.name)}</h3>
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                  style={{ background: `color-mix(in srgb, ${region.accent} 14%, transparent)`, color: region.accent }}
                >
                  {region.listing_count ?? 0} {t('regions.farms')}
                </span>
              </div>
              <p className="mt-2 text-[15px] text-[var(--color-ink-2)]">{tx(region.tagline)}</p>
              <p className="mt-3 text-[14px] leading-relaxed text-[var(--color-muted)]">{tx(region.description)}</p>

              <dl className="mt-5 grid gap-3 text-[13px] sm:grid-cols-2">
                <div>
                  <dt className="text-[var(--color-muted)]">{t('regions.districts')}</dt>
                  <dd className="mt-1">{(region.districts ?? []).map((d) => tx(d)).join(' · ')}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-muted)]">{t('regions.season')}</dt>
                  <dd className="mt-1">{tx(region.season)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[var(--color-muted)]">{t('regions.reach')}</dt>
                  <dd className="mt-1">{tx(region.reach)}</dd>
                </div>
              </dl>

              <Link href={`/explore?region=${region.slug}`} className="btn btn-outline mt-6 text-sm">
                {t('regions.browse')}
              </Link>
            </div>
          </article>
        </Reveal>
      ))}
    </div>
  );
}
