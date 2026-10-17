'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/lib/useReducedMotion';
import clsx from 'clsx';
import { useIntl } from '@/i18n/provider';
import { PHOTOS } from '@/lib/photo-credits';
import { Photo } from '../ui/Photo';
import { Reveal } from '../ui/Reveal';
import { openFilm } from './Film';

/* "Get the highlights": a row of large photographs that walks itself along
 * while it is on screen, with one control underneath that is both the dots
 * and the clock.
 *
 * The timer is the progress bar. The active dot runs a CSS animation for
 * exactly SLIDE_MS and the gallery advances on its animationend, so pausing is
 * one property — animation-play-state — and there is no interval to drift out
 * of step with what the bar is showing. It pauses itself when scrolled away,
 * stops at the last photograph rather than looping forever, and under reduced
 * motion never plays at all: the dots and a swipe still work. */

const SLIDE_MS = 5200;

const SLIDES = [
  { key: 'mango', photo: 'mango-laterite' },
  { key: 'paddy', photo: 'rice-terraces' },
  { key: 'cove', photo: 'aare-ware' },
  { key: 'falls', photo: 'jawhar-falls' },
  { key: 'vines', photo: 'sula-vineyard' },
  { key: 'lake', photo: 'bhavli-igatpuri' },
] as const;

/* Lines the first card up with the page's content column while letting the
   row run to the edge of the screen. */
const GUTTER = 'max(1rem, calc((100vw - 72rem) / 2 + 1.5rem))';

