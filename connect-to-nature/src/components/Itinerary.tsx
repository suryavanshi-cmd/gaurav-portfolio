'use client';

import { motion } from 'motion/react';
import { useIntl } from '@/i18n/provider';
import type { ItineraryItem } from '@/lib/types';

/* Two days, laid out as one column per day on a laptop and one after the other
   on a phone. Times are the farm's own hours — 05:45 for the onion auction is
   not a rounding of "early morning". */
export function Itinerary({ items }: { items: ItineraryItem[] }) {
  const { t, tx } = useIntl();
  const days: (1 | 2)[] = [1, 2];

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {days.map((day) => {
        const dayItems = items.filter((item) => item.day === day);
        if (dayItems.length === 0) return null;
        return (
          <div key={day}>
            <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
              {t('common.day')} {day}
            </h3>
            <ol className="relative space-y-1 border-l border-[var(--color-line)] pl-5">
              {dayItems.map((item, index) => (
                <motion.li
                  key={`${item.day}-${item.time}-${index}`}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-10%' }}
                  transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.3), ease: [0.22, 1, 0.36, 1] }}
                  className="relative py-3"
                >
                  <span
                    className="absolute -left-[26px] top-[18px] h-2.5 w-2.5 rounded-full border-2 border-[var(--color-canvas)] bg-[var(--color-leaf)]"
                    aria-hidden="true"
                  />
                  <div className="flex items-baseline gap-3">
                    <time className="w-12 shrink-0 text-[13px] font-medium tabular-nums text-[var(--color-muted)]">
                      {item.time}
                    </time>
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium leading-snug">{tx(item.title)}</p>
                      {tx(item.note) && (
                        <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-muted)]">{tx(item.note)}</p>
                      )}
                      <span className="mt-1.5 inline-block text-[11px] uppercase tracking-wider text-[var(--color-muted)]">
                        {t(`slots.${item.slot}`)}
                        {item.category ? ` · ${t(`categories.${item.category}`)}` : ''}
                      </span>
                    </div>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}
