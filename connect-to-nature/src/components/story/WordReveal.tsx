'use client';

import { useRef } from 'react';
import { useMotionValueEvent, useScroll } from 'motion/react';
import { useIntl } from '@/i18n/provider';
import { useReducedMotion } from '@/lib/useReducedMotion';

/* One sentence, set large, that lights up a word at a time as it is scrolled
 * through — so it is read at the speed it is scrolled, which is the speed the
 * visitor chose. Splitting on spaces works for all three languages here, and
 * the text stays one paragraph to a screen reader.
 *
 * There is exactly one scroll subscriber. It writes the progress into a single
 * custom property on the paragraph, and each word works out its own opacity
 * from that in CSS, against the slice of the range it owns. The first version
 * gave every word its own animated value: thirty-odd motion components to
 * hydrate and thirty scroll listeners, for what is one number. */

export function WordReveal({ textKey }: { textKey: string }) {
  const { t } = useIntl();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.45'] });

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    ref.current?.style.setProperty('--p', value.toFixed(4));
  });

  const words = t(textKey).split(/\s+/);
  const n = words.length;

  return (
    <section data-tone="dark" className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-40">
      <p
        ref={ref}
        style={{ '--p': reduced ? 1 : 0 } as React.CSSProperties}
        className="max-w-4xl text-[clamp(1.75rem,4.4vw,3.4rem)] font-semibold leading-[1.18] tracking-[-0.028em]"
      >
        {words.map((word, i) => (
          <span
            key={`${i}-${word}`}
            /* 0.16 until the paragraph's progress reaches this word's slice,
               then up to 1 across the slice. n turns progress into "how many
               words in", so i is where this one starts. */
            style={{ opacity: `clamp(0.16, calc(0.16 + (var(--p) * ${n} - ${i}) * 0.84), 1)` }}
          >
            {word}{' '}
          </span>
        ))}
      </p>
    </section>
  );
}
