'use client';

import { useEffect, useRef } from 'react';
import RichText from './RichText.jsx';
import { SUGGESTIONS } from '../rag/corpus.js';

/*
  The conversation itself.

  An assistant message is either the site's own passages, each ending in the
  number of the source it came from, or one sentence a model wrote from those
  passages. The sources are the point either way: they are what separates this
  from a paragraph that merely sounds authoritative. Clicking one takes you to
  the part of the portfolio behind it, so the claim can be checked against its
  context rather than believed — and the line above them says which of the two
  you are reading.
*/

/* How far past the last message the log will auto-scroll from. Someone who has
   scrolled up to re-read an earlier answer is not dragged back down by the
   next frame of the reveal. */
const STICK_PX = 120;

export default function Thread({ messages, thinking, revealed, fresh, onAsk, onCite, onSettle }) {
  const log = useRef(null);
  const stick = useRef(true);

  useEffect(() => {
    const node = log.current;
    if (!node) return undefined;
    const onScroll = () => {
      stick.current = node.scrollHeight - node.scrollTop - node.clientHeight < STICK_PX;
    };
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const node = log.current;
    if (!node) return;
    /* A thread that has not been used yet is read from the top: the greeting
       says what the assistant will and will not do, and pinning to the bottom
       scrolled it off behind the openers before it had been read. */
    if (fresh) { node.scrollTop = 0; return; }
    if (stick.current) node.scrollTop = node.scrollHeight;
  }, [messages, thinking, revealed, fresh]);

  return (
    <div className="ask-log" ref={log} role="log" aria-live="polite" aria-busy={thinking}>
      {messages.map((message, i) => {
        const last = i === messages.length - 1;
        return message.role === 'user'
          ? (
            <div className="ask-turn is-user" key={i}>
              <p>{message.text}</p>
            </div>
          )
          : (
            <Answer
              key={i}
              message={message}
              /* Only the message currently arriving is clipped; everything
                 above it is finished and rendered whole. */
              revealed={last && !message.done ? revealed : Infinity}
              onAsk={onAsk}
              onCite={onCite}
              onSettle={onSettle}
            />
          );
      })}

      {/* The openers belong in the conversation, directly under the greeting
          they follow on from. Pinned above the composer instead, they sat at
          the far end of an empty panel with the greeting stranded at the top. */}
      {fresh ? (
        <div className="ask-openers">
          <p className="ask-openers-label">Try one of these</p>
          <div className="ask-openers-grid">
            {SUGGESTIONS.map((question) => (
              <button type="button" key={question} onClick={() => onAsk(question)}>{question}</button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Answer({ message, revealed, onAsk, onCite, onSettle }) {
  const { blocks, sources, terms, followups, grounded, done, ai } = message;
  let offset = 0;

  return (
    <div
      className={`ask-turn is-assistant ${grounded ? '' : 'is-refusal'}`}
      onClick={done ? undefined : onSettle}
    >
      {/* Nothing has been revealed yet: the answer exists, it is simply still
          on the clock. The dots live inside the turn rather than in a row of
          their own, so the text replaces them in place instead of the
          conversation jumping when they are swapped out. */}
      {revealed <= 0 && !done ? (
        <span className="ask-thinking" role="status">
          <i /><i /><i />
          <span className="sr-only">Searching the portfolio</span>
        </span>
      ) : null}

      {blocks.map((block, i) => {
        const shown = Math.floor(revealed - offset);
        offset += block.text.length;
        if (shown <= 0) return null;
        const text = shown >= block.text.length ? block.text : block.text.slice(0, shown);
        const complete = shown >= block.text.length;

        return (
          <p key={i}>
            {/* Terms are only marked once the passage has finished arriving:
                highlighting a half-written word makes the text flicker. */}
            <RichText text={text} terms={done && complete ? terms : null} />
            {block.cite && complete ? (
              <button
                type="button"
                className="ask-cite"
                onClick={(event) => { event.stopPropagation(); onCite(sources[block.cite - 1]); }}
                aria-label={`Source ${block.cite}: ${sources[block.cite - 1]?.title}`}
              >
                {block.cite}
              </button>
            ) : null}
          </p>
        );
      })}

      {/* Which of the two an answer is, said plainly. The distinction is the
          reader's to make, not ours to blur: one is the site's own words, the
          other is a model's sentence built from them, and only the first can
          be checked word for word against the page it cites. */}
      {done && sources.length ? (
        <p className="ask-provenance">
          {ai
            ? <><span className="ask-provenance-mark" aria-hidden="true">✦</span> Written by Gemini from these pages only</>
            : 'Exact text from this page'}
        </p>
      ) : null}

      {done && sources.length ? (
        <ul className="ask-sources">
          {sources.map((source) => (
            <li key={source.n}>
              <button type="button" onClick={() => onCite(source)}>
                <span className="ask-source-n" aria-hidden="true">{source.n}</span>
                <span className="ask-source-kind">{source.source}</span>
                <span className="ask-source-title">{source.title}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {done && followups.length ? (
        <div className="ask-followups">
          {followups.map((followup) => (
            <button type="button" key={followup} onClick={() => onAsk(followup)}>
              {followup}
              <span aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
