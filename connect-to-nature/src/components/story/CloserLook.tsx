'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import clsx from 'clsx';
import { useIntl } from '@/i18n/provider';
import { PHOTOS } from '@/lib/photo-credits';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { Photo } from '../ui/Photo';
import { Reveal } from '../ui/Reveal';

/* "Take a closer look": one large picture with a column of glass pills over
 * it. Each pill opens — the pill itself grows into the panel, by shared
 * layout, rather than a panel appearing somewhere else — to a line or two
 * about one part of a stay, and the picture changes to match. The first pill
 * is the product page's colour picker: two swatches that switch the whole
 * view between the two vibhags.
 *
 * Only the photograph being shown is mounted, with the previous one kept just
 * long enough to crossfade out. Stacking all nine in the frame would make the
 * section fetch all nine the moment it came near the screen. */

type Vibhag = 'kokan' | 'nashik';

const VIBHAG_PHOTO: Record<Vibhag, string> = { kokan: 'palm-paddy', nashik: 'koroli-valley' };
const SWATCH: Record<Vibhag, string> = { kokan: '#1f8a70', nashik: '#6d4bb5' };

const ITEMS = [
  { key: 'vibhag', photo: null },
  { key: 'land', photo: 'sugarcane-village' },
  { key: 'house', photo: 'pabhare-house' },
  { key: 'food', photo: 'vengurla-cashew' },
  { key: 'water', photo: 'green-lush' },
  { key: 'checked', photo: 'targaon-farmland' },
  { key: 'pay', photo: 'paddy-harvest' },
] as const;

const SPRING = { type: 'spring', stiffness: 380, damping: 38, mass: 0.9 } as const;

