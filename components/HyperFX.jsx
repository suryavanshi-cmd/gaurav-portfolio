'use client';

import { useEffect } from 'react';
import CursorTrail from './CursorTrail';
import VelocityRail from './VelocityRail';

/*
  Global motion layer.
  - Reveals [data-reveal] elements as they enter the viewport; a MutationObserver
    keeps newly mounted nodes (e.g. project cards re-created by filtering)
    registered, so nothing stays stuck at opacity 0.
  - Pointer-tracked spotlight + tilt on [data-tilt] and magnetic pull on
    [data-magnetic], coalesced into one rAF per frame. Transforms are written as
    INLINE styles so they cannot lose specificity fights with reveal offsets or
    legacy :hover transforms in the older stylesheets.
  - Konami code enables OVERDRIVE.
  Everything degrades to static layout when the user prefers reduced motion.
*/

const KONAMI = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

export default function HyperFX() {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarsePointer = window.matchMedia('(pointer: coarse)');

    /* ----- Reveal on scroll -------------------------------------------- */

    let io = null;
    let mo = null;

    if (reduceMotion.matches) {
      document.querySelectorAll('[data-reveal]').forEach((node) => node.classList.add('is-revealed'));
      // New nodes must still get the class or they stay transparent.
      mo = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (!(node instanceof Element)) return;
            if (node.matches('[data-reveal]')) node.classList.add('is-revealed');
            node.querySelectorAll('[data-reveal]').forEach((child) => child.classList.add('is-revealed'));
          });
        });
      });
      mo.observe(document.body, { childList: true, subtree: true });
    } else {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-revealed');
            io.unobserve(entry.target);
          });
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
      );
      const watch = (node) => {
        if (!node.classList.contains('is-revealed')) io.observe(node);
      };
      document.querySelectorAll('[data-reveal]').forEach(watch);
      mo = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (!(node instanceof Element)) return;
            if (node.matches('[data-reveal]')) watch(node);
            node.querySelectorAll('[data-reveal]').forEach(watch);
          });
        });
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }

    /* ----- Pointer pipeline: tilt + magnet, one rAF per frame ----------- */

    let pointerX = 0;
    let pointerY = 0;
    let pointerTarget = null;
    let frameQueued = false;
    let activeTilt = null;
    let activeMagnet = null;

    function resetTilt(surface) {
      if (!surface) return;
      surface.style.transform = '';
      surface.classList.remove('is-live');
    }

    function resetMagnet(node) {
      if (!node) return;
      node.style.transform = '';
      node.classList.remove('is-pulled');
    }

    function processFrame() {
      frameQueued = false;
      if (reduceMotion.matches || coarsePointer.matches) return;
      const target = pointerTarget instanceof Element ? pointerTarget : null;

      // Tilt: hit-test once per frame; internal child boundaries resolve to the
      // same surface, so no flicker, and leaving the surface resets it.
      const tilt = target ? target.closest('[data-tilt]') : null;
      if (tilt !== activeTilt) {
        resetTilt(activeTilt);
        activeTilt = tilt;
      }
      if (tilt) {
        const rect = tilt.getBoundingClientRect();
        const px = clamp((pointerX - rect.left) / rect.width, 0, 1);
        const py = clamp((pointerY - rect.top) / rect.height, 0, 1);
        tilt.style.setProperty('--mx', `${px * 100}%`);
        tilt.style.setProperty('--my', `${py * 100}%`);
        tilt.style.transform =
          `perspective(900px) rotateX(${((0.5 - py) * 9).toFixed(2)}deg) rotateY(${((px - 0.5) * 11).toFixed(2)}deg)`;
        tilt.classList.add('is-live');
      }

      const magnet = target ? target.closest('[data-magnetic]') : null;
      if (magnet !== activeMagnet) {
        resetMagnet(activeMagnet);
        activeMagnet = magnet;
      }
      if (magnet) {
        const rect = magnet.getBoundingClientRect();
        const dx = clamp((pointerX - (rect.left + rect.width / 2)) * 0.28, -16, 16);
        const dy = clamp((pointerY - (rect.top + rect.height / 2)) * 0.34, -12, 12);
        magnet.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
        magnet.classList.add('is-pulled');
      }
    }

    function handleMove(event) {
      pointerX = event.clientX;
      pointerY = event.clientY;
      pointerTarget = event.target;
      if (!frameQueued) {
        frameQueued = true;
        window.requestAnimationFrame(processFrame);
      }
    }

    function handleWindowExit() {
      resetTilt(activeTilt);
      resetMagnet(activeMagnet);
      activeTilt = null;
      activeMagnet = null;
    }

    /* ----- Konami ------------------------------------------------------- */

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

    window.addEventListener('pointermove', handleMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', handleWindowExit);
    window.addEventListener('blur', handleWindowExit);
    window.addEventListener('keydown', handleKey);

    return () => {
      if (io) io.disconnect();
      if (mo) mo.disconnect();
      window.removeEventListener('pointermove', handleMove);
      document.documentElement.removeEventListener('mouseleave', handleWindowExit);
      window.removeEventListener('blur', handleWindowExit);
      window.removeEventListener('keydown', handleKey);
      handleWindowExit();
    };
  }, []);

  return (
    <>
      <VelocityRail />
      <CursorTrail />
      <div className="scanline-veil" aria-hidden="true" />
      <div className="warp-lines" aria-hidden="true">
        <i /><i /><i /><i /><i /><i /><i /><i />
      </div>
    </>
  );
}
