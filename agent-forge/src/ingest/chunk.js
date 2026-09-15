/*
  Blocks in, chunks out.

  A chunk is what retrieval returns and what an answer may quote, so its size is
  a direct trade-off. Too large and one chunk matches every query weakly while
  answering none precisely, and the context window fills with padding. Too small
  and a fact gets separated from the thing it is about -- a row of figures
  without its date, a clause without its subject.

  ~900 characters sits near the sweet spot for MiniLM, whose attention window is
  256 word-pieces: a chunk much longer than that has its tail silently ignored
  by the embedding model even though it is stored in full.
*/

const TARGET = 900;
const MAX = 1400;
const OVERLAP = 150;

/** Rough but stable: English averages ~4 characters per token. */
export function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

function sameGroup(a, b) {
  const x = a.locator || {};
  const y = b.locator || {};
  /* Rows of one sheet pack together; rows of different sheets never do, because
     a chunk spanning two sheets cites neither honestly. */
  return x.sheet === y.sheet && x.page === y.page && x.slide === y.slide && x.kind === y.kind;
}

/** Merge the locators of the blocks that ended up in one chunk. */
function mergeLocators(blocks) {
  const first = blocks[0].locator || {};
  const last = blocks[blocks.length - 1].locator || {};
  const out = { ...first };

  if (first.row !== undefined && last.row !== undefined && first.row !== last.row) {
    out.rows = [first.row, last.row];
    delete out.row;
  }
  if (first.record !== undefined && last.record !== undefined && first.record !== last.record) {
    out.records = [first.record, last.record];
    delete out.record;
  }
  if (first.page !== undefined && last.page !== undefined && first.page !== last.page) {
    out.pages = [first.page, last.page];
    delete out.page;
  }
  return out;
}

/**
 * Split one oversized block on paragraph, then sentence, then hard character
 * boundaries. Overlap is carried between the pieces so a sentence spanning a
 * split is still wholly present in one of them.
 */
function splitLongBlock(block) {
  const pieces = [];
  const paragraphs = block.text.split(/\n\s*\n/);
  let current = '';

  const push = () => {
    const text = current.trim();
    if (text) pieces.push({ text, locator: { ...block.locator } });
    current = '';
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > MAX) {
      push();
      const sentences = paragraph.match(/[^.!?\n]+[.!?]*\s*/g) || [paragraph];
      for (const sentence of sentences) {
        if (current.length + sentence.length > TARGET && current) {
          /* Start the next piece with the tail of this one, so a fact split
             across the boundary survives intact on one side. */
          const tail = current.slice(-OVERLAP);
          push();
          current = tail;
        }
        current += sentence;
        /* A single sentence longer than MAX (minified JSON, a base64 blob) has
           no natural boundary left; cut it. */
        while (current.length > MAX) {
          pieces.push({ text: current.slice(0, MAX), locator: { ...block.locator } });
          current = current.slice(MAX - OVERLAP);
        }
      }
    } else {
      if (current.length + paragraph.length > TARGET && current) push();
      current += (current ? '\n\n' : '') + paragraph;
    }
  }
  push();
  return pieces;
}

/**
 * @param {Array<{text: string, locator: object}>} blocks
 * @returns {Array<{text: string, locator: object, token_estimate: number, ordinal: number}>}
 */
export function chunkBlocks(blocks) {
  const chunks = [];
  let batch = [];
  let length = 0;

  const flush = () => {
    if (!batch.length) return;
    chunks.push({
      text: batch.map((b) => b.text).join('\n'),
      locator: mergeLocators(batch),
    });
    batch = [];
    length = 0;
  };

  for (const block of blocks) {
    const text = String(block.text || '').trim();
    if (!text) continue;
    const item = { text, locator: block.locator || {} };

    if (text.length > MAX) {
      flush();
      /* A sheet summary or a long page is emitted on its own: it is already a
         coherent unit and packing neighbours onto it only dilutes it. */
      for (const piece of splitLongBlock(item)) chunks.push(piece);
      continue;
    }

    if (batch.length && (length + text.length > TARGET || !sameGroup(batch[0], item))) flush();
    batch.push(item);
    length += text.length + 1;
  }
  flush();

  return chunks.map((chunk, i) => ({
    ...chunk,
    ordinal: i,
    token_estimate: estimateTokens(chunk.text),
  }));
}
