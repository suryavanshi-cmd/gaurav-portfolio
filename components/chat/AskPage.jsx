'use client';

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

  The site's nav and footer are around it, so this renders the conversation and
  nothing else — a second "back to the portfolio" link beside the nav's own
  would be one too many.
*/

export default function AskPage() {
  const ask = useAsk();

  return (
    <main id="main" className="ask-page">
      <Surface ask={ask} variant="page" onCite={goToSource} autoFocus />
    </main>
  );
}
