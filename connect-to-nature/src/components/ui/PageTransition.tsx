'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

/* Route changes used to snap: one page vanished, the next appeared fully
   formed. This gives every navigation the same short rise-and-fade the rest of
   the app moves with, so moving between pages feels like one surface rather
   than a slideshow.
 *
 * It lives in template.tsx rather than layout.tsx because Next remounts a
 * template on every navigation and keeps a layout — remounting is exactly what
 * makes the entrance play again.
 *
 * 220ms, which is under the ~250ms where a transition starts to feel like a
 * wait, and the header sits outside it so the thing you just clicked does not
 * move under your finger. */
export function PageTransition({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
