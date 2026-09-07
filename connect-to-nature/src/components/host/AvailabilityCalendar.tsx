'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useIntl } from '@/i18n/provider';

function addDays(days: number): Date {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

/* Sixty days of tap targets. A host opens the dates they can take guests and
   closes the ones they cannot; a date with a booking on it is shown but cannot
   be closed, because the guest has already been told they are coming. */
export function AvailabilityCalendar({
  openDates,
  bookedDates = [],
  onChange,
  days = 60,
  readOnly = false,
}: {
  openDates: string[];
  bookedDates?: string[];
  onChange?: (dates: string[]) => void;
  days?: number;
  readOnly?: boolean;
}) {
  const { t, list } = useIntl();
  const months = list('months');
  const [open, setOpen] = useState<Set<string>>(() => new Set(openDates));

  const grid = useMemo(
    () => Array.from({ length: days }, (_, index) => addDays(index + 1)),
    [days],
  );

  const toggle = (iso: string) => {
    if (readOnly || bookedDates.includes(iso)) return;
    const next = new Set(open);
    if (next.has(iso)) next.delete(iso);
    else next.add(iso);
    setOpen(next);
    onChange?.([...next]);
  };

  let lastMonth = -1;

  return (
    <div>
      <p className="mb-4 text-[14px] leading-relaxed text-[var(--color-muted)]">{t('host.openDatesNote')}</p>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-7 md:grid-cols-10">
        {grid.map((date) => {
          const iso = date.toISOString().slice(0, 10);
          const isBooked = bookedDates.includes(iso);
          const isOpen = open.has(iso);
          const showMonth = date.getMonth() !== lastMonth;
          lastMonth = date.getMonth();

          return (
            <button
              key={iso}
              type="button"
              onClick={() => toggle(iso)}
              disabled={readOnly || isBooked}
              aria-pressed={isOpen}
              className={clsx(
                'flex h-14 flex-col items-center justify-center rounded-2xl border text-[13px] transition-all duration-300',
                'disabled:cursor-default',
                isBooked && 'border-transparent bg-[var(--color-grape-soft)] text-[var(--color-grape)]',
                !isBooked && isOpen && 'border-transparent bg-[var(--color-leaf)] text-white',
                !isBooked && !isOpen && 'border-[var(--color-line-strong)] text-[var(--color-muted)] hover:border-[var(--color-leaf)]',
              )}
              style={{ transitionTimingFunction: 'var(--ease-spring)' }}
            >
              <span className="text-[15px] font-medium tabular-nums">{date.getDate()}</span>
              <span className="text-[10px] opacity-80">
                {showMonth ? months[date.getMonth()]?.slice(0, 3) : isBooked ? t('host.booked') : ''}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-[13px] text-[var(--color-muted)]">
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-[var(--color-leaf)]" />{t('host.open')}</span>
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full border border-[var(--color-line-strong)]" />{t('host.closed')}</span>
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-[var(--color-grape)]" />{t('host.booked')}</span>
      </div>
    </div>
  );
}
