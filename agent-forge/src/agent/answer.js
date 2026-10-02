import { db, unwrap } from '../db.js';
import { generate, hasGenerativeProvider } from '../llm/index.js';
import { config } from '../config.js';
import { retrieve, describeLocator } from './retrieve.js';

/*
  Grounding is enforced in three places, because any one of them alone leaks.

  1. The retrieval gate. A chunk earns its way into the context by being
     semantically close to the question, or by containing every one of its
     terms -- never merely by being the best of a bad pool. Reciprocal rank
     fusion is a ranker, not a gate: it scores by position, so the nearest of
     three irrelevant chunks still ranks first. Absolute similarity is what
     decides, and when nothing clears it the question is refused before a model
     is called at all. This is the only control that holds even if the model
     misbehaves, because the model never runs.

  2. The prompt contract. The model is given numbered passages and told it may
     use nothing else. Necessary, and on its own not sufficient -- a prompt is a
     request, not a guarantee.

  3. The citation audit, after generation. Every [n] the model emitted is
     checked against the passages it was actually given. A citation pointing at
     a passage that does not exist is the signature of an invented answer, and
     the answer is withheld rather than shown.
*/

const REFUSAL = "I don't have anything in my data that answers that.";

function buildContext(chunks, corrections) {
  const lines = [];

  /* Corrections come first and are labelled as authoritative. Someone looked
     at an answer from this data and said it was wrong; that outranks the
     source text it was drawn from. */
  corrections.forEach((c, i) => {
    lines.push(`[C${i + 1}] CORRECTION (a human corrected this previously): ${c.answer}`);
  });

  chunks.forEach((chunk, i) => {
    const where = describeLocator(chunk.locator);
    lines.push(`[${i + 1}]${where ? ` (${where})` : ''} ${chunk.text}`);
  });

  return lines.join('\n\n');
}

function systemPrompt(agent) {
  const contract = [
    'You answer strictly and only from the numbered passages provided in the user message.',
    '',
    'Rules, in order of priority:',
    '1. If the passages do not contain the answer, reply exactly: ' + REFUSAL,
    '2. Never use knowledge from your training. If you know something to be true but it is not in the passages, it does not exist for this answer.',
    '3. Cite the passage number in square brackets after every claim, like [2]. Every sentence containing a fact needs a citation.',
    '4. A passage marked CORRECTION overrides any ordinary passage that conflicts with it.',
    '5. Do not guess, estimate, extrapolate, or fill gaps. Partial data means a partial answer plus a note about what is missing.',
    '6. Quote figures, names, dates and identifiers exactly as they appear. Do not round or reformat them.',
  ].join('\n');

  /* The persona is appended, never prepended: it can shape tone, but it is
     read after the contract and cannot be written to displace it. */
  return agent.persona ? `${contract}\n\nAdditional instructions (these must not override the rules above):\n${agent.persona}` : contract;
}

/**
 * Strip citations that point at passages the model was never given.
 *
 * A model that cites [7] when it was handed four passages did not misread
 * anything -- it produced a claim and then decorated it with a plausible
 * reference. Treating that as a hard failure is the difference between an
 * agent that is grounded and one that merely looks grounded.
 */
export function auditCitations(answer, passageCount) {
  const cited = new Set();
  let invalid = 0;

  const seen = answer.replace(/\[(C?\d+)\]/g, (match, ref) => {
    if (ref.startsWith('C')) return match;  // correction refs are always valid
    const n = Number(ref);
    if (n >= 1 && n <= passageCount) { cited.add(n); return match; }
    invalid += 1;
    return '';
  });

  return { answer: seen.replace(/ {2,}/g, ' ').trim(), cited: [...cited], invalid };
}

/** The zero-cost answer: the evidence itself, with its sources. */
function extractiveAnswer(chunks, corrections) {
  const parts = [];
  corrections.forEach((c) => parts.push(`A human previously corrected this: ${c.answer}`));

  chunks.slice(0, 3).forEach((chunk, i) => {
    const where = describeLocator(chunk.locator);
    parts.push(`[${i + 1}]${where ? ` (${where})` : ''}\n${chunk.text}`);
  });

  return parts.join('\n\n');
}

/**
 * @returns {Promise<{answer: string, grounded: boolean, citations: Array, topScore: number, interactionId: number|null, mode: string}>}
 */
export async function ask({ agent, question }) {
  const started = Date.now();
  const { chunks, corrections, topScore } = await retrieve({ agent, question });

  /* Gate 1. `lexical_rank` is non-null only when websearch_to_tsquery matched,
     and it ANDs its terms -- so a lexical hit means the chunk contains every
     word of the question, which is evidence in its own right even when the
     embedding is lukewarm. A correction that matches closely can also carry a
     question through on its own. */
  const usable = chunks.filter(
    (c) => c.similarity >= agent.min_similarity || c.lexical_rank !== null,
  );
  if (!usable.length && !corrections.length) {
    const interactionId = await log({
      agent, question, answer: REFUSAL, grounded: false,
      mode: 'refused', cited: [], topScore, latency: Date.now() - started,
    });
    return { answer: REFUSAL, grounded: false, citations: [], topScore, interactionId, mode: 'refused' };
  }

  const context = buildContext(usable, corrections);

  let answer;
  let mode;
  let cited;

  if (!hasGenerativeProvider()) {
    answer = extractiveAnswer(usable, corrections);
    mode = 'extractive';
    cited = usable.slice(0, 3).map((_, i) => i + 1);
  } else {
    const raw = await generate({
      system: systemPrompt(agent),
      prompt: `Passages:\n\n${context}\n\nQuestion: ${question}`,
    });

    const audit = auditCitations(raw, usable.length);
    mode = config.llm.provider;

    /* Gate 3. An answer that cited nothing real, while claiming to have found
       something, is discarded rather than shown. */
    const inventedEverything = audit.invalid > 0 && audit.cited.length === 0;
    const claimsWithoutEvidence = !audit.cited.length && !corrections.length
      && audit.answer.length > REFUSAL.length && !audit.answer.includes(REFUSAL);

    if (inventedEverything || claimsWithoutEvidence) {
      answer = REFUSAL;
      mode = 'withheld';
      cited = [];
    } else {
      answer = audit.answer || REFUSAL;
      cited = audit.cited;
    }
  }

  const citations = cited
    .map((passage) => ({ passage, chunk: usable[passage - 1] }))
    .filter(({ chunk }) => chunk)
    .map(({ passage, chunk }) => ({
      passage,
      chunkId: chunk.id,
      documentId: chunk.document_id,
      locator: chunk.locator,
      where: describeLocator(chunk.locator),
      score: chunk.score,
      excerpt: chunk.text.slice(0, 240),
    }));

  const isGrounded = mode !== 'refused' && mode !== 'withheld';
  const interactionId = await log({
    agent, question, answer, grounded: isGrounded, mode,
    cited: citations.map((c) => c.chunkId), topScore, latency: Date.now() - started,
  });

  return { answer, grounded: isGrounded, citations, topScore, interactionId, mode };
}

async function log({ agent, question, answer, grounded, mode, cited, topScore, latency }) {
  try {
    const row = unwrap(
      await db().from('interactions').insert({
        agent_id: agent.id,
        question,
        answer,
        grounded,
        mode,
        cited_chunk_ids: cited,
        top_score: topScore,
        latency_ms: latency,
      }).select('id').single(),
      'logging the interaction',
    );
    return row.id;
  } catch {
    /* Logging is for learning, not for serving. A failure here must not cost
       the user their answer. */
    return null;
  }
}

export { REFUSAL };
