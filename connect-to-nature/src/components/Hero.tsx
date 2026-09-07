'use client';

import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { useIntl } from '@/i18n/provider';
import { Scene } from './Scene';
import type { Region } from '@/lib/types';

export function Hero({ regions, farmCount }: { regions: Region[]; farmCount: number }) {
  const { t } = useIntl();
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  // Three layers moving at three speeds. Subtle enough that you notice the
  // depth and not the effect.
  const artY = useTransform(scrollYProgress, [0, 1], ['0%', reduced ? '0%' : '18%']);
  const artScale = useTransform(scrollYProgress, [0, 1], [1, reduced ? 1 : 1.12]);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', reduced ? '0%' : '-14%']);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, reduced ? 1 : 0.15]);

  const districts = regions.reduce((total, region) => total + (region.districts?.length ?? 0), 0);

  const stats = [
    { value: farmCount, label: t('hero.statFarms') },
    { value: regions.length, label: t('hero.statDivisions') },
    { value: districts, label: t('hero.statDistricts') },
    { value: 3, label: t('hero.statLangs') },
  ];

  return (
    <section ref={ref} className="relative -mt-16 flex min-h-[92svh] flex-col justify-end overflow-hidden pt-16">
      <motion.div style={{ y: artY, scale: artScale }} className="absolute inset-0 -z-10">
        <Scene scene="coast" seed="hero-kokan" className="h-full w-full" />
        {/* Two washes: one keeps the header legible over the sky, one carries
            the artwork into the page background behind the headline. */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-canvas)]/70 via-transparent to-[var(--color-canvas)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--color-canvas)] via-[var(--color-canvas)]/70 to-transparent" />
      </motion.div>

      <motion.div style={{ y: textY, opacity: fade }} className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink)]"
        >
          {t('hero.eyebrow')}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 max-w-4xl text-[clamp(2.4rem,6.4vw,4.6rem)] font-semibold leading-[1.05] tracking-[-0.03em]"
        >
          {t('hero.title')}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 max-w-2xl text-[17px] leading-relaxed text-[var(--color-ink-2)]"
        >
          {t('hero.sub')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 flex flex-wrap items-center gap-3"
        >
          <Link href="/planner" className="btn btn-primary px-6 py-3.5 text-[15px]">
            {t('hero.ctaPrimary')}
          </Link>
          <Link href="/explore" className="btn btn-outline px-6 py-3.5 text-[15px]">
            {t('hero.ctaSecondary')}
          </Link>
        </motion.div>

        <motion.dl
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="mt-12 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4"
        >
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="text-[26px] font-semibold tracking-tight tabular-nums">{stat.value}</dt>
              <dd className="text-[12px] leading-snug text-[var(--color-muted)]">{stat.label}</dd>
            </div>
          ))}
        </motion.dl>
      </motion.div>
    </section>
  );
}
