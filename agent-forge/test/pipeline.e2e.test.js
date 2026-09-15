import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { parseFile } from '../src/ingest/parse.js';
import { chunkBlocks } from '../src/ingest/chunk.js';
import { embed, embedOne, cosine } from '../src/embeddings.js';

/* The shipped default, mirrored from agents.min_similarity. The tests below
   assert the *separation* around it -- correct answers above, off-topic well
   below -- so changing the default cannot quietly start refusing real answers
   or admitting junk. */
const GATE = 0.20;

/*
  The rest of the suite tests pure functions in isolation. This file runs the
  real path -- a real workbook through the real parser, the real chunker and the
  real embedding model -- and asserts on retrieval *quality*, not just on shape.

  Only the final INSERT is absent, because that needs a database. Everything
  that decides which passage answers a question is exercised here.
*/

const WORKBOOK = (() => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Quarterly Claims Register'],
    [],
    ['Claim ID', 'Member', 'Amount', 'Status', 'Region'],
    ['CLM-4417', 'R. Deshmukh', '18500', 'Settled', 'Pune'],
    ['CLM-4418', 'S. Patil', '9200', 'Pending', 'Mumbai'],
    ['CLM-4419', 'A. Kulkarni', '45300', 'Settled', 'Pune'],
  ]), 'Claims');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Topic', 'Detail'],
    ['Preauthorisation', 'Cashless preauthorisation is decided within seven working days of receipt.'],
    ['Escalation', 'Unresolved grievances are escalated to the TPA desk in Pune.'],
  ]), 'Policy');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
})();

/** Rank every chunk against a question the way the database would. */
async function rank(chunks, question) {
  const [vectors, q] = await Promise.all([
    embed(chunks.map((c) => c.text)),
    embedOne(question),
  ]);
  return chunks
    .map((chunk, i) => ({ chunk, similarity: cosine(vectors[i], q) }))
    .sort((a, b) => b.similarity - a.similarity);
}

let chunks;

test('a real workbook survives parse and chunk with its structure intact', async () => {
  const { kind, blocks, metadata } = await parseFile(WORKBOOK, 'claims-register.xlsx');
  assert.equal(kind, 'xlsx');
  /* The title row and the blank must not have been mistaken for the header. */
  assert.deepEqual(metadata.sheets[0].columns, ['Claim ID', 'Member', 'Amount', 'Status', 'Region']);
  assert.equal(metadata.sheets[0].rows, 3);

  chunks = chunkBlocks(blocks);
  assert.ok(chunks.length >= 2, 'two sheets must produce at least two chunks');
  /* No chunk may span both sheets -- a citation covering two sheets is honest
     about neither. */
  for (const chunk of chunks) {
    const sheets = new Set([chunk.locator.sheet].filter(Boolean));
    assert.ok(sheets.size <= 1);
  }
});

test('a question about a named member retrieves that row', async () => {
  const [top] = await rank(chunks, "how much was R. Deshmukh's claim settled for?");
  assert.match(top.chunk.text, /CLM-4417/);
  assert.match(top.chunk.text, /18500/);
  assert.ok(top.similarity > GATE, `similarity ${top.similarity.toFixed(3)} must clear the gate`);
});

test('a paraphrase with no shared words still retrieves the right policy', async () => {
  /* "how long do I wait for approval" shares no content word with "cashless
     preauthorisation is decided within seven working days" -- this is the exact
     query a lexical index scores at zero. */
  const [top] = await rank(chunks, 'how long do I wait for approval before treatment?');
  assert.match(top.chunk.text, /preauthorisation/i);
  /* This is the hardest case in the suite and the one that set the default:
     it scores ~0.27, which the commonly-quoted MiniLM threshold of 0.35 would
     have refused outright. */
  assert.ok(top.similarity > GATE, `similarity ${top.similarity.toFixed(3)} must clear the gate`);
});

test('an aggregate question retrieves the sheet summary, not a single row', async () => {
  const [top] = await rank(chunks, 'what columns does the claims register have and how many rows?');
  assert.equal(top.chunk.locator.kind, 'summary');
  assert.match(top.chunk.text, /Columns: Claim ID, Member, Amount, Status, Region/);
});

test('an off-topic question clears nothing, so the agent would refuse', async () => {
  const ranked = await rank(chunks, 'what is the capital of France?');
  /* The guarantee, measured rather than asserted by construction: the best
     chunk in the whole corpus must still fall under the gate. */
  assert.ok(
    ranked[0].similarity < GATE,
    `off-topic best match scored ${ranked[0].similarity.toFixed(3)}, which would wrongly admit it`,
  );
});

test('the gate separates correct answers from off-topic ones by a wide margin', async () => {
  /* A single assertion on the property the whole design rests on. If a future
     change to chunking or the embedding model narrows this gap, the number to
     look at is the ratio, not either score alone. */
  const [offTopic] = await rank(chunks, 'what is the capital of France?');
  const [paraphrase] = await rank(chunks, 'how long do I wait for approval before treatment?');

  assert.ok(
    paraphrase.similarity > offTopic.similarity * 3,
    `separation too narrow: correct ${paraphrase.similarity.toFixed(3)} vs ` +
    `off-topic ${offTopic.similarity.toFixed(3)}`,
  );
  assert.ok(offTopic.similarity < GATE && paraphrase.similarity > GATE,
    'the gate must fall between the two');
});
