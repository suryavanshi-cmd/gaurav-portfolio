'use client';

import { useEffect, useRef } from 'react';

/*
  Pointer-driven plasma cursor.
  - A core dot that snaps to the pointer and a lagging ring that stretches with velocity.
  - Grows when hovering interactive elements.
  - Only activates for fine pointers (mouse/trackpad) and non-reduced-motion users.
*/

export default function CursorTrail() {
  const coreRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    const core = coreRef.current;
    const ring = ringRef.current;
    if (!core || !ring) return undefined;

    const finePointer = window.matchMedia('(pointer: fine)');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!finePointer.matches || reduceMotion.matches) return undefined;

    document.body.classList.add('has-plasma-cursor');

    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let ringX = pointerX;
    let ringY = pointerY;
    let velocity = 0;
    let frame = 0;

    function handleMove(event) {
      const dx = event.clientX - pointerX;
      const dy = event.clientY - pointerY;
      velocity = Math.min(Math.hypot(dx, dy), 90);
      pointerX = event.clientX;
      pointerY = event.clientY;

      const interactive = event.target instanceof Element
        && event.target.closest('a, button, input, textarea, [role="button"], .project-card');
      ring.classList.toggle('is-hot', Boolean(interactive));
    }

    function handleDown() {
      ring.classList.add('is-firing');
    }

    function handleUp() {
      ring.classList.remove('is-firing');
    }

    function loop() {
      frame = window.requestAnimationFrame(loop);
      ringX += (pointerX - ringX) * 0.18;
      ringY += (pointerY - ringY) * 0.18;
      velocity *= 0.9;

      const stretch = 1 + Math.min(velocity / 42, 0.85);
      const squash = 1 / stretch;
      const angle = (Math.atan2(pointerY - ringY, pointerX - ringX) * 180) / Math.PI;

      core.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0) translate(-50%, -50%)`;
      ring.style.transform =
        `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) rotate(${angle}deg) scale(${stretch}, ${squash})`;
      ring.style.opacity = String(Math.min(0.35 + velocity / 60, 1));
    }

    frame = window.requestAnimationFrame(loop);
    window.addEventListener('pointermove', handleMove, { passive: true });
    window.addEventListener('pointerdown', handleDown, { passive: true });
    window.addEventListener('pointerup', handleUp, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointerup', handleUp);
      document.body.classList.remove('has-plasma-cursor');
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="plasma-ring" aria-hidden="true" />
      <div ref={coreRef} className="plasma-core" aria-hidden="true" />
    </>
  );
}
