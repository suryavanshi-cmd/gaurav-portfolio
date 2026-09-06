'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { buildIndex, search } from './rag/retriever';
import { buildCorpus, SUGGESTIONS } from './rag/corpus';

/*
  A retrieval assistant over Gaurav's own content.

  There is no model call. The index is built in the browser from the résumé
  facts, project write-ups and articles already on the page; a question
  retrieves the best-matching passages and they are shown with a link to where
  they came from. That is a deliberate trade rather than a shortcut: it needs no
  API key, nothing leaves the page, it costs nothing to run, and — the part that
  matters on a portfolio — it cannot state something Gaurav has not published,
  because it has nothing with which to make one up.
*/

const TYPE_MS = 12;

function answerFor(index, question) {
  const hits = search(index, question, 3);
  if (!hits.length) {
    return {
      text: "I could not find that on the site. I only answer from Gaurav's résumé, project write-ups and articles — try asking about his role, stack, projects, writing, or how to reach him.",
      sources: [],
    };
  }

  const [best, ...rest] = hits;
  const text = best.doc.text;
  /* Anything scoring near the top is worth offering as a follow-up; anything
     well below it is noise and would only make the answer look padded. */
  const related = rest.filter((hit) => hit.score > best.score * 0.45);

  return {
    text,
    sources: [best, ...related].map((hit) => ({
      title: hit.doc.title,
      source: hit.doc.source,
      href: hit.doc.href,
      hrefLabel: hit.doc.hrefLabel,
    })),
  };
}

function Typing() {
  return (
    <span className="chat-typing" aria-label="Searching">
      <i /><i /><i />
    </span>
  );
}

export default function Chat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: "Ask me anything about Gaurav's work. I answer from what is actually on this site and show you where each answer came from.",
      sources: [],
      done: true,
    },
  ]);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState('');

  const index = useMemo(() => buildIndex(buildCorpus()), []);
  const logRef = useRef(null);
  const inputRef = useRef(null);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    inputRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  /* Follow the newest message, including while it is still being typed. */
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, pending]);

  const ask = (question) => {
    const q = question.trim();
    if (!q || pending) return;
    setDraft('');
    setMessages((m) => [...m, { role: 'you', text: q, done: true }]);
    setPending(true);

    /* A beat before answering. Retrieval is instant, and an answer that appears
       in the same frame as the question reads as a canned response rather than
       a reply. */
    timers.current.push(window.setTimeout(() => {
      const { text, sources } = answerFor(index, q);
      setPending(false);
      setMessages((m) => [...m, { role: 'bot', text, sources, typed: '', done: false }]);

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) {
        setMessages((m) => m.map((msg, i) => (i === m.length - 1 ? { ...msg, typed: text, done: true } : msg)));
        return;
      }
      let i = 0;
      const step = () => {
        i = Math.min(text.length, i + 3);
        setMessages((m) => m.map((msg, idx) => (idx === m.length - 1 ? { ...msg, typed: text.slice(0, i) } : msg)));
        if (i < text.length) timers.current.push(window.setTimeout(step, TYPE_MS));
        else setMessages((m) => m.map((msg, idx) => (idx === m.length - 1 ? { ...msg, done: true } : msg)));
      };
      timers.current.push(window.setTimeout(step, TYPE_MS));
    }, 320));
  };

  return (
    <>
      <button
        type="button"
        className={`chat-fab ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="chat-panel"
      >
        <span aria-hidden="true">{open ? '✕' : '✦'}</span>
        <span className={open ? 'sr-only' : 'chat-fab-label'}>
          {open ? 'Close the assistant' : 'Ask about Gaurav'}
        </span>
      </button>

      <div
        id="chat-panel"
        className={`chat ${open ? 'is-open' : ''}`}
        role="dialog"
        aria-label="Ask about Gaurav"
        aria-modal="false"
        inert={!open}
      >
        <div className="chat-head">
          <div>
            <strong>Ask about Gaurav</strong>
            <small>Answers retrieved from this site — {index.size} passages indexed</small>
          </div>
        </div>

        <div className="chat-log" ref={logRef} role="log" aria-live="polite">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-msg is-${msg.role}`}>
              <p>{msg.role === 'bot' && msg.typed !== undefined ? msg.typed : msg.text}</p>
              {msg.done && msg.sources?.length ? (
                <div className="chat-sources">
                  {msg.sources.map((src) => (
                    <span key={src.title + src.source} className="chat-source">
                      <em>{src.source}</em> {src.title}
                      {src.href ? <a href={src.href}>{src.hrefLabel || 'Open'} →</a> : null}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {pending ? <div className="chat-msg is-bot"><Typing /></div> : null}
        </div>

        {messages.length <= 1 ? (
          <div className="chat-chips">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => ask(s)}>{s}</button>
            ))}
          </div>
        ) : null}

        <form
          className="chat-form"
          onSubmit={(e) => { e.preventDefault(); ask(draft); }}
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask a question…"
            aria-label="Your question"
            maxLength={200}
          />
          <button type="submit" disabled={!draft.trim() || pending}>Ask</button>
        </form>
      </div>
    </>
  );
}
