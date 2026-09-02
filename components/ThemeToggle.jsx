'use client';

import { useEffect, useState } from 'react';

/*
  Three states, not two: light, dark, and system. Dropping "system" would mean a
  visitor who just wants to follow their OS has no way back once they have
  touched the control — and on a phone that also means losing the automatic
  switch at sunset.

  The attribute on <html> is what the stylesheet reads:
    absent            follow the OS (the media query decides)
    data-theme=light  force light, even on a dark OS
    data-theme=dark   force dark, even on a light OS

  Applying it is deliberately NOT done here on mount. The inline script in the
  layout has already run before first paint; doing it again in an effect would
  paint the wrong theme first and flash. This component only reads the stored
  value to show which option is active, and writes on click.
*/

const OPTIONS = [
  { key: 'light', label: 'Light', glyph: '☀' },
  { key: 'dark', label: 'Dark', glyph: '☾' },
  { key: 'system', label: 'System', glyph: '◐' },
];

export function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === 'system') root.removeAttribute('data-theme');
  else root.dataset.theme = mode;

  /* Keep the browser chrome (mobile address bar) in step with the page. */
  const resolved =
    mode === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', resolved === 'dark' ? '#0b0b0d' : '#ffffff');
}

export default function ThemeToggle() {
  /* 'system' on the server and on the first client render, so the markup
     matches; the effect below corrects it once we can read storage. */
  const [mode, setMode] = useState('system');
  const [ready, setReady] = useState(false);
  /* The indicator may only animate in response to a click. Arming it on mount
     instead is subtly wrong: `ready` flips in the same commit that moves the
     indicator to the stored choice, so the browser sees the transition switch
     on and the position change together and slides it across on every load. */
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    let stored = null;
    try {
      stored = window.localStorage.getItem('theme');
    } catch {
      /* Storage blocked — the control still works for this page view. */
    }
    setMode(stored === 'light' || stored === 'dark' ? stored : 'system');
    setReady(true);
  }, []);

  /* While following the OS, track changes to it so the meta colour keeps up
     when the system flips at sunset. */
  useEffect(() => {
    if (mode !== 'system') return undefined;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [mode]);

  const choose = (next) => {
    setArmed(true);
    setMode(next);
    applyTheme(next);
    try {
      if (next === 'system') window.localStorage.removeItem('theme');
      else window.localStorage.setItem('theme', next);
    } catch {
      /* Not persisted, but applied. */
    }
  };

  const index = OPTIONS.findIndex((option) => option.key === mode);

  return (
    /* --i drives the sliding indicator's position, so the movement is one
       transform on one element rather than three backgrounds crossfading.
       is-ready reveals the indicator once storage has been read; is-armed, set
       only by a click, is what permits it to travel. */
    <div
      className={`theme ${ready ? 'is-ready' : ''} ${armed ? 'is-armed' : ''}`}
      style={{ '--i': index < 0 ? 2 : index }}
      role="group"
      aria-label="Colour theme"
    >
      <span className="theme-thumb" aria-hidden="true" />
      {OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          className={`theme-option ${ready && mode === option.key ? 'is-active' : ''}`}
          aria-pressed={ready ? mode === option.key : undefined}
          title={option.label}
          onClick={() => choose(option.key)}
        >
          <span className="theme-glyph" aria-hidden="true">{option.glyph}</span>
          <span className="sr-only">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
