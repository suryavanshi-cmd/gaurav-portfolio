'use client';

import { useLinkStatus } from 'next/link';
import { motion } from 'motion/react';

/* Feedback for the gap between tapping a link and the next page rendering.
 *
 * Next prefetches links in the viewport, so most navigations are instant and
 * this never appears. The ones that are not instant — a farm page on a cold
 * cache, a phone on a slow connection — are exactly the ones where a person
 * taps again because nothing happened. useLinkStatus reports the pending state
 * of the link it is rendered inside, so the feedback is on the control that
 * was actually pressed rather than a bar at the top of the window.
 *
 * It waits 120ms before showing: a navigation faster than that reads as
 * instant, and a spinner that flashes is worse than no spinner. */
export function NavProgress() {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  return (
    <motion.span
      aria-hidden="true"
      className="ml-2 inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent"
      initial={{ opacity: 0, rotate: 0 }}
      animate={{ opacity: 0.65, rotate: 360 }}
      transition={{
        opacity: { delay: 0.12, duration: 0.15 },
        rotate: { repeat: Infinity, ease: 'linear', duration: 0.7 },
      }}
    />
  );
}
