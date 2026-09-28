'use client';

import { useEffect, useRef, useState } from 'react';

/* A code block with a copy button. The button says "Copied" for a moment
   instead of popping a toast, so the confirmation is where the reader looks. */
export function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  };

  return (
    <div className="post-code">
      <div className="post-code-bar">
        {lang ? <span className="post-code-lang">{lang}</span> : <span />}
        <button type="button" className={`post-code-copy ${copied ? 'is-done' : ''}`} onClick={copy}>
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
}

/*
  "On this page": a small pill under the nav that names the section you are
  reading. It appears once the article's first heading has scrolled past, and
  opens into the full list of sections — jump to any of them.
*/
export function PostOutline({ sections }) {
  const [current, setCurrent] = useState(-1);
  const [open, setOpen] = useState(false);
  const hostRef = useRef(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = 140;
      let index = -1;
      sections.forEach((section, i) => {
        const el = document.getElementById(section.id);
        if (el && el.getBoundingClientRect().top < line) index = i;
      });
      const article = document.getElementById('post');
      if (article && article.getBoundingClientRect().bottom < line + 80) index = -1;
      setCurrent(index);
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
  }, [sections]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    const onDown = (event) => { if (!hostRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  useEffect(() => { if (current < 0) setOpen(false); }, [current]);

  const jump = (id) => {
    setOpen(false);
    const el = document.getElementById(id);
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: reduce ? 'auto' : 'smooth' });
    history.replaceState(null, '', `#${id}`);
  };

  const visible = current >= 0;

  return (
    <div ref={hostRef} className={`outline ${visible ? 'is-on' : ''} ${open ? 'is-open' : ''}`} inert={!visible}>
      <button type="button" className="outline-pill" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="outline-list">
        <span className="outline-count">{Math.max(current, 0) + 1}/{sections.length}</span>
        <span className="outline-name" key={current}>{sections[Math.max(current, 0)]?.text}</span>
        <span className="outline-chev" aria-hidden="true">⌄</span>
      </button>
      <ol id="outline-list" className="outline-list" hidden={!open}>
        {sections.map((section, i) => (
          <li key={section.id}>
            <button type="button" className={i === current ? 'is-on' : ''} onClick={() => jump(section.id)} aria-current={i === current ? 'location' : undefined}>
              {section.text}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
