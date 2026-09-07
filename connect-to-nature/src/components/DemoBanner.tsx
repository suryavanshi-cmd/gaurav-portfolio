'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useIntl } from '@/i18n/provider';

/* Shown only when NEXT_PUBLIC_SUPABASE_URL is absent. It is the one piece of
   chrome that tells you the difference between this build and production. */
export function DemoBanner() {
  const { t } = useIntl();
  const [open, setOpen] = useState(true);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="border-b border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-sun)_16%,var(--color-canvas))]"
        >
          <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-2.5 text-[13px] leading-relaxed sm:px-6">
            <span className="mt-[1px] shrink-0 rounded-full bg-[var(--color-clay)] px-2 py-0.5 text-[11px] font-medium text-white">
              {t('common.demoBadge')}
            </span>
            <p className="text-[var(--color-ink-2)]">{t('common.demoNote')}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('common.close')}
              className="ml-auto shrink-0 text-[var(--color-muted)] transition hover:text-[var(--color-ink)] cursor-pointer"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
