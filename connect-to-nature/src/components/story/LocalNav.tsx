'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useMotionValueEvent, useScroll } from 'motion/react';
import clsx from 'clsx';
import { useIntl } from '@/i18n/provider';
import { toneAt } from '@/lib/tone';

/* The second bar a product page has: the name of the thing on the left, the
 * sections on the right, and the one action. It sits in the page flow just
 * under the hero and sticks once it reaches the site's own bar. That bar slides
 * away on the way down and this one moves up into its place; on the way back
 * up it returns and this one steps down beneath it, so a phone only spends two
 * bars' worth of screen on chrome while someone is heading back up the page.
 *
 * Its colours follow whatever it is floating over. Every section on the front
 * page says whether it is dark or light, and the bar reads the one beneath its
 * bottom edge — so it is dark glass over the story and light glass over the
 * farms, rather than a dark strip across a white page. */

const LINKS = [
  { id: 'highlights', key: 'story.local.highlights' },
  { id: 'look', key: 'story.local.look' },
  { id: 'day', key: 'story.local.day' },
  { id: 'regions', key: 'story.local.regions' },
  { id: 'farms', key: 'story.local.farms' },
  { id: 'trips', key: 'story.local.trips' },
] as const;

const HEIGHT = 48;
const IDS = LINKS.map((link) => link.id);

export function LocalNav() {
  const { t } = useIntl();
  const { scrollY } = useScroll();
  const [tone, setTone] = useState<'dark' | 'light'>('dark');
  const [active, setActive] = useState<string | null>(null);

  const read = useCallback(() => {
    const offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 0;
    const here = toneAt(offset + HEIGHT + 1, IDS);
    setTone(here.tone);
    setActive(here.id);
  }, []);

  useMotionValueEvent(scrollY, 'change', read);
  useEffect(read, [read]);

  const dark = tone === 'dark';

  return (
    <div
      className={clsx(
        /* Takes no room in the flow: it floats over the top of the next
           section instead of leaving a strip of page colour under the hero. */
        'sticky top-[var(--nav-h,64px)] z-30 -mb-12 border-b backdrop-blur-xl backdrop-saturate-150',
        'transition-[top,background-color,border-color,color] duration-500 ease-[var(--ease-spring)]',
        dark
          ? 'border-white/10 bg-[rgba(22,22,23,0.72)] text-white'
          : 'border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-canvas)_80%,transparent)] text-[var(--color-ink)]',
      )}
    >
      <nav
        aria-label={t('story.local.label')}
        className="mx-auto flex h-12 max-w-6xl items-center gap-4 px-4 sm:px-6"
      >
        <a href="#top" className="text-[17px] font-semibold tracking-[-0.015em] sm:text-[19px]">
          {t('common.brand')}
        </a>

        <ul className="ml-auto hidden items-center gap-6 lg:flex">
          {LINKS.map((link) => (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                aria-current={active === link.id ? 'location' : undefined}
                className={clsx(
                  'whitespace-nowrap text-[12px] transition-opacity duration-300',
                  active === link.id ? 'opacity-100' : 'opacity-70 hover:opacity-100',
                )}
              >
                {t(link.key)}
              </a>
            </li>
          ))}
        </ul>

        <Link href="/planner" className="btn btn-primary ml-auto px-3.5 py-1.5 text-[12px] lg:ml-0">
          {t('nav.cta')}
        </Link>
      </nav>
    </div>
  );
}
