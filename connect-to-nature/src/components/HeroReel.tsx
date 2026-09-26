'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { REEL_BLUR } from '@/lib/reel';

/* The moving background on the front page.
 *
 * Three rules, in this order:
 *
 *   1. The poster is the picture. It is an AVIF of the reel's own first frame,
 *      it is what gets measured as the largest paint, and it is the whole hero
 *      for anyone who never gets the video — which is most people on a first
 *      visit, because the video does not start downloading until the page has
 *      finished doing everything else.
 *   2. Nobody pays for motion they did not ask for. Reduced motion, Save-Data
 *      and metered or 2g/3g connections keep the still and never fetch the
 *      video at all.
 *   3. It stops when it is not being watched — scrolled past, or the tab in
 *      the background — because a looping decode is the most expensive thing
 *      on an idle phone.
 */

const IDLE = typeof window !== 'undefined' && 'requestIdleCallback' in window
  ? window.requestIdleCallback.bind(window)
  : (fn: () => void) => setTimeout(fn, 900);

function wantsMotion(): boolean {
  if (typeof navigator === 'undefined') return false;
  const net = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  if (!net) return true;
  if (net.saveData) return false;
  return !(net.effectiveType === 'slow-2g' || net.effectiveType === '2g' || net.effectiveType === '3g');
}

export function HeroReel({ className = '' }: { className?: string }) {
  const reduced = useReducedMotion();
  const video = useRef<HTMLVideoElement>(null);
  const [armed, setArmed] = useState(false);
  const [playing, setPlaying] = useState(false);

  /* Wait for the page to be done, then for the browser to be bored, then ask
     for the video. */
  useEffect(() => {
    if (reduced || !wantsMotion()) return;
    let cancelled = false;
    const arm = () => IDLE(() => { if (!cancelled) setArmed(true); });
    if (document.readyState === 'complete') arm();
    else window.addEventListener('load', arm, { once: true });
    return () => { cancelled = true; window.removeEventListener('load', arm); };
  }, [reduced]);

  /* Only run while it is on screen and the tab is in front. */
  useEffect(() => {
    const el = video.current;
    if (!el || !armed) return;

    let onScreen = true;
    const sync = () => {
      if (onScreen && !document.hidden) void el.play().catch(() => {});
      else el.pause();
    };
    const observer = new IntersectionObserver(
      ([entry]) => { onScreen = entry.isIntersecting; sync(); },
      { threshold: 0.05 },
    );
    observer.observe(el);
    document.addEventListener('visibilitychange', sync);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); };
  }, [armed]);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {/* Painted first, under everything, so there is never a white frame. */}
      <div
        className="absolute inset-0 scale-110 blur-xl"
        style={{ backgroundImage: `url("${REEL_BLUR}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />

      <picture>
        <source type="image/avif" srcSet="/reel/poster.avif" />
        <img
          src="/reel/poster.jpg"
          alt=""
          width={1280}
          height={720}
          fetchPriority="high"
          decoding="sync"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ${playing ? 'opacity-0' : 'opacity-100'}`}
        />
      </picture>

      {armed && (
        <video
          ref={video}
          muted
          loop
          playsInline
          preload="auto"
          /* Deliberately no poster attribute: the <img> above is already
             showing that exact frame, and setting it here makes the browser
             fetch the JPEG a second time — seventy kilobytes for a picture
             that is never painted. */
          onPlaying={() => setPlaying(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ${playing ? 'opacity-100' : 'opacity-0'}`}
        >
          <source src="/reel/konkan.webm" type="video/webm" />
          <source src="/reel/konkan.mp4" type="video/mp4" />
        </video>
      )}

      {/* Three scrims, and they are all doing something.
          One: a bar under the navigation, so links clear the sky.
          Two: the bottom two-thirds pulled down hard — this is what the
          headline and the stat card actually sit on.
          Three: a pool in the bottom-left corner, under the words themselves,
          because a sunset will happily put a white sun exactly there. */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(6,10,14,0.46)_0%,rgba(6,10,14,0.10)_22%,rgba(6,10,14,0.30)_52%,rgba(6,10,14,0.72)_88%,var(--color-canvas)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(135%_90%_at_10%_92%,rgba(4,8,12,0.66),transparent_58%)]" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[var(--color-canvas)]" />
    </div>
  );
}
