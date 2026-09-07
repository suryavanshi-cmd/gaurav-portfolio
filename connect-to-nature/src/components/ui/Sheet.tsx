'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

/* A bottom sheet on a phone, a centred panel on a laptop. Used for the booking
   flow and the farm detail, so a traveller never loses the page behind them. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  closeLabel = 'Close',
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  closeLabel?: string;
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.button
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className="absolute inset-0 bg-black/35 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] bg-[var(--color-surface)] p-6 sm:p-7 shadow-2xl"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--color-line-strong)] sm:hidden" />
            {title && <h2 className="text-xl font-semibold tracking-tight mb-4 pr-8">{title}</h2>}
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)] text-[var(--color-muted)] transition hover:text-[var(--color-ink)] cursor-pointer"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M1 1l14 14M15 1L1 15" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              </svg>
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
