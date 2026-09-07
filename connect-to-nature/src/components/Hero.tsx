'use client';

import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { useIntl } from '@/i18n/provider';
import { FieldBackdrop } from './FieldBackdrop';
import type { Region } from '@/lib/types';

export function Hero({ regions, farmCount }: { regions: Region[]; farmCount: number }) {
  const { t } = useIntl();
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  /* Three speeds: the sky barely moves, the field follows the scroll, the words
     leave first. Enough depth to notice, not enough to see the trick. */
  const skyY = useTransform(scrollYProgress, [0, 1], ['0%', reduced ? '0%' : '8%']);
  const fieldY = useTransform(scrollYProgress, [0, 1], ['0%', reduced ? '0%' : '22%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', reduced ? '0%' : '-12%']);
  const fade = useTransform(scrollYProgress, [0, 0.75], [1, reduced ? 1 : 0.1]);

  const districts = regions.reduce((total, region) => total + (region.districts?.length ?? 0), 0);

  const stats = [
    { value: farmCount, label: t('hero.statFarms') },
    { value: regions.length, label: t('hero.statDivisions') },
    { value: districts, label: t('hero.statDistricts') },
    { value: 3, label: t('hero.statLangs') },
  ];

  return (
    <section
      ref={ref}
      className="relative -mt-16 flex min-h-[94svh] flex-col justify-end overflow-hidden pt-16"
    >
      <motion.div
        style={{ y: skyY }}
        className="absolute inset-0 -z-20"
        aria-hidden="true"
      >
        <div className="h-full w-full bg-[linear-gradient(to_bottom,var(--sky-top),var(--sky-bottom))]" />
      </motion.div>

      <motion.div style={{ y: fieldY }} className="absolute inset-x-0 bottom-0 -z-10 h-[52%]">
        <FieldBackdrop className="h-full w-full" />
        {/* The field is carried into the page background so the section ends
            without a seam. */}
        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-transparent to-[var(--color-canvas)]" />
      </motion.div>

      <motion.div style={{ y: textY, opacity: fade }} className="mx-auto w-full max-w-6xl px-4 pb-28 sm:px-6 sm:pb-36">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-2)]"
        >
          {t('hero.eyebrow')}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 max-w-3xl text-[clamp(2.4rem,6.2vw,4.4rem)] font-semibold leading-[1.05] tracking-[-0.03em]"
        >
          {t('hero.title')}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 max-w-xl text-[17px] leading-relaxed text-[var(--color-ink-2)]"
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
          <Link href="/explore" className="btn btn-outline bg-[color-mix(in_srgb,var(--color-surface)_72%,transparent)] px-6 py-3.5 text-[15px] backdrop-blur-md">
            {t('hero.ctaSecondary')}
          </Link>
        </motion.div>

        <motion.dl
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="glass mt-12 grid max-w-2xl grid-cols-2 gap-x-6 gap-y-5 rounded-[22px] border border-[color-mix(in_srgb,var(--color-line)_60%,transparent)] px-6 py-5 sm:grid-cols-4"
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
