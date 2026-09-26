'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useScroll, useMotionValueEvent } from 'motion/react';
import type React from 'react';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useIntl } from '@/i18n/provider';
import { toneAt } from '@/lib/tone';
import { BrandMark } from './BrandMark';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { NavProgress } from './ui/NavProgress';
import type { Profile } from '@/lib/types';

export function SiteNav({ profile }: { profile: Profile | null }) {
  const { t } = useIntl();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  const [tucked, setTucked] = useState(false);
  /* Starts dark because the front page starts on the reel; the first scroll
     (or mount, for a page restored halfway down) corrects it. */
  const [overDark, setOverDark] = useState(true);
  const home = pathname === '/';
  useEffect(() => { if (home) setOverDark(toneAt(64).tone === 'dark'); }, [home]);

  // The bar only grows a hairline and a blur once the page has moved — at the
  // top it should feel like part of the hero, not a chrome strip on top of it.
  //
  // On the front page it also gets out of the way: past the hero, scrolling
  // down slides it off the top and leaves the section bar there on its own;
  // any scroll back up brings it straight back. The few pixels of slack keep a
  // trackpad's jitter from flicking it in and out.
  useMotionValueEvent(scrollY, 'change', (value) => {
    setScrolled(value > 12);
    if (home) setOverDark(toneAt(64).tone === 'dark');
    const previous = scrollY.getPrevious() ?? value;
    if (value < window.innerHeight * 0.85) setTucked(false);
    else if (value - previous > 6) setTucked(true);
    else if (previous - value > 6) setTucked(false);
  });
  const hidden = tucked && pathname === '/' && !open;

  /* The front page's section bar sticks just under this one, so it needs to
     know how much of the top of the screen this bar is using. */
  useEffect(() => {
    document.documentElement.style.setProperty('--nav-h', hidden ? '0px' : '64px');
  }, [hidden]);

  /* The front page opens on a photograph of the coast, which is dark enough
     that ink-on-paper links disappear into it. Rather than restyle every item
     in the bar, the three text colours it is built out of are swapped for
     light ones while it is sitting over that picture — and swapped back the
     moment the glass comes in. Deriving this from the route rather than from
     an effect keeps the first server-rendered paint correct. */
  const overHero = home && !scrolled;
  /* Past the hero, the same bar is glass again — dark glass while it is over
     the dark half of the front page, the page's own glass everywhere else. */
  const overStory = home && scrolled && overDark;

  const links = [
    { href: '/explore', label: t('nav.explore') },
    { href: '/packages', label: t('nav.packages') },
    { href: '/planner', label: t('nav.planner') },
  ];

  return (
    <header
      className={clsx(
        'sticky top-0 z-40 text-[var(--color-ink)] transition-all duration-500',
        hidden && '-translate-y-full',
        scrolled
          ? 'glass border-b border-[var(--color-line)] backdrop-blur-xl backdrop-saturate-150'
          : 'bg-transparent',
      )}
      style={{
        transitionTimingFunction: 'var(--ease-spring)',
        ...(overHero
          ? ({
              '--color-ink': '#ffffff',
              '--color-ink-2': 'rgba(255,255,255,0.88)',
              '--color-muted': 'rgba(255,255,255,0.74)',
              /* The segmented controls fill their selected pill with
                 --color-surface and write on it in --color-ink. Swapping the
                 ink without the surface leaves white on white. */
              '--color-surface': 'rgba(10,14,18,0.46)',
              textShadow: '0 1px 12px rgba(0,0,0,0.32)',
            } as React.CSSProperties)
          : overStory
            ? ({
                '--color-canvas': '#161617',
                '--color-surface': '#2a2a2d',
                '--color-ink': '#f5f5f7',
                '--color-ink-2': '#d2d2d7',
                '--color-muted': '#a1a1a6',
                '--color-line': 'rgba(255,255,255,0.1)',
              } as React.CSSProperties)
            : null),
      }}
    >
      {/* The full row needs about 1,050px. It used to switch on at md (768px)
          and ran off the side of every tablet, so the page scrolled sideways.
          It now starts at lg, where the bar carries the mark alone — the way
          a product site's global bar does — and the farmers' link only from
          xl, which leaves room for the Marathi and Hindi labels too. */}
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" aria-label={t('common.brand')} className="flex items-center gap-2 font-semibold tracking-tight">
          <BrandMark />
          <span className="hidden whitespace-nowrap sm:block lg:hidden">{t('common.brand')}</span>
        </Link>

        <div className="ml-4 hidden items-center gap-1 lg:flex">
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

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link href="/shetkari" className="hidden whitespace-nowrap rounded-full px-3 py-2 xl:block text-sm text-[var(--color-muted)] transition hover:text-[var(--color-ink)]">
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
            <NavProgress />
          </Link>
        </div>

        <button
          type="button"
          aria-label={t('nav.menu')}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="ml-auto grid h-10 w-10 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-ink)_7%,transparent)] lg:hidden cursor-pointer"
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
            className="glass border-t border-[var(--color-line)] backdrop-blur-xl backdrop-saturate-150 lg:hidden"
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
