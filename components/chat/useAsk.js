'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildIndex } from '../rag/retriever.js';
import { buildCorpus } from '../rag/corpus.js';
import { composeAnswer, phrased } from '../rag/answer.js';

/*
  The conversation, without any of the chrome.

  Both places the assistant appears — the panel docked to the page and the
  dedicated /ask page — run this hook, so a change to how an answer arrives is
  made once. The panel and the page differ only in layout.

  Two things decide an answer, in this order.

  Retrieval decides *whether there is one*, and it runs in the browser, first,
  every time. If nothing clears the grounding gate the assistant refuses, and
  no model is asked — which is the only version of that guarantee that holds
  when a model misbehaves, because the model never runs.

  Gemini, when the server has a key, decides only *how it is worded*: /api/ask
  re-runs the same retrieval and has the model phrase a short reply from those
  passages alone. It cannot widen what may be said, only tighten it into a
  sentence. Without a key, on a rate limit, on a timeout, on any failure at
  all, the retrieved passage is shown as it stands. So the assistant reads
  better when the key is there and is no less honest when it is not.

  Either way the answer says which it was and links to the pages behind it.

  Pacing lives in the reveal rather than in `ask`, and the turn is appended to
  the thread before any of it resolves. That is what lets the composer stay
  live throughout: an earlier version held the answer behind a timer and
  refused to accept a question while it ran, so a visitor who typed quickly had
  their second question silently dropped, keystrokes and all. Nothing here can
  drop a question — by the time `ask` returns, its place in the thread exists.
*/

const STORE_KEY = 'ask-gaurav-thread';

/* Roughly a fast reader's pace. Slower feels like a performance; instant
   removes the only cue that a search happened. */
const CHARS_PER_SECOND = 1100;

/* The pause before the first character, spent on the thinking dots. Long
   enough to be seen as a state rather than a flicker. */
const THINK_MS = 260;

/* Past this the round trip has stopped being worth waiting for, and the
   passage we already hold is a better answer than a spinner. */
const ASK_TIMEOUT_MS = 12000;

const GREETING = {
  role: 'assistant',
  blocks: [{
    text: 'Ask me anything about Gaurav’s work — what he builds, how he tests it, or how to reach him. Every answer is drawn from this site, and shows you the pages it came from.',
    cite: 0,
  }],
  sources: [],
  terms: [],
  followups: [],
  grounded: true,
  done: true,
};

function reducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function useAsk() {
  const index = useMemo(() => buildIndex(buildCorpus()), []);
  const [messages, setMessages] = useState([GREETING]);

  /* Characters revealed so far in the message currently arriving. Held apart
     from `messages` so a frame of the reveal does not rewrite the thread. */
  const [revealed, setRevealed] = useState(0);
  const frame = useRef(0);
  const seq = useRef(0);
  /* The turn a reveal belongs to: the most recent question asked. */
  const latest = useRef(0);

  /* Set once the server says AI answers are not configured, so every later
     question skips the round trip and goes straight to the passage. */
  const aiOff = useRef(false);

  const stop = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
  }, []);

  const settleAll = useCallback(() => {
    stop();
    setMessages((thread) => thread.map((message) => (
      message.role === 'assistant' && message.blocks ? { ...message, done: true } : message
    )));
  }, [stop]);

  useEffect(() => () => { if (frame.current) cancelAnimationFrame(frame.current); }, []);

  /* The thread survives closing the panel and moving between the page and
     /ask, so a reader who scrolls away is not made to start over. Session
     scoped, and only completed messages — a half-revealed answer restored
     mid-sentence would look broken. */
  useEffect(() => {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(STORE_KEY) || 'null');
      if (Array.isArray(saved) && saved.length) setMessages(saved);
    } catch { /* no stored thread, or storage blocked */ }
  }, []);

  useEffect(() => {
    const settled = messages.filter((message) => message.done);
    if (settled.length <= 1) return;
    try {
      window.sessionStorage.setItem(STORE_KEY, JSON.stringify(settled));
    } catch { /* not persisted; the thread still works for this view */ }
  }, [messages]);

  /* Fills in a turn whose place in the thread was taken when the question was
     asked. Only the turn at the end of the thread is revealed on a clock:
     anything that resolves after a later question has been asked would be
     revealing text the reader has already scrolled past. */
  const arrive = useCallback((id, answer) => {
    const length = answer.blocks.reduce((sum, block) => sum + block.text.length, 0);
    const instant = reducedMotion();
    /* Whether this is still the turn at the end of the thread is read from the
       ref rather than from inside the updater below: React runs an updater
       when it renders, not when it is called, so anything read in there is
       read too late to decide what to do here. */
    const isLast = latest.current === id;

    setMessages((thread) => {
      const at = thread.findIndex((message) => message.id === id);
      /* Cleared, or replaced by a newer thread, while this was in flight. */
      if (at < 0) return thread;
      const next = [...thread];
      next[at] = { ...next[at], ...answer, length, done: instant || !isLast };
      return next;
    });

    if (instant || !isLast) return;

    stop();
    setRevealed(0);
    const began = performance.now();
    const step = (now) => {
      const elapsed = now - began - THINK_MS;
      if (elapsed <= 0) {
        frame.current = requestAnimationFrame(step);
        return;
      }
      const shown = Math.min(length, (elapsed / 1000) * CHARS_PER_SECOND);
      setRevealed(shown);
      if (shown < length) {
        frame.current = requestAnimationFrame(step);
      } else {
        stop();
        setMessages((thread) => thread.map((message) => (
          message.id === id ? { ...message, done: true } : message
        )));
      }
    };
    frame.current = requestAnimationFrame(step);
  }, [stop]);

  const ask = useCallback((question) => {
    const asked = question.trim();
    if (!asked) return;

    const id = (seq.current += 1);
    latest.current = id;
    const local = composeAnswer(index, asked);

    stop();
    setRevealed(0);
    setMessages((thread) => [
      /* Anything still revealing is completed rather than abandoned, so the
         thread never keeps a half-sentence in it. */
      ...thread.map((message) => (message.blocks ? { ...message, done: true } : message)),
      { role: 'user', text: asked, done: true },
      /* The turn takes its place now and is filled in when it resolves, so
         two questions asked in quick succession cannot answer out of order. */
      { ...local, id, role: 'assistant', done: false },
    ]);

    /* A refusal has no passages for the model to work from, so asking it
       anything would be asking it to make something up. */
    if (!local.grounded || aiOff.current) {
      arrive(id, local);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), ASK_TIMEOUT_MS);
    fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: asked }),
      signal: controller.signal,
    })
      .then((response) => {
        if (response.status === 503) aiOff.current = true;
        return response.ok ? response.json() : null;
      })
      .then((data) => arrive(id, data?.answer ? phrased(local, data) : local))
      .catch(() => arrive(id, local))
      .finally(() => window.clearTimeout(timer));
  }, [index, arrive, stop]);

  /* Skips to the end of the answer being revealed. Someone who reads faster
     than the reveal should not have to wait for it, and making them wait is
     the thing that makes a typing effect irritating. */
  const settle = useCallback(() => {
    if (frame.current) settleAll();
  }, [settleAll]);

  const clear = useCallback(() => {
    stop();
    setRevealed(0);
    /* Bumping the sequence orphans anything still in flight: `arrive` will not
       find its turn, so a slow answer cannot land in a thread that was
       cleared while it was on its way. */
    seq.current += 1;
    latest.current = 0;
    setMessages([GREETING]);
    try { window.sessionStorage.removeItem(STORE_KEY); } catch { /* nothing stored */ }
  }, [stop]);

  const last = messages[messages.length - 1];

  return {
    index,
    messages,
    revealed,
    /* Either the answer is still being fetched, or it exists and has not
       started arriving on screen yet. Both look the same to a reader, and
       should: something is being worked out. */
    thinking: Boolean(last && last.role === 'assistant' && !last.done && revealed === 0),
    ask,
    settle,
    clear,
    fresh: messages.length <= 1,
  };
}
