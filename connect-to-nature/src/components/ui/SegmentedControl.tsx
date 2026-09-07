'use client';

import { motion } from 'motion/react';
import { useId } from 'react';
import clsx from 'clsx';

export interface Segment<T extends string> {
  value: T;
  label: string;
  sub?: string;
}

/* One indicator that slides between the options, rather than several
   backgrounds crossfading — the same trick the iOS segmented control uses, and
   the reason it reads as one control instead of a row of buttons. */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  size = 'md',
  className,
  ariaLabel,
}: {
  segments: Segment<T>[];
  value: T;
  onChange: (next: T) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  ariaLabel?: string;
}) {
  const layoutId = useId();

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={clsx(
        'relative inline-flex items-stretch rounded-full p-1',
        'bg-[color-mix(in_srgb,var(--color-ink)_7%,transparent)]',
        className,
      )}
    >
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <button
            key={segment.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(segment.value)}
            className={clsx(
              'relative z-10 rounded-full transition-colors duration-300 cursor-pointer',
              size === 'sm' && 'px-3 py-1.5 text-[13px]',
              size === 'md' && 'px-4 py-2 text-sm',
              size === 'lg' && 'px-5 py-3 text-base',
              active ? 'text-[var(--color-ink)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-[var(--color-surface)] shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative block whitespace-nowrap font-medium">{segment.label}</span>
            {segment.sub && (
              <span className="relative block text-[11px] font-normal opacity-70">{segment.sub}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
