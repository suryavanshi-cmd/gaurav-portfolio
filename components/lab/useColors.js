'use client';

import { useEffect, useRef } from 'react';

/* Canvas can't read CSS variables, so the demos read the palette into a ref
   and refresh it whenever the theme changes — by the toggle or by the OS. */
function read() {
  const s = getComputedStyle(document.documentElement);
  const get = (name, fallback) => s.getPropertyValue(name).trim() || fallback;
  return {
    fg: get('--fg', '#1d1d1f'),
    fg3: get('--fg-3', '#6e6e73'),
    line: get('--line-2', 'rgba(0,0,0,.14)'),
    soft: get('--bg-soft', '#f5f5f7'),
    elev: get('--bg-elev', '#ffffff'),
    sunk: get('--bg-sunk', '#ececf0'),
    accent: get('--accent', '#0071e3'),
    ok: get('--ok', '#1d8a4e'),
    bad: get('--bad', '#d6302f'),
  };
}

export function useColors() {
  const ref = useRef(null);

  useEffect(() => {
    ref.current = read();
    const refresh = () => { ref.current = read(); };
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    scheme.addEventListener('change', refresh);
    return () => { observer.disconnect(); scheme.removeEventListener('change', refresh); };
  }, []);

  return ref;
}
