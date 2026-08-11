'use client';

import { useEffect } from 'react';
import VelocityRail from './VelocityRail';

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

export default function HyperFX() {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarsePointer = window.matchMedia('(pointer: coarse)');

    let io = null;
    let mo = null;

    const revealAddedNodes = (mutations, reveal) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches('[data-reveal]')) reveal(node);
          node.querySelectorAll('[data-reveal]').forEach(reveal);
        });
      });
    };

    if (reduceMotion.matches) {
      const revealImmediately = (node) => node.classList.add('is-revealed');
      document.querySelectorAll('[data-reveal]').forEach(revealImmediately);
      mo = new MutationObserver((mutations) => revealAddedNodes(mutations, revealImmediately));
      mo.observe(document.body, { childList: true, subtree: true });
    } else {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-revealed');
            io?.unobserve(entry.target);
          });
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
      );

      const watch = (node) => {
        if (!node.classList.contains('is-revealed')) io?.observe(node);
      };

      document.querySelectorAll('[data-reveal]').forEach(watch);
      mo = new MutationObserver((mutations) => revealAddedNodes(mutations, watch));
      mo.observe(document.body, { childList: true, subtree: true });
    }

    let pointerX = 0;
    let pointerY = 0;
    let pointerTarget = null;
    let frameId = 0;
    let activeTilt = null;

    function resetTilt(surface) {
      if (!surface) return;
      surface.style.transform = '';
      surface.classList.remove('is-live');
    }

    function processFrame() {
      frameId = 0;
      const target = pointerTarget instanceof Element ? pointerTarget : null;
      const tilt = target ? target.closest('[data-tilt]') : null;

      if (tilt !== activeTilt) {
        resetTilt(activeTilt);
        activeTilt = tilt;
      }

      if (!tilt) return;

      const rect = tilt.getBoundingClientRect();
      const px = clamp((pointerX - rect.left) / rect.width, 0, 1);
      const py = clamp((pointerY - rect.top) / rect.height, 0, 1);
      tilt.style.setProperty('--mx', `${px * 100}%`);
      tilt.style.setProperty('--my', `${py * 100}%`);
      tilt.style.transform =
        `perspective(1100px) rotateX(${((0.5 - py) * 4.5).toFixed(2)}deg) rotateY(${((px - 0.5) * 5.5).toFixed(2)}deg)`;
      tilt.classList.add('is-live');
    }

    function handleMove(event) {
      pointerX = event.clientX;
      pointerY = event.clientY;
      pointerTarget = event.target;
      if (!frameId) frameId = window.requestAnimationFrame(processFrame);
    }

    function handleWindowExit() {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
      resetTilt(activeTilt);
      activeTilt = null;
      pointerTarget = null;
    }

    const enablePointerEffects = !reduceMotion.matches && !coarsePointer.matches;
    if (enablePointerEffects) {
      window.addEventListener('pointermove', handleMove, { passive: true });
      document.documentElement.addEventListener('mouseleave', handleWindowExit);
      window.addEventListener('blur', handleWindowExit);
    }

    return () => {
      io?.disconnect();
      mo?.disconnect();
      if (enablePointerEffects) {
        window.removeEventListener('pointermove', handleMove);
        document.documentElement.removeEventListener('mouseleave', handleWindowExit);
        window.removeEventListener('blur', handleWindowExit);
      }
      handleWindowExit();
    };
  }, []);

  return <VelocityRail />;
}
