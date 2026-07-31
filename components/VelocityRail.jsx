'use client';

import { useEffect, useRef } from 'react';

/*
  Scroll velocity rail.
  - Top progress bar charged by scroll depth.
  - Page-wide "warp" class while scrolling fast, which drives the speed-line overlay in CSS.
*/

export default function VelocityRail() {
  const barRef = useRef(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return undefined;

    let lastY = window.scrollY;
    let warpTimer = 0;
    let ticking = false;

    function update() {
      ticking = false;
      const scrollTop = window.scrollY;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(scrollTop / scrollable, 1) : 0;
      bar.style.transform = `scaleX(${progress})`;

      const speed = Math.abs(scrollTop - lastY);
      lastY = scrollTop;

      if (speed > 34) {
        document.body.classList.add('is-warping');
        document.documentElement.style.setProperty('--warp', String(Math.min(speed / 120, 1)));
        window.clearTimeout(warpTimer);
        warpTimer = window.setTimeout(() => {
          document.body.classList.remove('is-warping');
          document.documentElement.style.setProperty('--warp', '0');
        }, 180);
      }
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.clearTimeout(warpTimer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      document.body.classList.remove('is-warping');
    };
  }, []);

  return (
    <div className="velocity-rail" aria-hidden="true">
      <span ref={barRef} />
    </div>
  );
}
