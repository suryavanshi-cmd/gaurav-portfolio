'use client';

import { useEffect, useRef } from 'react';

/*
  Top scroll-progress rail. The scrollable height is cached and refreshed by
  a ResizeObserver on <body> instead of reading scrollHeight inside the
  scroll handler — that read forces layout, and with content-visibility
  sections it is not cheap.
*/

export default function VelocityRail() {
  const barRef = useRef(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return undefined;

    let ticking = false;
    let scrollable = 1;

    function measure() {
      scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    }

    function update() {
      ticking = false;
      const scrollTop = window.scrollY;
      bar.style.transform = `scaleX(${Math.min(scrollTop / scrollable, 1)})`;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    function onResize() {
      measure();
      onScroll();
    }

    measure();
    update();

    const resizeObserver = new ResizeObserver(() => {
      measure();
      onScroll();
    });
    resizeObserver.observe(document.body);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div className="velocity-rail" aria-hidden="true">
      <span ref={barRef} />
    </div>
  );
}
