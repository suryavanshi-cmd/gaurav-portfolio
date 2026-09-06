'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildIndex, search, stem, tokenize } from './rag/retriever';
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

const TYPE_MS = 11;
const STORE_KEY = 'chat-thread';

function answerFor(index, question) {
  const hits = search(index, question, 4);
  if (!hits.length) {
    return {
      text: "I could not find that on the site. I only answer from Gaurav's résumé, project write-ups and articles — try asking about his role, stack, projects, writing, or how to reach him.",
      sources: [],
      terms: [],
      followups: [],
    };
  }

  const [best, ...rest] = hits;
  /* Near-ties are worth offering; anything well below the top is noise and
     would only make the answer look padded. */
  const near = rest.filter((hit) => hit.score > best.score * 0.45);

  return {
    text: best.doc.text,
    terms: best.matched,
    sources: [best, ...near].map((hit) => ({
      title: hit.doc.title,
      source: hit.doc.source,
      href: hit.doc.href,
      hrefLabel: hit.doc.hrefLabel,
    })),
    /* Follow-ups use every runner-up, not just the near-ties. The 0.45 gate
       above decides what is strong enough to cite as evidence; a follow-up only
       has to be related, and by construction it is something the corpus can
       answer — so it never leads into a dead end the way a fixed prompt list
       would. Titles are deduped so two chunks of one article do not both
       appear. */
    followups: [...new Set(rest.map((hit) => hit.doc.title))]
      .filter((title) => title !== best.doc.title)
      .slice(0, 2),
  };
}

/* Marks the words the retriever actually matched on. It is the one honest way
   to show a lexical system working: these are the terms that earned the hit. */
function Highlighted({ text, terms }) {
  if (!terms?.length) return text;
  const wanted = new Set(terms);
  const parts = text.split(/(\b[\w+#.]+\b)/g);
  return parts.map((part, i) =>
    /^[\w+#.]+$/.test(part) && wanted.has(stem(part.toLowerCase()))
      ? <mark key={i}>{part}</mark>
      : part,
  );
}

function Typing() {
  return (
    <span className="chat-typing" aria-label="Searching">
      <i /><i /><i />
    </span>
  );
}

const GREETING = {
  role: 'bot',
  text: "Ask me anything about Gaurav's work. I answer from what is actually on this site, and show you where each answer came from.",
  sources: [],
  terms: [],
  followups: [],
  done: true,
};

export default function Chat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(-1);

  const index = useMemo(() => buildIndex(buildCorpus()), []);
  const logRef = useRef(null);
  const inputRef = useRef(null);
  const fabRef = useRef(null);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  /* The thread survives closing the panel, so a reader who scrolls away and
     comes back is not made to start over. Session-scoped, and only completed
     messages — a half-typed answer restored mid-sentence would look broken. */
  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(STORE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
      }
    } catch { /* no stored thread, or storage blocked */ }
  }, []);

  useEffect(() => {
    if (pending) return;
    try {
      window.sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.filter((m) => m.done)));
    } catch { /* not persisted; the thread still works for this view */ }
  }, [messages, pending]);

  /* ⌘K / Ctrl-K from anywhere, and "/" when not already typing somewhere. */
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
        setOpen(false);
        fabRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, pending]);

  const ask = useCallback((question) => {
    const q = question.trim();
    if (!q || pending) return;
    setDraft('');
    setMessages((m) => [...m, { role: 'you', text: q, done: true }]);
    setPending(true);

    /* A beat before answering. Retrieval is instant, and a reply that lands in
       the same frame as the question reads as a canned response. */
    timers.current.push(window.setTimeout(() => {
      const answer = answerFor(index, q);
      setPending(false);
      setMessages((m) => [...m, { role: 'bot', ...answer, typed: '', done: false }]);

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const finish = () => setMessages((m) => m.map((msg, i) => (
        i === m.length - 1 ? { ...msg, typed: answer.text, done: true } : msg
      )));
      if (reduce) { finish(); return; }

      let i = 0;
      const step = () => {
        i = Math.min(answer.text.length, i + 3);
        setMessages((m) => m.map((msg, idx) => (
          idx === m.length - 1 ? { ...msg, typed: answer.text.slice(0, i) } : msg
        )));
        if (i < answer.text.length) timers.current.push(window.setTimeout(step, TYPE_MS));
        else finish();
      };
      timers.current.push(window.setTimeout(step, TYPE_MS));
    }, 300));
  }, [index, pending]);

  const copy = (text, i) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(i);
      timers.current.push(window.setTimeout(() => setCopied(-1), 1600));
    }).catch(() => {});
  };

  const reset = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setPending(false);
    setMessages([GREETING]);
    try { window.sessionStorage.removeItem(STORE_KEY); } catch { /* nothing stored */ }
    inputRef.current?.focus();
  };

  const fresh = messages.length <= 1;

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        className={`chat-fab ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="chat-panel"
      >
        <span className="chat-fab-mark" aria-hidden="true">
          <i />
        </span>
        <span className={open ? 'sr-only' : 'chat-fab-label'}>
          {open ? 'Close the assistant' : 'Ask about Gaurav'}
        </span>
        {!open ? <kbd className="chat-fab-kbd" aria-hidden="true">/</kbd> : null}
      </button>

      <div
        id="chat-panel"
        className={`chat ${open ? 'is-open' : ''}`}
        role="dialog"
        aria-label="Ask about Gaurav"
        inert={!open}
      >
        <div className="chat-head">
          <span className="chat-avatar" aria-hidden="true">GS</span>
          <div className="chat-head-text">
            <strong>Ask about Gaurav</strong>
            <small>
              <span className="chat-dot" aria-hidden="true" />
              {index.size} passages · every answer cites its source
            </small>
          </div>
          {!fresh ? (
            <button type="button" className="chat-reset" onClick={reset}>Clear</button>
          ) : null}
        </div>

        <div className="chat-log" ref={logRef} role="log" aria-live="polite">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-msg is-${msg.role}`}>
              <p>
                {msg.role === 'bot' && !msg.done && msg.typed !== undefined
                  ? msg.typed
                  : <Highlighted text={msg.text} terms={msg.role === 'bot' ? msg.terms : null} />}
              </p>

              {msg.done && msg.role === 'bot' && msg.sources?.length ? (
                <div className="chat-meta">
                  <div className="chat-sources">
                    {msg.sources.map((src) => (
                      <span key={src.title + src.source} className="chat-source">
                        <em>{src.source}</em> {src.title}
                        {src.href ? <a href={src.href}>{src.hrefLabel || 'Open'} →</a> : null}
                      </span>
                    ))}
                  </div>
                  <button type="button" className="chat-copy" onClick={() => copy(msg.text, i)}>
                    {copied === i ? 'Copied' : 'Copy'}
                  </button>
                </div>
              ) : null}

              {msg.done && msg.followups?.length ? (
                <div className="chat-next">
                  {msg.followups.map((f) => (
                    <button key={f} type="button" onClick={() => ask(f)}>{f} →</button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {pending ? <div className="chat-msg is-bot"><Typing /></div> : null}
        </div>

        {fresh ? (
          <div className="chat-chips">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => ask(s)}>{s}</button>
            ))}
          </div>
        ) : null}

        <form className="chat-form" onSubmit={(e) => { e.preventDefault(); ask(draft); }}>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask a question…"
            aria-label="Your question"
            maxLength={200}
          />
          <button type="submit" aria-label="Ask" disabled={!draft.trim() || pending}>
            <span aria-hidden="true">↑</span>
          </button>
        </form>
      </div>
    </>
  );
}
