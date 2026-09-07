'use client';

import clsx from 'clsx';
import type { ReactNode } from 'react';

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={clsx('block', className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-2)]">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-[var(--color-muted)]">{hint}</span>}
    </label>
  );
}

export function Stars({ rating, count }: { rating: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm" aria-label={`${rating} out of 5`}>
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-[var(--color-sun)]" aria-hidden="true">
        <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9 4.8 17.6l1-5.8L1.5 7.7l5.9-.9z" />
      </svg>
      <span className="font-medium">{rating.toFixed(1)}</span>
      {count !== undefined && <span className="text-[var(--color-muted)]">({count})</span>}
    </span>
  );
}

export function Pill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'leaf' | 'grape' | 'warn';
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium',
        tone === 'neutral' && 'bg-[color-mix(in_srgb,var(--color-ink)_7%,transparent)] text-[var(--color-ink-2)]',
        tone === 'leaf' && 'bg-[var(--color-leaf-soft)] text-[var(--color-leaf)]',
        tone === 'grape' && 'bg-[var(--color-grape-soft)] text-[var(--color-grape)]',
        tone === 'warn' && 'bg-[color-mix(in_srgb,var(--color-sun)_20%,transparent)] text-[var(--color-clay)]',
      )}
    >
      {children}
    </span>
  );
}
