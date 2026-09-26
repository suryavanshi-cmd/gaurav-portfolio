'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildIndex } from '../rag/retriever.js';
import { buildCorpus } from '../rag/corpus.js';
import { composeAnswer } from '../rag/answer.js';

/*
  The conversation, without any of the chrome.

  Both places the assistant appears — the panel docked to the page and the
  dedicated /ask page — run this hook, so a change to how an answer arrives is
  made once. The panel and the page differ only in layout.

  Retrieval is synchronous and instant, which is a presentation problem rather
  than a feature: an answer that appears in the same frame as the question
  reads as canned, and gives no sign that anything was searched. So the answer
  is computed immediately and *revealed* on a clock — a short pause on the
  thinking dots, then text at a readable rate.

  Putting the pacing entirely in the reveal is what lets the composer stay live
  throughout. An earlier version held the answer behind a timer and refused to
  accept a question while that timer ran; a visitor who typed quickly had their
  second question silently dropped, keystrokes and all. Nothing here can drop a
  question: by the time `ask` returns, the answer already exists.
*/

const STORE_KEY = 'ask-gaurav-thread';

/* Roughly a fast reader's pace. Slower feels like a performance; instant
   removes the only cue that a search happened. */
const CHARS_PER_SECOND = 1100;

/* The pause before the first character, spent on the thinking dots. Long
   enough to be seen as a state rather than a flicker. */
const THINK_MS = 260;

const GREETING = {
  role: 'assistant',
  blocks: [{
    text: 'Ask me anything about Gaurav’s work — what he builds, how he tests it, or how to reach him. Every answer is drawn from this site, and shows you the passage it came from.',
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

  const finish = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
    setMessages((thread) => thread.map((message, i) => (
      i === thread.length - 1 ? { ...message, done: true } : message
    )));
  }, []);

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

  const ask = useCallback((question) => {
    const asked = question.trim();
    if (!asked) return;

    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;

    const answer = composeAnswer(index, asked);
    const length = answer.blocks.reduce((sum, block) => sum + block.text.length, 0);
    const instant = reducedMotion();

    setRevealed(instant ? length : 0);
    setMessages((thread) => [
      /* Anything still revealing is completed rather than abandoned, so the
         thread never keeps a half-sentence in it. */
      ...thread.map((message) => ({ ...message, done: true })),
      { role: 'user', text: asked, done: true },
      { ...answer, role: 'assistant', length, done: instant },
    ]);

    if (instant) return;

    const began = performance.now();
    const step = (now) => {
      const elapsed = now - began - THINK_MS;
      if (elapsed <= 0) {
        frame.current = requestAnimationFrame(step);
        return;
      }
      const shown = Math.min(length, (elapsed / 1000) * CHARS_PER_SECOND);
      setRevealed(shown);
      if (shown < length) frame.current = requestAnimationFrame(step);
      else finish();
    };
    frame.current = requestAnimationFrame(step);
  }, [index, finish]);

  /* Skips to the end of the answer being revealed. Someone who reads faster
     than the reveal should not have to wait for it, and making them wait is
     the thing that makes a typing effect irritating. */
  const settle = useCallback(() => {
    if (frame.current) finish();
  }, [finish]);

  const clear = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
    setRevealed(0);
    setMessages([GREETING]);
    try { window.sessionStorage.removeItem(STORE_KEY); } catch { /* nothing stored */ }
  }, []);

  const last = messages[messages.length - 1];

  return {
    index,
    messages,
    revealed,
    /* The answer exists; it just has not started arriving on screen yet. */
    thinking: Boolean(last && last.role === 'assistant' && !last.done && revealed === 0),
    ask,
    settle,
    clear,
    fresh: messages.length <= 1,
  };
}
