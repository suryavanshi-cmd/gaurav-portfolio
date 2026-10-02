'use client';

import { Fragment } from 'react';
import { stem } from '../rag/retriever.js';

/*
  Inline formatting and match highlighting for a passage.

  The corpus is prose, so this handles the two marks that actually occur in it
  — `code` and **bold** — and nothing else. A full markdown parser would be
  more code than the content justifies and would sit there unexercised.

  Highlighting marks the words the retriever matched on. It is the one honest
  way to show a lexical system working: those are the terms that earned the
  hit, so a visitor can see why this passage was returned rather than take it
  on trust.
*/

const INLINE = /(`[^`]+`|\*\*[^*]+\*\*)/g;
const WORD = /(\b[\w+#.]+\b)/g;
/* Tested with its own non-global copy: `WORD.test` would carry lastIndex from
   one call to the next and skip every other word. */
const IS_WORD = /^[\w+#.]+$/;

export default function RichText({ text, terms }) {
  const wanted = terms?.length ? new Set(terms) : null;

  return text.split(INLINE).map((run, i) => {
    if (!run) return null;
    if (run.startsWith('`') && run.endsWith('`') && run.length > 2) {
      return <code key={i}>{run.slice(1, -1)}</code>;
    }
    if (run.startsWith('**') && run.endsWith('**') && run.length > 4) {
      return <strong key={i}>{run.slice(2, -2)}</strong>;
    }
    if (!wanted) return <Fragment key={i}>{run}</Fragment>;

    return (
      <Fragment key={i}>
        {run.split(WORD).map((part, j) => (
          IS_WORD.test(part) && wanted.has(stem(part.toLowerCase()))
            ? <mark key={j}>{part}</mark>
            : <Fragment key={j}>{part}</Fragment>
        ))}
      </Fragment>
    );
  });
}
