'use client';

import { useEffect, useRef, useState } from 'react';

const REVEALED = 'is-in';

/*
  Reveals `[data-rise]` elements as they scroll into view.

  The hiding styles are gated behind `html[data-motion]`, set by the inline
  script in the layout before first paint and only when motion is wanted, so a
  visitor with reduced motion — or with the script blocked — gets a page that is
  simply visible and static. Nothing decorative is ever allowed to leave content
  permanently invisible.
*/
export function useReveal(deps = []) {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll('[data-rise]'));
    if (!nodes.length) return undefined;

    const showAll = () => nodes.forEach((node) => node.classList.add(REVEALED));

    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      typeof IntersectionObserver === 'undefined'
    ) {
      showAll();
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add(REVEALED);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.06 },
    );

    nodes.forEach((node) => {
      if (!node.classList.contains(REVEALED)) observer.observe(node);
    });

    /* An element in the last stretch of the document can never satisfy the
       negative bottom margin. The tolerance is loose because mobile browsers
       resize the viewport as their chrome collapses. */
    const atEnd = () => {
      const remaining =
        document.documentElement.scrollHeight - (window.innerHeight + window.scrollY);
      if (remaining > 160) return;
      showAll();
      window.removeEventListener('scroll', atEnd);
    };

    window.addEventListener('scroll', atEnd, { passive: true });
    atEnd();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', atEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/*
  Tracks which section is currently being read, for the section index.
  Returns the id of the section nearest the top of the viewport.
*/
export function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);
  const frame = useRef(0);

  useEffect(() => {
    const pick = () => {
      frame.current = 0;
      // The section whose top has most recently passed the reading line.
      const line = window.innerHeight * 0.32;
      let current = ids[0];
      ids.forEach((id) => {
        const node = document.getElementById(id);
        if (node && node.getBoundingClientRect().top <= line) current = id;
      });
      setActive(current);
    };

    const onScroll = () => {
      if (frame.current) return;
      frame.current = window.requestAnimationFrame(pick);
    };

    pick();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      if (frame.current) window.cancelAnimationFrame(frame.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ids]);

  return active;
}

/* Thin reading-progress line in the header. Written straight to the DOM inside
   a rAF frame so scrolling never re-renders the page. */
export function useProgress() {
  const ref = useRef(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      if (ref.current) ref.current.style.transform = `scaleX(${ratio})`;
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return ref;
}
