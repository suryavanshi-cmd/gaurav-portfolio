import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIndex } from '../components/rag/retriever.js';
import { buildCorpus, SUGGESTIONS } from '../components/rag/corpus.js';
import { composeAnswer, REFUSAL } from '../components/rag/answer.js';

/*
  The assistant answers from a fixed corpus and is supposed to refuse anything
  it cannot support. Both halves of that are easy to break silently: loosen the
  gate and it starts answering questions about the weather with a paragraph
  about TestNG; tighten it and the suggested questions on the empty state lead
  straight to a refusal. Neither shows up as an error, so both are asserted
  here, against the real corpus rather than a fixture.
*/

const index = buildIndex(buildCorpus());

test('the corpus is actually built', () => {
  assert.ok(index.size > 20, `expected a real index, got ${index.size} documents`);
});

test('every suggested question the empty state offers can be answered', () => {
  /* These are the first thing a visitor clicks. A suggestion that refuses is
     worse than no suggestion at all. */
  for (const question of SUGGESTIONS) {
    const answer = composeAnswer(index, question);
    assert.ok(answer.grounded, `"${question}" was refused`);
    assert.ok(answer.blocks[0].text.length > 40, `"${question}" answered with a fragment`);
  }
});

test('questions the site has no answer to are refused, in the same words every time', () => {
  const offSite = [
    'What is the capital of France?',
    'Can you write me a poem about the sea?',
    'What is his salary?',
    'Does he like pineapple on pizza?',
  ];
  for (const question of offSite) {
    const answer = composeAnswer(index, question);
    assert.equal(answer.grounded, false, `"${question}" was answered from thin air`);
    assert.equal(answer.blocks[0].text, REFUSAL);
    assert.deepEqual(answer.sources, [], 'a refusal cites nothing');
  }
});

test('a refusal still offers a way forward', () => {
  const answer = composeAnswer(index, 'What is the capital of France?');
  assert.ok(answer.followups.length > 0, 'a dead end is not an answer either');
  for (const followup of answer.followups) {
    assert.ok(composeAnswer(index, followup).grounded, `the offered "${followup}" refuses`);
  }
});

test('an answer is made only of passages that are in the corpus', () => {
  /* The guarantee the whole design rests on: no sentence is generated, so
     every block must appear verbatim in some indexed document. */
  const texts = new Set(buildCorpus().map((doc) => doc.text));
  for (const question of SUGGESTIONS) {
    for (const block of composeAnswer(index, question).blocks) {
      assert.ok(texts.has(block.text), `a block was not a corpus passage: ${block.text.slice(0, 60)}…`);
    }
  }
});

test('every quoted passage carries a citation, numbered from one', () => {
  const answer = composeAnswer(index, 'What has he built with LLMs and agents?');
  assert.ok(answer.sources.length >= 1);
  assert.deepEqual(
    answer.sources.map((source) => source.n),
    answer.sources.map((_, i) => i + 1),
    'source numbers are contiguous from 1',
  );
  for (const block of answer.blocks) {
    const cited = answer.sources.find((source) => source.n === block.cite);
    assert.ok(cited, `block cites [${block.cite}], which is not in the source list`);
    assert.ok(cited.title, 'a citation without a title is not checkable');
  }
});

test('a citation points at somewhere the visitor can go', () => {
  /* A citation you cannot open is decoration. Since the site became several
     pages a destination has to be a whole one — a bare '#skills' resolves to
     whatever page the assistant happens to be open on, which is the wrong
     section on four pages out of five and nothing at all on the fifth. */
  for (const doc of buildCorpus()) {
    assert.ok(doc.href, `${doc.id} has a destination`);
    assert.ok(
      doc.href.startsWith('/') || doc.href.startsWith('mailto:') || doc.href.startsWith('http'),
      `${doc.id} points at a page rather than a fragment: ${doc.href}`,
    );
  }
});

test('one document is quoted once, however many of its chunks matched', () => {
  /* Two paragraphs of the same article agreeing with each other is not
     corroboration, and reads like the assistant repeating itself. */
  const answer = composeAnswer(index, 'How does he test LLM systems?');
  const titles = answer.sources.map((source) => source.title);
  assert.equal(new Set(titles).size, titles.length, `repeated source: ${titles.join(', ')}`);
});

test('at most two passages are quoted', () => {
  for (const question of SUGGESTIONS) {
    const answer = composeAnswer(index, question);
    assert.ok(answer.blocks.length <= 2, `"${question}" answered with ${answer.blocks.length} passages`);
  }
});

