'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import Surface from './chat/Surface.jsx';
import { goToSource } from './chat/goToSource.js';
import { useAsk } from './chat/useAsk.js';

/*
  The assistant, docked to the portfolio.

  On a wide screen it is a panel down the right-hand side — wide enough to read
  a paragraph and its citations without the text turning into a column of three
  words. On a phone it takes the whole screen, because the alternative is what
  it used to be: a floating card with a log a few lines tall, where a long
  answer was clipped and the composer sat wherever the keyboard left it.

  The dedicated /ask page renders the same surface for anyone who arrives there
  directly or wants the conversation on its own — which is why this stands down
  there entirely: a launcher offering to open the assistant, on top of the
  assistant, is an invitation to somewhere the visitor already is.
*/

/* A wrapper rather than an early return inside the panel, because the panel
   owns the conversation and persists it: mounted on /ask it would be a second
   thread writing over the page's own. */
export default function Chat() {
  return usePathname() === '/ask' ? null : <AssistantPanel />;
}

function AssistantPanel() {
  const [open, setOpen] = useState(false);
  const ask = useAsk();
  const askQuestion = ask.ask;
  const launcher = useRef(null);
  const panel = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    launcher.current?.focus();
  }, []);

  /* ⌘K / Ctrl-K from anywhere, "/" when not already typing, Escape to leave. */
  useEffect(() => {
    const onKey = (event) => {
      const typing = /^(INPUT|TEXTAREA)$/.test(event.target.tagName) || event.target.isContentEditable;
      if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((v) => !v);
      } else if (event.key === '/' && !typing && !open) {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === 'Escape' && open) {
        close();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  /* The rest of the site (the nav's "Ask about me", a demo's suggested
     questions) opens the panel by event rather than by importing this
     component, so the panel's state stays here and the two stay independent.
     An optional `detail.question` is asked as soon as the panel is open. */
  useEffect(() => {
    const onRequest = (event) => {
      setOpen(true);
      const question = event.detail?.question;
      if (question) askQuestion(question);
    };
    window.addEventListener('assistant:open', onRequest);
    return () => window.removeEventListener('assistant:open', onRequest);
  }, [askQuestion]);

  /* While the panel owns the screen on a phone, the page behind it must not
     scroll: a drag that starts on the conversation and runs past its end
     otherwise scrolls the portfolio underneath, which is disorienting when the
     portfolio is not visible. Restores the previous value rather than
     clearing it, so it composes with the other things that lock the page. */
  useEffect(() => {
    if (!open || !window.matchMedia('(max-width: 780px)').matches) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  /* On a wide screen the panel would otherwise sit on top of the right-hand
     half of the column it is answering about, hiding the text a citation is
     trying to point at. Padding the body narrows the page's content box, and
     the column — which is centred in it — moves clear of its own accord. */
  useEffect(() => {
    document.documentElement.classList.toggle('ask-open', open);
    return () => document.documentElement.classList.remove('ask-open');
  }, [open]);

  /* On iOS the software keyboard does not shrink the viewport, so a composer
     pinned to the bottom of the screen ends up underneath it. visualViewport
     reports the space actually left over; the panel is sized from that. */
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    const fit = () => {
      panel.current?.style.setProperty('--ask-vh', `${viewport.height}px`);
    };
    fit();
    viewport.addEventListener('resize', fit);
    viewport.addEventListener('scroll', fit);
    return () => {
      viewport.removeEventListener('resize', fit);
      viewport.removeEventListener('scroll', fit);
    };
  }, []);

  const onCite = useCallback((source) => {
    /* On a phone the panel is covering the thing being cited, so it stands
       aside. On a wide screen the portfolio is visible beside the panel and
       closing it would lose the reader's place in the conversation. */
    if (window.matchMedia('(max-width: 780px)').matches) close();
    goToSource(source);
  }, [close]);

  return (
    <>
      <button
        ref={launcher}
        type="button"
        className={`ask-launch ${open ? 'is-open' : ''}`}
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls="ask-panel"
      >
        <span className="ask-launch-mark" aria-hidden="true"><i /></span>
        <span className="ask-launch-label">Ask AI</span>
        <kbd aria-hidden="true">/</kbd>
      </button>

      <div
        id="ask-panel"
        ref={panel}
        className={`ask-panel ${open ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="false"
        aria-label="Ask Gaurav AI"
        inert={!open ? '' : undefined}
      >
        <Surface ask={ask} variant="panel" onClose={close} onCite={onCite} autoFocus={open} />
      </div>

      <button
        type="button"
        className={`ask-scrim ${open ? 'is-open' : ''}`}
        onClick={close}
        tabIndex={-1}
        aria-hidden="true"
      />
    </>
  );
}
