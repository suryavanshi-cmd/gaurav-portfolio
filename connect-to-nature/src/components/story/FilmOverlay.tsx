'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { useIntl } from '@/i18n/provider';
import { PHOTOS } from '@/lib/photo-credits';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { Photo } from '../ui/Photo';

/* The fifteen-second film behind "Watch the film".
 *
 * It is motion design rather than a video file: six scenes drawn by the page
 * itself, so it is sharp at any size, weighs nothing to download, and is in
 * whichever of the three languages the visitor is reading.
 *
 * Everything hangs off one clock. `clock` is a motion value holding seconds
 * into the film; a requestAnimationFrame loop advances it while playing, and
 * every element in every scene derives its position, scale, opacity or path
 * length from it. That is what makes the film pausable and seekable to the
 * frame with no per-animation bookkeeping: stop the clock and the whole film
 * stops; set it to 7.2 and every scene is exactly where it is at 7.2.
 *
 * Reduced motion keeps the cuts and the fades but drops the movement — the
 * `calm` flag collapses every movement range to its end value.
 *
 * This module is only fetched when someone opens the film (see Film.tsx), so
 * none of it is on the front page's first load. */

const LENGTH = 15;

const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export interface FilmStats {
  farms: number;
  districts: number;
  languages: number;
  share: number;
}

type Clock = MotionValue<number>;

/* A scene's visibility: fades in, holds, fades out. */
function useWindow(clock: Clock, start: number, end: number, fade = 0.45) {
  return useTransform(clock, [start, start + fade, end - fade, end], [0, 1, 1, 0]);
}

/* Movement that reduced motion skips straight to the end of. */
function useMove(clock: Clock, input: number[], output: number[], calm: boolean, ease = easeOut) {
  const last = output[output.length - 1];
  return useTransform(clock, input, calm ? output.map(() => last) : output, { ease });
}

/* ─── the player ─────────────────────────────────────────────────────────── */

