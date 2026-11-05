'use client';

import { useIntl } from '@/i18n/provider';
import { Photo, PhotoCredit } from './ui/Photo';
import { Reveal } from './ui/Reveal';
import { PHOTOS, REEL } from '@/lib/photo-credits';
import { revealDelay } from '@/lib/stagger';

/* Who took the pictures.
 *
 * Two things this page has to be straight about. The photographers licensed
 * their work for reuse and are owed their names — that is the licence. And the
 * farms are written for the demo while the landscapes are real, so a picture
 * filed under a farm in Pawas may have been taken in Vengurla; saying where
 * each one is actually from is the only way the rest of the site stays
 * truthful. */
export function CreditsList() {
  const { t, tx } = useIntl();
  const all = Object.values(PHOTOS);
  const reel = new Set(REEL);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6">
      <Reveal>
        <header className="max-w-2xl">
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-2)]">
            {t('credits.eyebrow')}
          </p>
          <h1 className="mt-3 text-[clamp(1.9rem,4.4vw,2.8rem)] font-semibold leading-tight tracking-[-0.03em]">
            {t('credits.title')}
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--color-ink-2)]">{t('credits.intro')}</p>
          <p className="mt-3 text-[14px] leading-relaxed text-[var(--color-muted)]">{t('credits.placeNote')}</p>
        </header>
      </Reveal>

      <div className="mt-10 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {all.map((photo, index) => (
          <Reveal key={photo.id} delay={revealDelay(index)}>
            <figure>
              <Photo
                photo={photo}
                sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                className="aspect-[16/10] w-full rounded-[18px]"
                rounded
              />
              <figcaption className="mt-3">
                <p className="text-[14px] leading-snug">{tx(photo.alt)}</p>
                <PhotoCredit photo={photo} className="mt-1.5 block" />
                {reel.has(photo.id) && (
                  <p className="mt-1.5 text-[11px] text-[var(--color-muted)]">{t('credits.inReel')}</p>
                )}
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
