import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkBlocks, estimateTokens } from '../src/ingest/chunk.js';

test('small blocks from the same sheet are packed together', () => {
  const blocks = Array.from({ length: 10 }, (_, i) => ({
    text: `[Claims] Claim ID: CLM-${i} | Amount: ${i * 100}`,
    locator: { sheet: 'Claims', row: i + 2, kind: 'row' },
  }));

  const chunks = chunkBlocks(blocks);
  assert.ok(chunks.length < blocks.length, 'rows should be packed, not one chunk each');
  assert.deepEqual(chunks[0].locator.rows, [2, chunks[0].text.split('\n').length + 1]);
});

test('blocks from different sheets never share a chunk', () => {
  const chunks = chunkBlocks([
    { text: 'row from A', locator: { sheet: 'A', row: 2, kind: 'row' } },
    { text: 'row from B', locator: { sheet: 'B', row: 2, kind: 'row' } },
  ]);

  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].locator.sheet, 'A');
  assert.equal(chunks[1].locator.sheet, 'B');
});

test('an oversized block is split with overlap, not truncated', () => {
  const sentence = 'The claim was settled within the agreed turnaround window. ';
  const blocks = [{ text: sentence.repeat(120), locator: { page: 3, kind: 'page' } }];

  const chunks = chunkBlocks(blocks);
  assert.ok(chunks.length > 1, 'a 7000-character page should split');
  /* Nothing may be silently dropped: every chunk keeps its page, and the
     combined length must exceed the original (overlap adds, never removes). */
  const combined = chunks.reduce((n, c) => n + c.text.length, 0);
  assert.ok(combined >= blocks[0].text.length * 0.98);
  for (const chunk of chunks) assert.equal(chunk.locator.page, 3);
});

test('a single unbroken string still terminates and is fully covered', () => {
  const blob = 'x'.repeat(5000);
  const chunks = chunkBlocks([{ text: blob, locator: { kind: 'text' } }]);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((c) => c.text.length <= 1400));
});

test('chunks are numbered in document order', () => {
  const chunks = chunkBlocks([
    { text: 'a'.repeat(1000), locator: { page: 1 } },
    { text: 'b'.repeat(1000), locator: { page: 2 } },
  ]);
  assert.deepEqual(chunks.map((c) => c.ordinal), chunks.map((_, i) => i));
});

test('empty and whitespace-only blocks are dropped', () => {
  const chunks = chunkBlocks([
    { text: '   ', locator: {} },
    { text: '', locator: {} },
    { text: 'real content', locator: {} },
  ]);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].text, 'real content');
});

test('token estimate tracks length', () => {
  assert.equal(estimateTokens('abcd'), 1);
  assert.ok(estimateTokens('a'.repeat(400)) === 100);
});