export default function FilmOverlay({ stats, onClose }: { stats: FilmStats; onClose: () => void }) {
  const { t } = useIntl();
  const calm = useReducedMotion();
  const clock = useMotionValue(0);
  const [playing, setPlaying] = useState(true);
  const [ended, setEnded] = useState(false);
  const [second, setSecond] = useState(0);
  const playButton = useRef<HTMLButtonElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const progress = useTransform(clock, [0, LENGTH], [0, 1]);

  // Only re-render when the whole second changes, not sixty times a second.
  useMotionValueEvent(clock, 'change', (v) => setSecond(Math.min(LENGTH, Math.floor(v))));

  // The clock. dt is capped so a frame that arrives late — a background tab,
  // a slow device — nudges the film forward rather than jumping it.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const next = Math.min(LENGTH, clock.get() + dt);
      clock.set(next);
      if (next >= LENGTH) {
        setPlaying(false);
        setEnded(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, clock]);

  // Lock the page behind, take focus, and give it back on the way out.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = 'hidden';
    // Focus starts on play/pause, so the first press of Space pauses the
    // film — on the close button it would have closed it.
    playButton.current?.focus();
    return () => {
      root.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  const toggle = () => {
    if (ended) {
      clock.set(0);
      setEnded(false);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === ' ' && (event.target as HTMLElement)?.tagName !== 'BUTTON') {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const seek = (clientX: number) => {
    const box = track.current?.getBoundingClientRect();
    if (!box) return;
    const at = Math.max(0, Math.min(1, (clientX - box.left) / box.width)) * LENGTH;
    clock.set(at);
    if (at < LENGTH && ended) setEnded(false);
  };

  const label = ended ? t('story.film.replay') : playing ? t('story.film.pause') : t('story.film.play');

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={t('story.film.label')}
      className="fixed inset-0 z-[80] overflow-hidden bg-black text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="absolute inset-0"
        initial={{ scale: calm ? 1 : 1.03 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <SceneMark clock={clock} calm={calm} />
        <SceneFields clock={clock} calm={calm} />
        <SceneMap clock={clock} calm={calm} />
        <ScenePanels clock={clock} calm={calm} />
        <SceneNumbers clock={clock} calm={calm} stats={stats} />
        <SceneEnd clock={clock} calm={calm} onClose={onClose} />
      </motion.div>

      <button
        type="button"
        onClick={onClose}
        aria-label={t('story.film.close')}
        className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/12 backdrop-blur-xl transition-colors hover:bg-white/22 sm:right-6 sm:top-6"
      >
        <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
          <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-4 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-8 sm:pb-7">
        <button
          ref={playButton}
          type="button"
          onClick={toggle}
          aria-label={label}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/12 backdrop-blur-xl transition-colors hover:bg-white/22"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
            {ended ? (
              <path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" />
            ) : playing ? (
              <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
            ) : (
              <path d="M8 5.5v13a.6.6 0 0 0 .9.5l10.4-6.5a.6.6 0 0 0 0-1L8.9 5a.6.6 0 0 0-.9.5z" />
            )}
          </svg>
        </button>
        <div
          ref={track}
          role="slider"
          tabIndex={0}
          aria-label={t('story.film.seek')}
          aria-valuemin={0}
          aria-valuemax={LENGTH}
          aria-valuenow={second}
          onPointerDown={(event) => seek(event.clientX)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') clock.set(Math.min(LENGTH, clock.get() + 1));
            if (event.key === 'ArrowLeft') clock.set(Math.max(0, clock.get() - 1));
          }}
          className="group relative h-6 flex-1 cursor-pointer"
        >
          <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-white/20 transition-[height] group-hover:h-[5px]">
            <motion.div style={{ scaleX: progress }} className="h-full w-full origin-left rounded-full bg-white" />
          </div>
        </div>
        <span className="shrink-0 whitespace-nowrap text-right text-[13px] tabular-nums text-white/75">
          0:{String(second).padStart(2, '0')} / 0:{LENGTH}
        </span>
      </div>
    </motion.div>
  );
}

/* ─── scene 1 · 0.0–2.9s · the mark draws, the name rises ──────────────────── */

function SceneMark({ clock, calm }: { clock: Clock; calm: boolean }) {
  const { t } = useIntl();
  const opacity = useWindow(clock, 0, 2.9);
  const disc = useMove(clock, [0, 0.6], [0.6, 1], calm);
  const hill = useTransform(clock, [0.15, 1.05], [0, 1], { ease: easeInOut });
  const line = useTransform(clock, [0.55, 1.2], [0, 1], { ease: easeInOut });
  const sun = useMove(clock, [0.75, 1.15, 1.3], [0, 1.2, 1], calm);
  const drift = useMove(clock, [2.1, 2.9], [1, 0.94], calm, easeInOut);
  const eyebrow = useTransform(clock, [1.55, 2.0], [0, 1]);
  const words = t('common.brand').split(/\s+/);

  return (
    <motion.div style={{ opacity, scale: drift }} className="absolute inset-0 grid place-items-center">
      <div className="flex flex-col items-center text-center">
        <motion.svg style={{ scale: disc }} viewBox="0 0 32 32" className="h-20 w-20 sm:h-24 sm:w-24" aria-hidden="true">
          <circle cx="16" cy="16" r="15" fill="#157f5f" opacity="0.22" />
          <motion.path
            d="M4 22c4-7 7-10 9-10s3 2 5 5 3 5 6 5"
            fill="none"
            stroke="#34c48c"
            strokeWidth="1.8"
            strokeLinecap="round"
            style={{ pathLength: hill }}
          />
          <motion.path
            d="M4 25.5h24"
            stroke="#34c48c"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.6"
            style={{ pathLength: line }}
          />
          <motion.circle cx="22" cy="10.5" r="3.6" fill="#e8a33d" style={{ scale: sun }} />
        </motion.svg>
        <h2 className="mt-6 flex flex-wrap justify-center gap-x-[0.28em] text-[clamp(2.2rem,7vw,4.6rem)] font-semibold tracking-[-0.035em]">
          {words.map((word, i) => (
            <RisingWord key={`${i}-${word}`} clock={clock} calm={calm} at={0.75 + i * 0.14}>
              {word}
            </RisingWord>
          ))}
        </h2>
        <motion.p style={{ opacity: eyebrow }} className="mt-3 text-[13px] font-semibold uppercase tracking-[0.3em] text-white/65">
          {t('story.film.eyebrow')}
        </motion.p>
      </div>
    </motion.div>
  );
}

/* One word rising out of a mask. Words, not letters: splitting Devanagari into
   letters breaks its conjuncts, and the name is shown in all three scripts. */
function RisingWord({ clock, calm, at, children }: { clock: Clock; calm: boolean; at: number; children: string }) {
  const y = useMove(clock, [at, at + 0.55], [105, 0], calm);
  const opacity = useTransform(clock, [at, at + 0.3], [0, 1]);
  const transform = useTransform(y, (v) => `translateY(${v}%)`);
  return (
    <span className="inline-block overflow-hidden pb-[0.12em] leading-[1.1]">
      <motion.span className="inline-block" style={{ transform, opacity }}>{children}</motion.span>
    </span>
  );
}

/* ─── scene 2 · 2.5–5.6s · the fields, three short lines ───────────────────── */

function SceneFields({ clock, calm }: { clock: Clock; calm: boolean }) {
  const { t } = useIntl();
  const opacity = useWindow(clock, 2.5, 5.6);
  const zoom = useMove(clock, [2.5, 5.6], [1.2, 1.02], calm, (x) => x);
  const photo = PHOTOS['rice-terraces'];
  const lines = [t('story.film.l1'), t('story.film.l2'), t('story.film.l3')];

  return (
    <motion.div style={{ opacity }} className="absolute inset-0">
      {photo && (
        <motion.div style={{ scale: zoom }} className="absolute inset-0">
          <Photo photo={photo} sizes="100vw" className="h-full w-full" />
        </motion.div>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/10" />
      <div className="absolute inset-0 flex items-center px-6 sm:px-16 lg:px-24">
        <h2 className="text-[clamp(2.6rem,8vw,6rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
          {lines.map((line, i) => (
            <span key={i} className="block">
              <RisingLine clock={clock} calm={calm} at={2.9 + i * 0.5} accent={i === 2}>
                {line}
              </RisingLine>
            </span>
          ))}
        </h2>
      </div>
    </motion.div>
  );
}

function RisingLine({
  clock, calm, at, accent, children,
}: { clock: Clock; calm: boolean; at: number; accent?: boolean; children: string }) {
  const y = useMove(clock, [at, at + 0.6], [110, 0], calm);
  const transform = useTransform(y, (v) => `translateY(${v}%)`);
  const opacity = useTransform(clock, [at, at + 0.25], [0, 1]);
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span
        className={`block ${accent ? 'bg-gradient-to-r from-[#34c48c] to-[#e8a33d] bg-clip-text text-transparent' : ''}`}
        style={{ transform, opacity }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/* ─── scene 3 · 5.2–8.3s · the route draws itself down the coast ──────────── */

/* Placed from real coordinates — longitude 72.4–74.4°E across, latitude
   20.4–15.6°N down — so the shape of the route is the shape of the trip. */
const PLACES = {
  mumbai: { x: 96, y: 138, at: 5.55 },
  ratnagiri: { x: 182, y: 355, at: 6.5 },
  sindhudurg: { x: 214, y: 452, at: 6.95 },
  nashik: { x: 278, y: 42, at: 6.85 },
} as const;

function SceneMap({ clock, calm }: { clock: Clock; calm: boolean }) {
  const { t } = useIntl();
  const opacity = useWindow(clock, 5.2, 8.3);
  const coast = useTransform(clock, [5.65, 6.95], [0, 1], { ease: easeInOut });
  const inland = useTransform(clock, [6.0, 6.85], [0, 1], { ease: easeInOut });
  const titleY = useMove(clock, [5.35, 5.95], [24, 0], calm);
  const titleOpacity = useTransform(clock, [5.35, 5.8], [0, 1]);
  const coastLabel = useTransform(clock, [6.6, 7.0], [0, 1]);
  const drift = useMove(clock, [5.2, 8.3], [1.06, 1], calm, (x) => x);

  return (
    <motion.div style={{ opacity }} className="absolute inset-0 overflow-hidden bg-[#050807]">
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_70%_55%,rgba(52,196,140,0.16),transparent_70%)]" />
      <div className="relative mx-auto flex h-full max-w-6xl flex-col items-center justify-center gap-6 px-6 pb-20 pt-16 lg:flex-row lg:gap-16">
        <motion.h2
          style={{ y: titleY, opacity: titleOpacity }}
          className="max-w-md text-center text-[clamp(1.8rem,4.6vw,3.4rem)] font-semibold leading-[1.08] tracking-[-0.03em] lg:text-left"
        >
          {t('story.film.mapTitle')}
        </motion.h2>
        <motion.svg
          style={{ scale: drift }}
          viewBox="0 0 400 500"
          className="h-[min(56vh,520px)] w-auto shrink-0"
          aria-hidden="true"
        >
          <defs>
            <pattern id="film-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.12)" />
            </pattern>
            <linearGradient id="film-route" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34c48c" />
              <stop offset="100%" stopColor="#e8a33d" />
            </linearGradient>
          </defs>
          <rect width="400" height="500" fill="url(#film-grid)" />
          <motion.path
            d="M96 138 C 112 220 158 292 182 355 S 206 420 214 452"
            fill="none" stroke="url(#film-route)" strokeWidth="4" strokeLinecap="round"
            style={{ pathLength: coast }}
          />
          <motion.path
            d="M96 138 C 150 112 214 64 278 42"
            fill="none" stroke="#34c48c" strokeWidth="4" strokeLinecap="round" strokeDasharray="0.1 10"
            style={{ pathLength: inland }}
          />
          {(Object.keys(PLACES) as (keyof typeof PLACES)[]).map((key) => (
            <MapPlace key={key} clock={clock} calm={calm} place={PLACES[key]} label={t(`story.film.${key}`)} />
          ))}
          <motion.text
            x="118" y="300" fill="rgba(255,255,255,0.55)" fontSize="13" letterSpacing="3"
            transform="rotate(62 118 300)" style={{ opacity: coastLabel }}
          >
            {t('story.film.coast').toUpperCase()}
          </motion.text>
        </motion.svg>
      </div>
    </motion.div>
  );
}

function MapPlace({
  clock, calm, place, label,
}: { clock: Clock; calm: boolean; place: { x: number; y: number; at: number }; label: string }) {
  const pop = useMove(clock, [place.at, place.at + 0.22, place.at + 0.4], [0, 1.35, 1], calm);
  const ring = useMove(clock, [place.at, place.at + 1.1], [1, 2.6], calm);
  // Invisible until its place is reached — a clamped transform holds its
  // first value before the range starts, which would show the ring early.
  const ringOpacity = useTransform(clock, [place.at - 0.01, place.at, place.at + 1.1], [0, calm ? 0 : 0.7, 0]);
  const text = useTransform(clock, [place.at + 0.15, place.at + 0.5], [0, 1]);
  const left = place.x > 250;
  return (
    <g>
      <motion.circle cx={place.x} cy={place.y} r="9" fill="none" stroke="#34c48c" strokeWidth="1.5"
        style={{ scale: ring, opacity: ringOpacity }} />
      <motion.circle cx={place.x} cy={place.y} r="6" fill="#fff" style={{ scale: pop }} />
      <motion.text
        x={left ? place.x - 14 : place.x + 14} y={place.y + 5} textAnchor={left ? 'end' : 'start'}
        fill="#fff" fontSize="17" fontWeight="600" style={{ opacity: text }}
      >
        {label}
      </motion.text>
    </g>
  );
}

/* ─── scene 4 · 7.9–10.9s · three panels open upwards ──────────────────────── */

const PANELS = [
  { photo: 'mango-laterite', key: 'p1' },
  { photo: 'sula-vineyard', key: 'p2' },
  { photo: 'aare-ware', key: 'p3' },
] as const;

function ScenePanels({ clock, calm }: { clock: Clock; calm: boolean }) {
  const opacity = useWindow(clock, 7.9, 10.9);
  return (
    <motion.div style={{ opacity }} className="absolute inset-0 grid grid-cols-3 gap-1.5 bg-black p-1.5 pb-20 sm:gap-3 sm:p-3 sm:pb-24">
      {PANELS.map((panel, i) => (
        <Panel key={panel.key} clock={clock} calm={calm} index={i} photoId={panel.photo} labelKey={panel.key} />
      ))}
    </motion.div>
  );
}

function Panel({
  clock, calm, index, photoId, labelKey,
}: { clock: Clock; calm: boolean; index: number; photoId: string; labelKey: string }) {
  const { t } = useIntl();
  const at = 8.05 + index * 0.2;
  const reveal = useMove(clock, [at, at + 0.75], [100, 0], calm, easeInOut);
  const clipPath = useTransform(reveal, (v) => `inset(${v}% 0% 0% 0% round 22px)`);
  const zoom = useMove(clock, [at, 10.9], [1.25, 1.04], calm, (x) => x);
  const labelY = useMove(clock, [at + 0.55, at + 1.0], [22, 0], calm);
  const labelOpacity = useTransform(clock, [at + 0.55, at + 0.9], [0, 1]);
  const photo = PHOTOS[photoId];

  return (
    <motion.div style={{ clipPath }} className="relative overflow-hidden rounded-[22px]">
      {photo && (
        <motion.div style={{ scale: zoom }} className="absolute inset-0">
          <Photo photo={photo} sizes="34vw" className="h-full w-full" />
        </motion.div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
      <motion.p
        style={{ y: labelY, opacity: labelOpacity }}
        className="absolute bottom-5 left-4 right-4 text-[clamp(1.1rem,3vw,2.2rem)] font-semibold tracking-[-0.02em] sm:bottom-8 sm:left-7"
      >
        {t(`story.film.${labelKey}`)}
      </motion.p>
    </motion.div>
  );
}

/* ─── scene 5 · 10.5–13.2s · the numbers count up ──────────────────────────── */

function SceneNumbers({ clock, calm, stats }: { clock: Clock; calm: boolean; stats: FilmStats }) {
  const { t } = useIntl();
  const opacity = useWindow(clock, 10.5, 13.2);
  const items = [
    { value: stats.farms, label: t('story.film.farms'), suffix: '' },
    { value: stats.districts, label: t('story.film.districts'), suffix: '' },
    { value: stats.languages, label: t('story.film.langs'), suffix: '' },
    { value: stats.share, label: t('story.film.share'), suffix: '%' },
  ];
  return (
    <motion.div style={{ opacity }} className="absolute inset-0 grid place-items-center bg-[#050807] px-6 pb-16">
      <div className="absolute inset-0 bg-[radial-gradient(50%_50%_at_50%_45%,rgba(232,163,61,0.14),transparent_70%)]" />
      <div className="relative grid w-full max-w-5xl grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
        {items.map((item, i) => (
          <Counter key={item.label} clock={clock} calm={calm} at={10.8 + i * 0.16} {...item} />
        ))}
      </div>
    </motion.div>
  );
}

function Counter({
  clock, calm, at, value, label, suffix,
}: { clock: Clock; calm: boolean; at: number; value: number; label: string; suffix: string }) {
  const count = useTransform(clock, [at, at + 1.1], [calm ? value : 0, value], { ease: easeOut });
  const shown = useTransform(count, (v) => `${Math.round(v)}${suffix}`);
  const bar = useMove(clock, [at, at + 1.1], [0, 1], calm);
  const y = useMove(clock, [at, at + 0.5], [30, 0], calm);
  const fade = useTransform(clock, [at, at + 0.35], [0, 1]);
  return (
    <motion.div style={{ y, opacity: fade }} className="text-center lg:text-left">
      <motion.p className="text-[clamp(3.2rem,9vw,6rem)] font-semibold leading-none tracking-[-0.05em] tabular-nums">
        {shown}
      </motion.p>
      <motion.div style={{ scaleX: bar }} className="mx-auto mt-4 h-[3px] w-20 origin-left rounded-full bg-gradient-to-r from-[#34c48c] to-[#e8a33d] lg:mx-0" />
      <p className="mt-3 text-[15px] text-white/70">{label}</p>
    </motion.div>
  );
}

/* ─── scene 6 · 12.8–15s · the end card, and the one thing to do next ──────── */

function SceneEnd({ clock, calm, onClose }: { clock: Clock; calm: boolean; onClose: () => void }) {
  const { t } = useIntl();
  const opacity = useTransform(clock, [12.8, 13.25], [0, 1]);
  const zoom = useMove(clock, [12.8, LENGTH], [1.14, 1], calm, (x) => x);
  const ctaY = useMove(clock, [13.9, 14.4], [18, 0], calm);
  const ctaOpacity = useTransform(clock, [13.9, 14.3], [0, 1]);
  // Unclickable until it can be seen, so an early tap on the stage does not
  // navigate away from a film that has not reached it.
  const pointerEvents = useTransform(clock, (v) => (v > 13.9 ? 'auto' : 'none'));
  const photo = PHOTOS['hedvi-sunset'];
  const words = t('story.film.endTitle').split(/\s+/);

  return (
    <motion.div style={{ opacity, pointerEvents }} className="absolute inset-0">
      {photo && (
        <motion.div style={{ scale: zoom }} className="absolute inset-0">
          <Photo photo={photo} sizes="100vw" className="h-full w-full" />
        </motion.div>
      )}
      <div className="absolute inset-0 bg-[radial-gradient(80%_70%_at_50%_45%,rgba(0,0,0,0.25),rgba(0,0,0,0.78))]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 pb-16 text-center">
        <h2 className="flex max-w-5xl flex-wrap justify-center gap-x-[0.26em] text-[clamp(2.4rem,7vw,5rem)] font-semibold tracking-[-0.035em]">
          {words.map((word, i) => (
            <RisingWord key={`${i}-${word}`} clock={clock} calm={calm} at={13.1 + i * 0.1}>
              {word}
            </RisingWord>
          ))}
        </h2>
        <motion.div style={{ y: ctaY, opacity: ctaOpacity }} className="mt-8">
          <Link href="/planner" onClick={onClose} className="btn btn-primary px-7 py-3.5 text-[16px]">
            {t('story.film.endCta')}
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}
