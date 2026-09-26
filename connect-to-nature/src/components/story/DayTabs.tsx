'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';
import { useIntl } from '@/i18n/provider';
import { PHOTOS } from '@/lib/photo-credits';
import { Photo } from '../ui/Photo';
import { Reveal } from '../ui/Reveal';

/* Four moments of a farm day behind one row of tabs. Choosing a time
 * crossfades the whole frame to it — the way a camera page lets you step
 * through apertures and watch the same scene change — rather than sliding a
 * carousel along. All four photographs sit stacked in the frame, so a tap is
 * an opacity change and never a network request. */

const STEPS = [
  { key: 't1', photo: 'zarye-mist' },
  { key: 't2', photo: 'mango-laterite-2' },
  { key: 't3', photo: 'hedvi-sunset' },
  { key: 't4', photo: 'pabhare-house' },
] as const;

export function DayTabs() {
  const { t, tx } = useIntl();
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (event: KeyboardEvent) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (active + step + STEPS.length) % STEPS.length;
    setActive(next);
    tabs.current[next]?.focus();
  };

  const current = STEPS[active];
  const photo = PHOTOS[current.photo];

  return (
    <section id="day" data-tone="dark" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-24 sm:px-6 sm:py-32">
      <Reveal>
        <h2 className="text-[clamp(2rem,5.2vw,3.5rem)] font-semibold leading-[1.06] tracking-[-0.03em]">
          {t('story.day.title')}
        </h2>
        <p className="measure mt-4 text-[17px] leading-relaxed text-[var(--color-muted)]">{t('story.day.sub')}</p>
      </Reveal>

      <Reveal delay={0.08}>
        <div
          role="tabpanel"
          id="day-panel"
          aria-labelledby={`day-tab-${active}`}
          className="relative mt-12 aspect-[4/5] overflow-hidden rounded-[28px] bg-[var(--color-surface)] sm:aspect-[16/9]"
        >
          {STEPS.map((step, i) => {
            const p = PHOTOS[step.photo];
            if (!p) return null;
            return (
              <div
                key={step.key}
                aria-hidden={i !== active}
                className={clsx(
                  'absolute inset-0 transition-[opacity,transform] duration-[900ms] ease-[var(--ease-spring)]',
                  i === active ? 'scale-100 opacity-100' : 'scale-[1.04] opacity-0',
                )}
              >
                <Photo photo={p} sizes="(min-width: 1152px) 1104px, 100vw" className="h-full w-full" />
              </div>
            );
          })}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-xl text-white"
              >
                <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-white/70">
                  {t(`story.day.${current.key}.time`)} · {t(`story.day.${current.key}.label`)}
                </p>
                <p className="mt-2 text-[19px] font-semibold leading-snug tracking-[-0.01em] sm:text-[24px]">
                  {t(`story.day.${current.key}.body`)}
                </p>
                {photo && <p className="mt-3 text-[11px] text-white/60">{tx(photo.where)}</p>}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Reveal>

      <div className="mt-8 flex justify-center">
        <div
          role="tablist"
          aria-label={t('story.day.title')}
          onKeyDown={onKey}
          className="relative inline-flex rounded-full bg-white/10 p-1.5 backdrop-blur-xl"
        >
          {STEPS.map((step, i) => {
            const on = i === active;
            return (
              <button
                key={step.key}
                ref={(el) => { tabs.current[i] = el; }}
                id={`day-tab-${i}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls="day-panel"
                tabIndex={on ? 0 : -1}
                onClick={() => setActive(i)}
                className={clsx(
                  'relative z-10 whitespace-nowrap rounded-full px-4 py-2.5 text-[14px] font-medium transition-colors duration-300 sm:px-5',
                  on ? 'text-black' : 'text-white/75 hover:text-white',
                )}
              >
                {on && (
                  <motion.span
                    layoutId="day-tab"
                    className="absolute inset-0 -z-10 rounded-full bg-white"
                    transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                  />
                )}
                {t(`story.day.${step.key}.time`)}
                <span className="hidden sm:inline"> · {t(`story.day.${step.key}.label`)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