export function Highlights() {
  const { t, tx } = useIntl();
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [index, setIndex] = useState(0);
  const shown = useRef(0);
  useEffect(() => { shown.current = index; }, [index]);
  const [cycle, setCycle] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [ended, setEnded] = useState(false);
  const [inView, setInView] = useState(false);

  const running = playing && inView && !reduced;
  const last = SLIDES.length - 1;

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scrollToCard = useCallback((next: number) => {
    const row = scroller.current;
    const card = row?.children[next] as HTMLElement | undefined;
    if (!row || !card) return;
    const inset = parseFloat(getComputedStyle(row).paddingLeft) || 0;
    row.scrollTo({ left: card.offsetLeft - inset, behavior: reduced ? 'auto' : 'smooth' });
  }, [reduced]);

  const go = useCallback((next: number) => {
    setIndex(next);
    setCycle((c) => c + 1);
    setEnded(false);
    scrollToCard(next);
  }, [scrollToCard]);

  const advance = () => {
    if (index >= last) {
      setPlaying(false);
      setEnded(true);
      return;
    }
    go(index + 1);
  };

  /* A swipe or a trackpad scroll moves the row by hand; once it comes to rest,
     whichever card is nearest the start becomes the current one. */
  const onScroll = () => {
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const row = scroller.current;
      if (!row) return;
      const inset = parseFloat(getComputedStyle(row).paddingLeft) || 0;
      let nearest = 0;
      let best = Infinity;
      Array.from(row.children).forEach((child, i) => {
        const d = Math.abs((child as HTMLElement).offsetLeft - inset - row.scrollLeft);
        if (d < best) { best = d; nearest = i; }
      });
      if (nearest !== shown.current) {
        setIndex(nearest);
        setCycle((c) => c + 1);
      }
    }, 140);
  };

  useEffect(() => () => clearTimeout(settle.current), []);

  const toggle = () => {
    if (ended) { setPlaying(true); go(0); return; }
    setPlaying((p) => !p);
  };

  const buttonLabel = ended
    ? t('story.highlights.replay')
    : t(playing ? 'story.highlights.pause' : 'story.highlights.play');

  return (
    <section
      id="highlights"
      ref={section}
      data-tone="dark"
      aria-label={t('story.highlights.title')}
      className="scroll-mt-28 overflow-hidden pb-20 pt-24 sm:pb-28 sm:pt-32"
    >
      <Reveal className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 sm:px-6">
        <h2 className="text-[clamp(2rem,5.2vw,3.5rem)] font-semibold leading-[1.06] tracking-[-0.03em]">
          {t('story.highlights.title')}
        </h2>
        {/* Where a product page puts "Watch the film": beside the highlights,
            which are the same story told in stills. */}
        <button
          type="button"
          onClick={openFilm}
          className="group mb-1 inline-flex items-center gap-2 text-[17px] font-medium text-[#34c48c] hover:underline hover:underline-offset-4"
        >
          {t('story.film.watch')}
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className="transition-transform duration-300 group-hover:scale-110">
            <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 8.2v7.6l6-3.8z" fill="currentColor" />
          </svg>
        </button>
      </Reveal>

      <div
        ref={scroller}
        onScroll={onScroll}
        className="relative mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain [scrollbar-width:none] sm:mt-14 sm:gap-6 [&::-webkit-scrollbar]:hidden"
        style={{ paddingInline: GUTTER, scrollPaddingInline: GUTTER }}
      >
        {SLIDES.map((slide, i) => {
          const photo = PHOTOS[slide.photo];
          const active = i === index;
          return (
            <article
              key={slide.key}
              className="relative aspect-[3/4] w-[84vw] shrink-0 snap-start overflow-hidden rounded-[28px] bg-[var(--color-surface)] sm:aspect-[16/10] sm:w-[76vw] lg:w-[min(64rem,78vw)]"
            >
              {photo && (
                <Photo
                  photo={photo}
                  sizes="(min-width: 1024px) 1024px, 84vw"
                  className="h-full w-full"
                  imgClassName={clsx(
                    'transition-transform ease-out',
                    active ? 'scale-[1.05] duration-[6000ms]' : 'scale-100 duration-700',
                  )}
                />
              )}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-black/60 via-black/20 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />
              <p className="absolute left-6 right-6 top-6 max-w-[30ch] text-[19px] font-semibold leading-snug tracking-[-0.015em] text-white sm:left-10 sm:top-9 sm:text-[26px] [text-shadow:0_1px_16px_rgba(0,0,0,0.3)]">
                {t(`story.highlights.${slide.key}.lead`)}{' '}
                <span className="text-white/78">{t(`story.highlights.${slide.key}.body`)}</span>
              </p>
              {photo && (
                <span className="absolute bottom-5 left-6 text-[11px] font-medium text-white/70 sm:left-10 [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]">
                  {tx(photo.where)}
                </span>
              )}
            </article>
          );
        })}
      </div>

      {/* Dots and clock, in one pill; play and pause beside it. */}
      <div className="mt-8 flex items-center justify-center gap-3">
        <div className="flex h-14 items-center gap-3 rounded-full bg-white/10 px-5 backdrop-blur-xl">
          {SLIDES.map((slide, i) => {
            const active = i === index;
            return (
              <button
                key={slide.key}
                type="button"
                onClick={() => go(i)}
                aria-label={t('story.highlights.goto', { n: i + 1, total: SLIDES.length })}
                aria-current={active}
                className={clsx(
                  'relative h-2 overflow-hidden rounded-full transition-[width,background-color] duration-500 ease-[var(--ease-spring)]',
                  active ? 'w-12 bg-white/30' : 'w-2 bg-white/40 hover:bg-white/70',
                )}
              >
                {active && (
                  <span
                    key={cycle}
                    onAnimationEnd={advance}
                    className="absolute inset-0 origin-left rounded-full bg-white"
                    style={
                      reduced
                        ? { transform: 'scaleX(1)' }
                        : {
                            animation: `ctn-fill ${SLIDE_MS}ms linear forwards`,
                            animationPlayState: running ? 'running' : 'paused',
                          }
                    }
                  />
                )}
              </button>
            );
          })}
        </div>

        {!reduced && (
          <button
            type="button"
            onClick={toggle}
            aria-label={buttonLabel}
            className="grid h-14 w-14 place-items-center rounded-full bg-white/10 text-white backdrop-blur-xl transition-colors duration-300 hover:bg-white/18 active:scale-95"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
              {ended ? (
                <path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" />
              ) : playing ? (
                <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
              ) : (
                <path d="M8 5.5v13a.6.6 0 0 0 .9.5l10.4-6.5a.6.6 0 0 0 0-1L8.9 5a.6.6 0 0 0-.9.5z" />
              )}
            </svg>
          </button>
        )}
      </div>
    </section>
  );
}
