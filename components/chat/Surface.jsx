'use client';

import Composer from './Composer.jsx';
import Thread from './Thread.jsx';

/*
  Everything the assistant is, minus where it sits.

  The docked panel and the /ask page render this same surface; they differ in
  how they are framed and in what a citation does once clicked. Keeping the two
  in one component is what stops them drifting into two assistants that behave
  subtly differently.
*/

export default function Surface({ ask, variant, onClose, onCite, autoFocus }) {
  const { index, messages, thinking, revealed, fresh } = ask;

  /* `is-panel` / `is-page` rather than `ask-panel` / `ask-page`: those are the
     wrappers' own class names, and a surface sharing them would pick up the
     wrapper's layout on top of its own. */
  return (
    <div className={`ask is-${variant}`}>
      <header className="ask-head">
        {/* Both leading marks are rendered and one is hidden per breakpoint.
            On a phone the panel is the whole screen, so it needs the back
            gesture every full-screen view has; on a wide screen it is a panel
            beside the page, where a chevron would be claiming to navigate. */}
        {onClose ? (
          <button type="button" className="ask-back" onClick={onClose} aria-label="Close the assistant">
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
              <path d="M12 4l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}
        <span className="ask-avatar" aria-hidden="true">GS</span>

        <div className="ask-head-text">
          <strong>Gaurav AI</strong>
          <small>
            <span className="ask-live" aria-hidden="true" />
            {index.size} sources · grounded in this site
          </small>
        </div>

        <button type="button" className="ask-clear" onClick={ask.clear} disabled={fresh}>
          Clear
        </button>

        {onClose ? (
          <button type="button" className="ask-close" onClick={onClose} aria-label="Close the assistant">
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
              <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </header>

      <Thread
        messages={messages}
        thinking={thinking}
        revealed={revealed}
        fresh={fresh}
        onAsk={ask.ask}
        onCite={onCite}
        onSettle={ask.settle}
      />

      <div className="ask-foot">
        {/* Deliberately not disabled while an answer is arriving: the answer is
            already computed, and a composer that stops accepting input for a
            few hundred milliseconds loses whatever was typed into it. */}
        <Composer onSubmit={ask.ask} autoFocus={autoFocus} />
        <p className="ask-note">
          Retrieval over this site — no model, no API call. It refuses what it cannot source.
        </p>
      </div>
    </div>
  );
}
