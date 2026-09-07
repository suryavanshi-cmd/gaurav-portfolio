'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useScroll, useMotionValueEvent } from 'motion/react';
import { useState } from 'react';
import clsx from 'clsx';
import { useIntl } from '@/i18n/provider';
import { BrandMark } from './BrandMark';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import type { Profile } from '@/lib/types';

export function SiteNav({ profile }: { profile: Profile | null }) {
  const { t } = useIntl();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  // The bar only grows a hairline and a blur once the page has moved — at the
  // top it should feel like part of the hero, not a chrome strip on top of it.
  useMotionValueEvent(scrollY, 'change', (value) => setScrolled(value > 12));

  const links = [
    { href: '/explore', label: t('nav.explore') },
    { href: '/packages', label: t('nav.packages') },
    { href: '/planner', label: t('nav.planner') },
  ];

  return (
    <header
      className={clsx(
        'sticky top-0 z-40 transition-all duration-500',
        scrolled ? 'glass border-b border-[var(--color-line)]' : 'bg-transparent',
      )}
      style={{ transitionTimingFunction: 'var(--ease-spring)' }}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <BrandMark />
          <span className="hidden sm:block">{t('common.brand')}</span>
        </Link>

        <div className="ml-4 hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'whitespace-nowrap rounded-full px-3.5 py-2 text-sm transition-colors duration-300',
                pathname.startsWith(link.href)
                  ? 'text-[var(--color-ink)] bg-[color-mix(in_srgb,var(--color-ink)_7%,transparent)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]',
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link href="/shetkari" className="whitespace-nowrap rounded-full px-3 py-2 text-sm text-[var(--color-muted)] transition hover:text-[var(--color-ink)]">
            {t('nav.hostPortal')}
          </Link>
          {profile ? (
            <Link href="/trips" className="btn btn-ghost text-sm">
              {t('nav.trips')}
            </Link>
          ) : (
            <Link href="/auth" className="btn btn-ghost text-sm">
              {t('nav.signIn')}
            </Link>
          )}
          <Link href="/planner" className="btn btn-primary text-sm">
            {t('nav.cta')}
          </Link>
        </div>

        <button
          type="button"
          aria-label={t('nav.menu')}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="ml-auto grid h-10 w-10 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-ink)_7%,transparent)] md:hidden cursor-pointer"
        >
          <span className="relative block h-3 w-4">
            <motion.span
              className="absolute left-0 top-0 block h-[1.6px] w-4 rounded bg-current"
              animate={open ? { rotate: 45, y: 5.5 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.span
              className="absolute bottom-0 left-0 block h-[1.6px] w-4 rounded bg-current"
              animate={open ? { rotate: -45, y: -5.5 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            />
          </span>
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            className="glass border-t border-[var(--color-line)] md:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex flex-col gap-1 px-4 py-4">
              {[...links, { href: '/shetkari', label: t('nav.hostPortal') }, { href: profile ? '/trips' : '/auth', label: profile ? t('nav.trips') : t('nav.signIn') }].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-2xl px-4 py-3 text-[17px] transition hover:bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)]"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-3 flex items-center justify-between gap-3 px-1">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
              <Link href="/planner" onClick={() => setOpen(false)} className="btn btn-primary mt-3">
                {t('nav.cta')}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
