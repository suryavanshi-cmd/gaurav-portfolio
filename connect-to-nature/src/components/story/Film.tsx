'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'motion/react';
import { useIntl } from '@/i18n/provider';
import type { FilmStats } from './FilmOverlay';

/* What the front page needs to offer the film: a button, a way for any other
 * section to open it, and the host that shows it. The film itself — six
 * scenes of motion design — is a separate chunk, fetched only when somebody
 * asks for it, and warmed up when the pointer first comes near the button. */

export const FILM_EVENT = 'ctn:film';

const load = () => import('./FilmOverlay');
const FilmOverlay = dynamic(load, { ssr: false });

export function openFilm() {
  void load();
  window.dispatchEvent(new Event(FILM_EVENT));
}

/* Listens for "open the film" and renders it on <body>, not in place: the
   hero moves with a transform, and a fixed-position element inside a
   transformed ancestor is positioned against that ancestor, not the screen. */
export function FilmHost({ stats }: { stats: FilmStats }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onOpen = () => setOpen(true);
    window.addEventListener(FILM_EVENT, onOpen);
    return () => window.removeEventListener(FILM_EVENT, onOpen);
  }, []);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>{open && <FilmOverlay stats={stats} onClose={() => setOpen(false)} />}</AnimatePresence>,
    document.body,
  );
}

/* The trigger, styled for the dark hero. */
export function FilmButton({ className = '' }: { className?: string }) {
  const { t } = useIntl();
  return (
    <button
      type="button"
      onClick={openFilm}
      onPointerEnter={() => void load()}
      onFocus={() => void load()}
      className={`group inline-flex items-center gap-2.5 rounded-full py-2 pl-2 pr-4 text-[15px] font-medium transition-colors ${className}`}
    >
      <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-black transition-transform duration-300 group-hover:scale-110">
        <svg viewBox="0 0 20 20" width="12" height="12" aria-hidden="true">
          <path d="M6 4.2v11.6a.6.6 0 0 0 .9.5l9.3-5.8a.6.6 0 0 0 0-1L6.9 3.7a.6.6 0 0 0-.9.5z" fill="currentColor" />
        </svg>
      </span>
      {t('story.film.watch')}
      <span className="tabular-nums opacity-70">{t('story.film.duration')}</span>
    </button>
  );
}
