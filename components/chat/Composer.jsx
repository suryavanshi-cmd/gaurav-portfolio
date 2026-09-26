'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/*
  The input.

  A single-line input was the wrong control: a question long enough to be
  interesting scrolled sideways inside it, and on a phone the end of what you
  typed was invisible while you typed it. A textarea that grows with its
  content shows the whole question, up to a ceiling after which it scrolls
  rather than pushing the conversation off screen.

  Enter sends and Shift+Enter breaks the line, which is what every messaging
  surface has trained people to expect. On a touch keyboard Enter is a newline
  key, so the send button is the primary control there and `enterKeyHint` asks
  the keyboard to label its own key accordingly.
*/

const MAX_HEIGHT = 168;

export default function Composer({ onSubmit, placeholder = 'Ask anything about Gaurav…', autoFocus }) {
  const [draft, setDraft] = useState('');
  const field = useRef(null);

  const resize = useCallback(() => {
    const node = field.current;
    if (!node) return;
    /* Reset first: the scrollHeight of a grown textarea never shrinks on its
       own, so without this the box only ever gets taller. */
    node.style.height = 'auto';
    const wanted = Math.min(node.scrollHeight, MAX_HEIGHT);
    node.style.height = `${wanted}px`;
    node.style.overflowY = node.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden';
  }, []);

  useEffect(resize, [draft, resize]);
  useEffect(() => { if (autoFocus) field.current?.focus(); }, [autoFocus]);

  const send = () => {
    const question = draft.trim();
    if (!question) return;
    onSubmit(question);
    setDraft('');
  };

  return (
    <form
      className="ask-composer"
      onSubmit={(event) => { event.preventDefault(); send(); }}
    >
      <textarea
        ref={field}
        rows={1}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            send();
          }
        }}
        placeholder={placeholder}
        aria-label="Your question"
        enterKeyHint="send"
        maxLength={400}
      />
      <button type="submit" disabled={!draft.trim()} aria-label="Send question">
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <path d="M10 16V4M10 4l-5 5M10 4l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </form>
  );
}
