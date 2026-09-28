'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { useReveal } from './useReveal';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ----- Reveals, re-armed on every route --------------------------------- */

/* useReveal scans the DOM for [data-rise] once. Mounted in the layout and
   keyed on the path, it re-scans each time a new page renders. */
export function RevealOnRoute() {
  const pathname = usePathname();
  useReveal([pathname]);
  return null;
}

/* ----- Counter ----------------------------------------------------------- */

/* Counts up once, when it first scrolls into view. The final value is in the
   server markup, so without JS (or with reduced motion) the right number is
   simply there. */
export function Counter({ to, suffix = '', decimals = 0, duration = 1400 }) {
  const ref = useRef(null);
  const [value, setValue] = useState(to);

  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReduced() || typeof IntersectionObserver === 'undefined') return undefined;

    setValue(0);
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - (1 - t) ** 4;
        setValue(to * eased);
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.5 });

    observer.observe(node);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [to, duration]);

  return (
    <strong ref={ref} aria-label={`${to}${suffix}`}>
      <span aria-hidden="true">{value.toFixed(decimals)}{suffix}</span>
    </strong>
  );
}

/* ----- Rotating word ----------------------------------------------------- */

/* One word visible at a time. The outgoing word rises out as the incoming one
   rises in, and the slot animates its width to the new word so the sentence
   around it slides rather than jumps. Screen readers get the whole list. */
export function Rotator({ words, interval = 2200 }) {
  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState(null);
  const [width, setWidth] = useState(null);
  const measureRef = useRef(null);

  useEffect(() => {
    if (prefersReduced()) return undefined;
    const id = window.setInterval(() => {
      setIndex((current) => {
        setPrevious(current);
        return (current + 1) % words.length;
      });
    }, interval);
    return () => window.clearInterval(id);
  }, [words.length, interval]);

  useIsoLayoutEffect(() => {
    const node = measureRef.current;
    if (node) setWidth(node.offsetWidth);
  }, [index]);

  return (
    <span className="rotator-slot" style={width ? { width } : undefined}>
      <span className="sr-only">{words.join(', ')}</span>
      {previous !== null && previous !== index ? (
        <span key={`out-${previous}-${index}`} className="rotator-word is-out" aria-hidden="true">
          {words[previous]}
        </span>
      ) : null}
      <span key={`in-${index}`} ref={measureRef} className="rotator-word" aria-hidden="true">
        {words[index]}
      </span>
    </span>
  );
}

/* ----- Spotlight --------------------------------------------------------- */

/* One listener for a whole group of cards: it finds the card under the
   pointer and writes the pointer position onto it for the CSS gradient. */
export function SpotlightGroup({ children, className = '' }) {
  const onMove = useCallback((event) => {
    const card = event.target.closest?.('.card');
    if (!card) return;
    const box = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${event.clientX - box.left}px`);
    card.style.setProperty('--my', `${event.clientY - box.top}px`);
  }, []);

  return (
    <div className={className} onPointerMove={onMove}>
      {children}
    </div>
  );
}

/* ----- Toast ------------------------------------------------------------- */

export function useToast() {
  const [message, setMessage] = useState('');
  const [on, setOn] = useState(false);
  const timer = useRef(0);

  const show = useCallback((text) => {
    window.clearTimeout(timer.current);
    setMessage(text);
    setOn(true);
    timer.current = window.setTimeout(() => setOn(false), 2200);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const node = typeof document === 'undefined'
    ? null
    : createPortal(
      <div className={`toast ${on ? 'is-on' : ''}`} role="status" aria-live="polite">{message}</div>,
      document.body,
    );

  return [show, node];
}

/* ----- Copy email -------------------------------------------------------- */

/* Copies the address and says so. If the clipboard is unavailable (an
   insecure context, or permission denied) it falls back to opening mail. */
export function CopyEmail({ email, className = 'btn btn-primary', children }) {
  const [show, toast] = useToast();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const copy = async (event) => {
    if (!navigator.clipboard) return;
    event.preventDefault();
    try {
      await navigator.clipboard.writeText(email);
      show('Email copied — paste it anywhere');
    } catch {
      window.location.href = `mailto:${email}`;
    }
  };

  return (
    <>
      <a href={`mailto:${email}`} className={className} onClick={copy}>
        {children || 'Copy my email'}
      </a>
      {mounted ? toast : null}
    </>
  );
}

/* ----- Segmented control ------------------------------------------------- */

export function Segmented({ options, value, onChange, label }) {
  const hostRef = useRef(null);
  const [thumb, setThumb] = useState(null);

  const measure = useCallback(() => {
    const active = hostRef.current?.querySelector('button.is-on');
    if (active) setThumb({ x: active.offsetLeft, w: active.offsetWidth });
  }, []);

  useIsoLayoutEffect(() => { measure(); }, [value, measure]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    document.fonts?.ready?.then(measure).catch(() => {});
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  return (
    <div
      ref={hostRef}
      className="seg"
      role="group"
      aria-label={label}
      style={thumb ? { '--seg-x': `${thumb.x}px`, '--seg-w': `${thumb.w}px` } : undefined}
    >
      <span className="seg-thumb" aria-hidden="true" style={thumb ? undefined : { opacity: 0 }} />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? 'is-on' : ''}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {typeof option.count === 'number' ? <span className="muted"> {option.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

/* ----- Reading progress -------------------------------------------------- */

export function ReadingBar({ targetId }) {
  const barRef = useRef(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const target = document.getElementById(targetId);
      if (!target || !barRef.current) return;
      const box = target.getBoundingClientRect();
      const total = box.height - window.innerHeight;
      const ratio = total > 0 ? Math.min(1, Math.max(0, -box.top / total)) : 1;
      barRef.current.style.transform = `scaleX(${ratio})`;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [targetId]);

  return <div className="reading-bar" aria-hidden="true"><i ref={barRef} /></div>;
}

/* ----- Pune clock -------------------------------------------------------- */

/* Local time in Pune, and the current temperature from Open-Meteo (no key).
   Both render empty on the server — the clock would guarantee a hydration
   mismatch — and a slow or failed weather request simply never shows. */
export function PuneClock() {
  const [time, setTime] = useState(null);
  const [temp, setTemp] = useState(null);

  useEffect(() => {
    const format = () => {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
      }).formatToParts(new Date());
      return {
        h: parts.find((p) => p.type === 'hour')?.value,
        m: parts.find((p) => p.type === 'minute')?.value,
      };
    };
    setTime(format());
    const id = window.setInterval(() => setTime(format()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    const timer = window.setTimeout(() => abort.abort(), 6000);
    fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=18.5204&longitude=73.8567&current=temperature_2m&timezone=Asia%2FKolkata',
      { signal: abort.signal },
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const value = d?.current?.temperature_2m;
        if (typeof value === 'number') setTemp(Math.round(value));
      })
      .catch(() => {})
      .finally(() => window.clearTimeout(timer));
    return () => { window.clearTimeout(timer); abort.abort(); };
  }, []);

  return (
    <div className="card clock-card">
      <div className="card-kicker">Local time in Pune</div>
      <div className="clock">
        {time ? (
          <span>{time.h}<span className="clock-colon">:</span>{time.m}</span>
        ) : (
          <span aria-hidden="true">--:--</span>
        )}
        {temp !== null ? <small>{temp}°C</small> : null}
      </div>
      <p>IST, UTC+5:30. I reply within a day or two.</p>
    </div>
  );
}
