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
    setMode(next);
    applyTheme(next);
    try {
      if (next === 'system') window.localStorage.removeItem('theme');
      else window.localStorage.setItem('theme', next);
    } catch {
      /* Not persisted, but applied. */
    }
  };

  return (
    <div className="theme" role="group" aria-label="Colour theme">
      {OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          className={`theme-option ${ready && mode === option.key ? 'is-active' : ''}`}
          aria-pressed={ready ? mode === option.key : undefined}
          title={option.label}
          onClick={() => choose(option.key)}
        >
          <span aria-hidden="true">{option.glyph}</span>
          <span className="sr-only">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
