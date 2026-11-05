'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useIntl } from '@/i18n/provider';
import { PHOTOS } from '@/lib/photo-credits';
import { Photo, PhotoCredit } from '../ui/Photo';
import { ramp } from '@/lib/ramp';

/* A photograph that arrives as a card and opens out to fill the screen as you
 * scroll into it, then holds while the words come up over it.
 *
 * Everything that moves is a transform or a radius — no width, no height, no
 * layout — so the browser composites it rather than laying the page out again
 * sixty times a second. The frame shrinks the picture while the picture inside
 * it grows back by less, which is what keeps the reveal from reading as a
 * plain zoom. Reduced motion gets the finished state and a normal-height
 * section instead of the long sticky runway. */

const PHOTO = 'mhapan-coast';

export function GrowPhoto() {
  const { t } = useIntl();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  const scale = useTransform(p, [0, 0.6], [0.8, 1]);
  const radius = useTransform(p, [0, 0.6], [32, 0]);
  const inner = useTransform(p, [0, 0.6], [1.14, 1]);
  const textOpacity = useTransform(p, ramp(0.5, 0.82, 0, 1));
  const textY = useTransform(p, [0.5, 0.82], [32, 0]);

  const photo = PHOTOS[PHOTO];
  if (!photo) return null;

  const words = (
    <>
      <h2 className="max-w-3xl text-[clamp(2rem,5.4vw,4rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-white">
        {t('story.closer.title')}
      </h2>
      <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/80">{t('story.closer.sub')}</p>
      <PhotoCredit photo={photo} className="mt-6 block text-white/60" />
    </>
  );

  if (reduced) {
    return (
      <section id="closer" data-tone="dark" className="relative h-[92svh] scroll-mt-16 overflow-hidden">
        <div className="absolute inset-0">
          <Photo photo={photo} sizes="100vw" className="h-full w-full" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">{words}</div>
      </section>
    );
  }

  return (
    <section id="closer" ref={ref} data-tone="dark" className="relative h-[210vh] scroll-mt-16">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <motion.div
          style={{ scale, borderRadius: radius }}
          className="relative h-full w-full overflow-hidden will-change-transform"
        >
          <motion.div style={{ scale: inner }} className="absolute inset-0 will-change-transform">
            <Photo photo={photo} sizes="100vw" className="h-full w-full" />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
          <motion.div
            style={{ opacity: textOpacity, y: textY }}
            className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24"
          >
            {words}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
