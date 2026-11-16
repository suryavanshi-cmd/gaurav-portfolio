'use client';

import { useCallback, useEffect, useState } from 'react';
import './cinematic-intro.css';

/**
 * A short, optional first-visit welcome. Content is always in the document,
 * even when JavaScript fails; this overlay never owns the page content.
 * One showing per browser tab/session, shared between V1 and V2.
 */
export default function CinematicIntro() {
  const [phase, setPhase] = useState('idle');
  const close = useCallback(() => setPhase('leaving'), []);

  useEffect(() => {
    let show = true;
    try {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const seen = window.sessionStorage.getItem('gs-cinematic-intro-v1') === 'seen';
      show = !reduced && !seen;
      if (show) window.sessionStorage.setItem('gs-cinematic-intro-v1', 'seen');
    } catch {
      // If storage is blocked, show at most once per mounted session.
      show = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    if (!show) return;
    setPhase('entering');
    const end = window.setTimeout(() => setPhase('leaving'), 1750);
    return () => window.clearTimeout(end);
  }, []);

  useEffect(() => {
    if (phase !== 'leaving') return;
    const remove = window.setTimeout(() => setPhase('done'), 850);
    return () => window.clearTimeout(remove);
  }, [phase]);

  if (phase === 'idle' || phase === 'done') return null;

  return (
    <div className={'gs-cinematic-intro ' + (phase === 'leaving' ? 'gs-cinematic-out' : 'gs-cinematic-in')}
      aria-label="Welcome to Gaurav's portfolio">
      <div className="gs-intro-frame" aria-hidden="true"><span>GS / 2026</span><span>AN OPENING NOTE</span></div>
      <div className="gs-intro-content" aria-hidden="true">
        <span className="gs-intro-kicker">A PERSONAL CORNER OF THE INTERNET</span>
        <div className="gs-intro-line"><span>Hey, I'm</span></div>
        <div className="gs-intro-line gs-intro-name"><span>Gaurav<span className="gs-intro-punctuation">.</span></span></div>
        <p>I build things. I ask questions. I love a good story.</p>
      </div>
      <div className="gs-intro-bottom" aria-hidden="true"><span>CURIOUS BY DEFAULT</span><span>LET'S BEGIN ↘</span></div>
      <button className="gs-intro-skip" type="button" onClick={close} aria-label="Skip opening animation">Skip intro ↗</button>
    </div>
  );
}