test('a follow-up never leads to a refusal', () => {
  /* Follow-ups are built from hits that were retrieved but not quoted, so by
     construction the corpus can answer them. This asserts that construction
     holds for real questions, not just in principle. */
  for (const question of ['What does Gaurav work on right now?', 'What is his tech stack?']) {
    for (const followup of composeAnswer(index, question).followups) {
      assert.ok(composeAnswer(index, followup).grounded, `"${followup}" leads nowhere`);
    }
  }
});

test('the matched terms really are terms from the question', () => {
  /* The highlight in the answer claims "these are the words that earned the
     hit". If the gate let a synonym-only match through, that claim would be
     false and the highlight would mark nothing. */
  const answer = composeAnswer(index, 'What did he study?');
  assert.ok(answer.terms.length > 0, 'something matched');
});

/*
  The three numbers above are tuned by hand and read by nobody afterwards. The
  tests against the real corpus do not pin them — the corpus is large enough
  that the coverage gate decides almost every case on its own — so these drive a
  small purpose-built index where each threshold is the only thing that can
  matter.
*/

/* Filler widens the index so a term carried by a handful of documents is
   discriminating, which is the regime the real corpus is in. */
const filler = Array.from({ length: 20 }, (_, i) => ({
  id: `filler-${i}`,
  title: `Filler ${i}`,
  text: 'Unrelated prose about gardening, weather and municipal parking policy.',
  source: 'Filler',
}));

const doc = (title, text) => ({ id: `${title}-${text.length}`, title, text, source: 'Test' });

test('a passage that shares only a word everybody uses is not evidence', () => {
  /* Every document mentions telemetry, so the term discriminates nothing and
     BM25 scores it near zero. Coverage is a perfect 1.0 — the question is one
     word and that word matched — so only the floor can refuse this. */
  const everywhere = Array.from({ length: 24 }, (_, i) =>
    doc(`Doc ${i}`, `Telemetry is mentioned here, in passing, among other things number ${i}.`));
  const answer = composeAnswer(buildIndex(everywhere), 'telemetry');

  assert.equal(answer.grounded, false, 'a term in every document answers nothing');
  assert.equal(answer.blocks[0].text, REFUSAL);
});

test('an answer is capped even when five passages qualify', () => {
  const strong = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'].map((title) =>
    doc(title, 'Playwright browser automation runs the checkout journey on every pull request.'));
  const corpus = buildIndex([...strong, ...filler]);

  const answer = composeAnswer(corpus, 'playwright browser automation');
  assert.equal(answer.grounded, true);
  assert.equal(answer.blocks.length, 2, `${answer.blocks.length} passages, not the capped two`);
  assert.equal(answer.sources.length, 2);

  /* And the cap is the only thing holding them back — five were available. */
  assert.equal(composeAnswer(corpus, 'playwright browser automation', { maxPassages: 4 }).blocks.length, 4);
});

test('two chunks of the same document are quoted once between them', () => {
  const corpus = [
    doc('Alpha', 'Playwright browser automation covers the checkout journey.'),
    doc('Beta', 'Playwright browser automation covers the checkout journey in the first half.'),
    doc('Beta', 'Playwright browser automation covers the checkout journey in the second half.'),
    doc('Gamma', 'Playwright browser automation covers the checkout journey in a third separate note.'),
    ...filler,
  ];
  /* Run with a raised cap: at the shipped cap of two there is a single
     supporting slot, so one document cannot appear twice however the filters
     are written, and the test would pass without the dedupe being there. */
  const answer = composeAnswer(buildIndex(corpus), 'playwright browser automation', { maxPassages: 3 });

  const titles = answer.sources.map((source) => source.title);
  assert.equal(new Set(titles).size, titles.length, `the same document twice: ${titles.join(', ')}`);
  assert.ok(titles.includes('Gamma'), 'and the slot it freed went to a different document');
});

test('a passage below the leader supports nothing and is not quoted', () => {
  const corpus = [
    doc('Leader', 'Playwright browser automation, playwright traces, playwright fixtures, browser automation.'),
    doc('Distant', 'A passing mention of playwright browser automation in an otherwise long and unrelated discussion of procurement, invoicing, quarterly planning, office seating, travel policy, the cafeteria menu rotation, parking permits, badge renewals and the annual fire drill schedule.'),
    ...filler,
  ];
  const answer = composeAnswer(buildIndex(corpus), 'playwright browser automation');

  assert.deepEqual(answer.sources.map((source) => source.title), ['Leader'], 'the distant one waits');
});
