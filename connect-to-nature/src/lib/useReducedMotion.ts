'use client';

import { useSyncExternalStore } from 'react';

/* prefers-reduced-motion, without the hydration mismatch.
 *
 * motion's own useReducedMotion reads the media query during the first client
 * render. The server cannot know the answer and renders as if motion were
 * allowed, so any component that renders different markup when motion is
 * reduced — Reveal dropping its wrapper, the gallery dropping its play button —
 * disagreed with the server's HTML on exactly the visitors who asked for less
 * motion, and React threw away the tree to recover (error #418).
 *
 * useSyncExternalStore is React's answer to this: the server snapshot is used
 * while hydrating, and the real value is swapped in straight afterwards. */

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
