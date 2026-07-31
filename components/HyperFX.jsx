'use client';

import { useEffect } from 'react';
import CursorTrail from './CursorTrail';
import LightningField from './LightningField';
import VelocityRail from './VelocityRail';

/*
  Global motion layer.
  - Reveals [data-reveal] elements as they enter the viewport.
  - Adds pointer-tracked spotlight + tilt to [data-tilt] surfaces.
  - Adds magnetic pull to [data-magnetic] buttons.
  - Konami code enables OVERDRIVE, a faster and louder variant of the whole site.
  Everything degrades to static layout when the user prefers reduced motion.
*/

const KONAMI = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

export default function HyperFX() {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarsePointer = window.matchMedia('(pointer: coarse)');

    const revealed = new WeakSet();
    let observer = null;

    if (reduceMotion.matches) {
      document.querySelectorAll('[data-reveal]').forEach((node) => node.classList.add('is-revealed'));
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting || revealed.has(entry.target)) return;
            revealed.add(entry.target);
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          });
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
      );
      document.querySelectorAll('[data-reveal]').forEach((node) => observer.observe(node));
    }

    function handleTilt(event) {
      if (reduceMotion.matches || coarsePointer.matches) return;
      const surface = event.target instanceof Element ? event.target.closest('[data-tilt]') : null;
      if (!surface) return;
      const rect = surface.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      surface.style.setProperty('--mx', `${px * 100}%`);
      surface.style.setProperty('--my', `${py * 100}%`);
      surface.style.setProperty('--rx', `${(0.5 - py) * 9}deg`);
      surface.style.setProperty('--ry', `${(px - 0.5) * 11}deg`);
      surface.classList.add('is-live');
    }

    function resetTilt(event) {
      const surface = event.target instanceof Element ? event.target.closest('[data-tilt]') : null;
      if (!surface) return;
      surface.style.setProperty('--rx', '0deg');
      surface.style.setProperty('--ry', '0deg');
      surface.classList.remove('is-live');
    }

    function handleMagnet(event) {
      if (reduceMotion.matches || coarsePointer.matches) return;
      const target = event.target instanceof Element ? event.target.closest('[data-magnetic]') : null;
      document.querySelectorAll('[data-magnetic].is-pulled').forEach((node) => {
        if (node === target) return;
        node.classList.remove('is-pulled');
        node.style.setProperty('--pull-x', '0px');
        node.style.setProperty('--pull-y', '0px');
      });
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      target.classList.add('is-pulled');
      target.style.setProperty('--pull-x', `${Math.max(Math.min(dx * 0.28, 16), -16)}px`);
      target.style.setProperty('--pull-y', `${Math.max(Math.min(dy * 0.34, 12), -12)}px`);
    }

    let konamiIndex = 0;
    function handleKey(event) {
      const expected = KONAMI[konamiIndex];
      if (event.key.toLowerCase() === expected.toLowerCase()) {
        konamiIndex += 1;
        if (konamiIndex === KONAMI.length) {
          konamiIndex = 0;
          window.dispatchEvent(new CustomEvent('portfolio:overdrive'));
        }
        return;
      }
      konamiIndex = event.key === KONAMI[0] ? 1 : 0;
    }

    window.addEventListener('pointermove', handleTilt, { passive: true });
    window.addEventListener('pointermove', handleMagnet, { passive: true });
    window.addEventListener('pointerleave', resetTilt, { passive: true });
    document.addEventListener('mouseout', resetTilt, { passive: true });
    window.addEventListener('keydown', handleKey);

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('pointermove', handleTilt);
      window.removeEventListener('pointermove', handleMagnet);
      window.removeEventListener('pointerleave', resetTilt);
      document.removeEventListener('mouseout', resetTilt);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  return (
    <>
      <VelocityRail />
      <LightningField />
      <CursorTrail />
      <div className="scanline-veil" aria-hidden="true" />
      <div className="warp-lines" aria-hidden="true">
        <i /><i /><i /><i /><i /><i /><i /><i />
      </div>
    </>
  );
}