export function CloserLook() {
  const { t, tx } = useIntl();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState<number | null>(null);
  const [vibhag, setVibhag] = useState<Vibhag>('kokan');

  const transition = reduced ? { duration: 0 } : SPRING;
  const item = open === null ? null : ITEMS[open];
  const photo = PHOTOS[item?.photo ?? VIBHAG_PHOTO[vibhag]];

  useEffect(() => {
    if (open === null) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const step = (by: number) => setOpen((i) => ((i ?? 0) + by + ITEMS.length) % ITEMS.length);

  return (
    <section id="look" data-tone="dark" aria-label={t('story.look.label')} className="mx-auto max-w-6xl scroll-mt-16 px-4 py-24 sm:px-6 sm:py-32">
      <Reveal>
        <h2 className="text-[clamp(2rem,5.2vw,3.5rem)] font-semibold leading-[1.06] tracking-[-0.03em]">
          {t('story.look.title')}
        </h2>
      </Reveal>

      <div className="relative mt-10 sm:mt-14">
        {/* The stage. */}
        <div className="relative aspect-square overflow-hidden rounded-[28px] bg-[var(--color-surface)] sm:aspect-[16/10] lg:aspect-[16/9]">
          <AnimatePresence initial={false}>
            {photo && (
              <motion.div
                key={photo.id}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: reduced ? 1 : 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
              >
                <Photo photo={photo} sizes="(min-width: 1152px) 1104px, 100vw" className="h-full w-full" />
              </motion.div>
            )}
          </AnimatePresence>
          {/* Darkens the side the controls sit on, and the corner the place
              name sits in, without dimming the picture as a whole. */}
          <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-black/55 via-black/10 to-transparent md:block" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
          {photo && (
            <span className="absolute bottom-5 right-6 text-[11px] font-medium text-white/75 [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]">
              {tx(photo.where)}
            </span>
          )}
        </div>

        {/* The controls: floating over the picture from md up, underneath it
            on a phone. On a phone the close button and the arrows share one
            row above the panel, so the arrows stay on screen with the picture
            they change instead of sitting below the fold. */}
        <LayoutGroup>
          <div className="mt-4 flex flex-wrap items-center gap-3 md:absolute md:inset-y-0 md:left-8 md:mt-0 md:flex-col md:flex-nowrap md:items-start md:justify-center">
            {item ? (
              <>
                <motion.button
                  layout
                  transition={transition}
                  type="button"
                  onClick={() => setOpen(null)}
                  aria-label={t('story.look.close')}
                  className="order-1 grid h-11 w-11 place-items-center rounded-full bg-[rgba(42,42,45,0.72)] text-white backdrop-blur-xl transition-colors hover:bg-[rgba(66,66,69,0.8)]"
                >
                  <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
                    <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </motion.button>

                <motion.div
                  layoutId={`look-${item.key}`}
                  transition={transition}
                  id="look-panel"
                  role="region"
                  aria-live="polite"
                  className="order-3 w-full overflow-hidden rounded-[28px] md:order-2 md:max-w-[22rem] bg-[rgba(42,42,45,0.72)] p-6 text-white backdrop-blur-xl sm:p-7"
                  style={{ borderRadius: 28 }}
                >
                  <motion.div
                    key={item.key}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: reduced ? 0 : 0.35, delay: reduced ? 0 : 0.12 }}
                  >
                    <p className="text-[17px] leading-snug text-white/80">
                      <strong className="font-semibold text-white">{t(`story.look.${item.key}.title`)}</strong>{' '}
                      {t(`story.look.${item.key}.body`)}
                    </p>

                    {item.key === 'vibhag' && (
                      <div className="mt-5">
                        <div role="radiogroup" aria-label={t('story.look.vibhag.label')} className="flex items-center gap-3">
                          {(Object.keys(SWATCH) as Vibhag[]).map((v) => (
                            <button
                              key={v}
                              type="button"
                              role="radio"
                              aria-checked={vibhag === v}
                              aria-label={t(`story.look.vibhag.${v}`)}
                              onClick={() => setVibhag(v)}
                              className={clsx(
                                'h-8 w-8 rounded-full ring-offset-2 ring-offset-[#2a2a2d] transition-shadow duration-300',
                                vibhag === v ? 'ring-2 ring-white' : 'ring-0 hover:ring-1 hover:ring-white/50',
                              )}
                              style={{ background: SWATCH[v] }}
                            />
                          ))}
                        </div>
                        <p className="mt-3 text-[13px] text-white/65">
                          {t('story.look.showing', { name: t(`story.look.vibhag.${vibhag}`) })}
                        </p>
                      </div>
                    )}
                  </motion.div>
                </motion.div>

                <motion.div layout transition={transition} className="order-2 ml-auto flex gap-2 md:order-3 md:ml-0">
                  {[
                    { by: -1, label: t('story.look.prev'), d: 'M13 16L7 10l6-6' },
                    { by: 1, label: t('story.look.next'), d: 'M7 4l6 6-6 6' },
                  ].map((b) => (
                    <button
                      key={b.by}
                      type="button"
                      onClick={() => step(b.by)}
                      aria-label={b.label}
                      className="grid h-11 w-11 place-items-center rounded-full bg-[rgba(42,42,45,0.72)] text-white backdrop-blur-xl transition-colors hover:bg-[rgba(66,66,69,0.8)]"
                    >
                      <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                        <path d={b.d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  ))}
                </motion.div>
              </>
            ) : (
              <div className="flex w-full gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] md:flex-col md:items-start md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
                {ITEMS.map((it, i) => (
                  <motion.button
                    key={it.key}
                    layoutId={`look-${it.key}`}
                    transition={transition}
                    type="button"
                    onClick={() => setOpen(i)}
                    aria-expanded={false}
                    aria-controls="look-panel"
                    className="group flex h-14 shrink-0 items-center gap-3 rounded-full bg-[rgba(42,42,45,0.72)] pl-2.5 pr-6 text-white backdrop-blur-xl transition-colors hover:bg-[rgba(66,66,69,0.8)]"
                    style={{ borderRadius: 999 }}
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full border border-white/70 transition-transform duration-300 group-hover:scale-110">
                      <svg viewBox="0 0 20 20" width="12" height="12" aria-hidden="true">
                        <path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                      </svg>
                    </span>
                    <span className="whitespace-nowrap text-[17px] font-semibold tracking-[-0.01em]">
                      {t(`story.look.${it.key}.label`)}
                    </span>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </LayoutGroup>
      </div>
    </section>
  );
}
