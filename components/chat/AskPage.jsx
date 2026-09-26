'use client';

import { useCallback } from 'react';
import Surface from './Surface.jsx';
import { goToSource } from './goToSource.js';
import { useAsk } from './useAsk.js';

/*
  The assistant on its own page.

  Same surface as the docked panel, with the whole viewport to itself, which is
  what makes it the right thing to link to from a CV or a message: the visitor
  lands in the conversation rather than on a portfolio with a conversation
  somewhere in it. The thread is shared with the panel through session storage,
  so moving between the two continues rather than restarts.
*/

export default function AskPage() {
  const ask = useAsk();

  /* The sections a citation points at live on the home page, so a citation
     here is a navigation rather than a scroll. */
  const onCite = useCallback((source) => goToSource(source, { samePage: false }), []);

  return (
    <main className="ask-page">
      <a className="ask-page-back" href="/">
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <path d="M12 4l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Gaurav Suryavanshi
      </a>
      <Surface ask={ask} variant="page" onCite={onCite} autoFocus />
    </main>
  );
}
