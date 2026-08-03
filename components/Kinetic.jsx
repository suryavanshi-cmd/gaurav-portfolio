'use client';

import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* Terminal-style typewriter that cycles through a list of phrases. */
export function TypeCycle({ phrases, className, typeSpeed = 52, holdTime = 1500 }) {
  const [display, setDisplay] = useState(phrases[0] || '');
  const stateRef = useRef({ phrase: 0, character: 0, deleting: false });

  useEffect(() => {
    if (prefersReducedMotion() || phrases.length === 0) {
      setDisplay(phrases[0] || '');
      return undefined;
    }

    stateRef.current = { phrase: 0, character: 0, deleting: false };
    let timer = 0;

    function step() {
      const state = stateRef.current;
      const current = phrases[state.phrase % phrases.length];

      if (!state.deleting) {
        state.character += 1;
        setDisplay(current.slice(0, state.character));
        if (state.character >= current.length) {
          state.deleting = true;
          timer = window.setTimeout(step, holdTime);
          return;
        }
        timer = window.setTimeout(step, typeSpeed + Math.random() * 40);
        return;
      }

      state.character -= 1;
      setDisplay(current.slice(0, state.character));
      if (state.character <= 0) {
        state.deleting = false;
        state.phrase += 1;
      }
      timer = window.setTimeout(step, typeSpeed * 0.45);
    }

    timer = window.setTimeout(step, 420);
    return () => window.clearTimeout(timer);
  }, [phrases, typeSpeed, holdTime]);

  return (
    <span className={className}>
      {display}
      <i className="type-caret" aria-hidden="true" />
    </span>
  );
}

/* Counts up to a value the first time it scrolls into view. */
export function CountUp({ value, suffix = '', prefix = '', duration = 1100, className }) {
  const [display, setDisplay] = useState(0);
  const nodeRef = useRef(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return undefined;
    if (prefersReducedMotion()) {
      setDisplay(value);
      return undefined;
    }

    let frame = 0;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - (1 - progress) ** 3;
          setDisplay(Math.round(value * eased));
          if (progress < 1) frame = window.requestAnimationFrame(tick);
        };
        frame = window.requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });

    observer.observe(node);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return <span ref={nodeRef} className={className}>{prefix}{display}{suffix}</span>;
}
