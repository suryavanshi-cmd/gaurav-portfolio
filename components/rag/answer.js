import { expand, search, tokenize } from './retriever.js';

/*
  What the assistant is allowed to say.

  The retriever returns a ranked list; ranking alone is not grounds for
  answering. BM25 will always rank something first, including for a question
  the site has no answer to, so the top hit has to clear a bar before it is
  treated as evidence. Everything below refuses instead, in the visitor's
  words rather than with an error.

  An answer is assembled from the passages that cleared the bar, each carrying
  the number of the source it came from. No sentence here is generated: every
  block of text is a passage Gaurav published, and the citation beside it says
  which one. That is the whole reason this cannot invent a fact.
*/

export const REFUSAL = "I don't have enough information about that in Gaurav's portfolio.";

/* A hit has to score at least this well. BM25 scores are unbounded, but a
   passage that shares one mid-frequency term with the question lands near 1.5,
   and that is not an answer — it is a coincidence with a word in common. */
const FLOOR = 2.2;

/* And it has to account for most of what was actually asked. This is the rule
   that separates "what did he study" from "write me a poem about the sea": both
   contain a word the corpus knows, but the first is entirely about it and the
   second is one word in three.

   Coverage is counted per *question* term rather than per matched term, and a
   term counts as covered when the hit matched it or matched one of the
   synonyms the retriever maps it to. Requiring a literal word in common would
   be stricter and wrong: the synonym table is hand-written by the author, so
   "study" reaching the education card through "degree" is a deliberate mapping
   being honoured, not a coincidence being stretched. */
const MIN_COVERAGE = 0.5;

/* Supporting passages are quoted only when they are very close to the leader.
   Below this they go to the follow-up row instead, where being merely related
   is enough.

   This was 0.55, which let a passage through at roughly half the leader's
   score — related enough to retrieve, not close enough to be part of the same
   answer. What that produced was an answer whose second paragraph had visibly
   changed the subject. A near-tie is the only thing worth quoting alongside,
   and two paragraphs is the most anyone reads in a chat panel. */
const SUPPORT_RATIO = 0.75;

const MAX_PASSAGES = 2;
const MAX_FOLLOWUPS = 3;

/**
 * Answers a question from the index, or refuses.
 *
 * @returns {{
 *   blocks: {text: string, cite: number}[],
 *   sources: {n: number, title: string, source: string, href?: string, hrefLabel?: string}[],
 *   terms: string[],
 *   followups: string[],
 *   grounded: boolean,
 * }}
 */
export function composeAnswer(index, question, { limit = 5, maxPassages = MAX_PASSAGES } = {}) {
  const asked = tokenize(question);
  const hits = search(index, question, limit)
    .filter((hit) => hit.score >= FLOOR)
    .filter((hit) => coverage(asked, hit.matched) >= MIN_COVERAGE);

  if (!hits.length) return refuse();

  const [best, ...rest] = hits;
  const supporting = rest
    .filter((hit) => hit.score >= best.score * SUPPORT_RATIO)
    /* One passage per document. Two chunks of the same article agree with
       each other by construction, so quoting both looks like corroboration
       that isn't there. At the shipped cap of two passages the filter below
       already covers this, since there is only one supporting slot and it
       cannot be the leader's document; this keeps the invariant true if the
       cap is ever raised, and the tests exercise it at a raised cap. */
    .filter((hit, i, list) => list.findIndex((h) => h.doc.title === hit.doc.title) === i)
    .filter((hit) => hit.doc.title !== best.doc.title)
    .slice(0, maxPassages - 1);

  const quoted = [best, ...supporting];
  const sources = quoted.map((hit, i) => ({
    n: i + 1,
    title: hit.doc.title,
    source: hit.doc.source,
    href: hit.doc.href,
    hrefLabel: hit.doc.hrefLabel,
  }));

  return {
    blocks: quoted.map((hit, i) => ({ text: hit.doc.text, cite: i + 1 })),
    sources,
    terms: best.matched,
    followups: followupsFrom(hits, quoted),
    grounded: true,
  };
}

/* The share of the question's own terms this hit speaks to. */
function coverage(asked, matched) {
  if (!asked.length) return 0;
  const found = new Set(matched);
  const answered = asked.filter((term) => expand([term]).some((t) => found.has(t)));
  return answered.length / asked.length;
}

function refuse() {
  return {
    blocks: [{ text: REFUSAL, cite: 0 }],
    sources: [],
    terms: [],
    /* The refusal is a dead end unless it also says what would work, so it
       carries the openers rather than leaving the visitor to guess. */
    followups: ['What does Gaurav work on right now?', 'What is his tech stack?'],
    grounded: false,
  };
}

/* Follow-ups come from hits that were retrieved but not quoted. A suggestion
   built this way is guaranteed to lead somewhere: the corpus already matched
   it. A fixed list of prompts has no such guarantee and eventually points at
   something the site no longer says. */
function followupsFrom(hits, quoted) {
  const used = new Set(quoted.map((hit) => hit.doc.title));
  const titles = [];
  for (const hit of hits) {
    if (used.has(hit.doc.title)) continue;
    used.add(hit.doc.title);
    titles.push(hit.doc.title);
    if (titles.length === MAX_FOLLOWUPS) break;
  }
  /* The bare title, not a sentence built around it. Wrapping these in "Tell me
     about …" worked for a noun phrase like "Technical skills" and produced
     "Tell me about the database is the bottleneck" for an article whose title
     is already a sentence. A topic needs no grammar. */
  return titles;
}

/* Exported for the tests, which pin the thresholds: both are the kind of
   number that gets nudged during a demo and never put back. */
export const THRESHOLDS = { FLOOR, MIN_COVERAGE, SUPPORT_RATIO, MAX_PASSAGES };
