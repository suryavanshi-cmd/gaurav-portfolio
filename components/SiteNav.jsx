'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import ThemeToggle from './ThemeToggle';

export const NAV = [
  { href: '/', label: 'Home' },
  { href: '/projects', label: 'Projects' },
  { href: '/lab', label: 'Tools & games' },
  { href: '/writing', label: 'Writing' },
  { href: '/about', label: 'About' },
];

/* Which top-level section a path belongs to. Articles live under /blog but
   belong to Writing. */
function sectionOf(pathname) {
  if (pathname === '/') return '/';
  if (pathname.startsWith('/blog')) return '/writing';
  const hit = NAV.find((item) => item.href !== '/' && pathname.startsWith(item.href));
  return hit ? hit.href : null;
}

/* The assistant (Chat.jsx) owns ⌘K. The nav asks it to open with an event
   rather than importing it, so the two stay independent. */
export function openAssistant() {
  window.dispatchEvent(new CustomEvent('assistant:open'));
}

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export default function SiteNav() {
  const pathname = usePathname();
  const active = sectionOf(pathname);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const linksRef = useRef(null);
  const [pill, setPill] = useState(null);

  /* Measure the active link and move the pill onto it. */
  const measure = useCallback(() => {
    const host = linksRef.current;
    if (!host) return;
    const link = host.querySelector('.nav-link.is-active');
    if (!link) {
      setPill(null);
      return;
    }
    setPill({ x: link.offsetLeft, w: link.offsetWidth });
  }, []);

  useIsoLayoutEffect(() => {
    measure();
  }, [active, measure]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    /* Web fonts can change link widths after first paint. */
    document.fonts?.ready?.then(measure).catch(() => {});
    return () => window.removeEventListener('resize', onResize);
  }, [measure]);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setScrolled(window.scrollY > 8);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  /* The mobile sheet closes on navigation and on Escape, and locks the page
     behind it while open. */
  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <header className={`nav ${scrolled || open ? 'is-scrolled' : ''} ${open ? 'is-open' : ''}`}>
      <div className="wrap nav-row">
        <Link href="/" className="brand" aria-label="Gaurav Suryavanshi — home">
          <span className="brand-mark" aria-hidden="true">GS</span>
          <span>Gaurav Suryavanshi</span>
        </Link>

        <nav aria-label="Main">
          <div
            ref={linksRef}
            className={`nav-links ${pill ? 'has-pill' : ''}`}
            style={pill ? { '--pill-x': `${pill.x}px`, '--pill-w': `${pill.w}px` } : undefined}
          >
            <span className="nav-pill" aria-hidden="true" />
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${active === item.href ? 'is-active' : ''}`}
                aria-current={active === item.href ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <button type="button" className="nav-ask" onClick={openAssistant}>
          Ask about me <kbd>⌘K</kbd>
        </button>

        <ThemeToggle />

        <button
          type="button"
          className="nav-menu"
          aria-expanded={open}
          aria-controls="nav-sheet"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((value) => !value)}
        >
          <i aria-hidden="true" />
        </button>
      </div>

      <div id="nav-sheet" className="nav-sheet">
        {open
          ? NAV.map((item) => (
            <Link key={item.href} href={item.href} className={active === item.href ? 'is-active' : ''}>
              {item.label}
            </Link>
          ))
          : null}
        {open ? (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ marginTop: 24 }}
            onClick={() => { setOpen(false); openAssistant(); }}
          >
            Ask about me
          </button>
        ) : null}
      </div>
    </header>
  );
}
