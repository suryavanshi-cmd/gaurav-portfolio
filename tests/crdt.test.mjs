import test from 'node:test';
import assert from 'node:assert/strict';
import { TextCRDT } from '../lib/crdt.mjs';
import { seeded } from '../lib/raft.mjs';

test('local edits behave like a normal text box', () => {
  const d = new TextCRDT('a');
  d.insert(0, 'hello world');
  d.delete(5, 6);
  d.insert(5, ', there');
  assert.equal(d.text(), 'hello, there');
  d.edit('oh hello, there!');
  assert.equal(d.text(), 'oh hello, there!');
});

test('concurrent inserts at the same spot merge the same way everywhere', () => {
  const a = new TextCRDT('a');
  const b = new TextCRDT('b');
  const base = a.insert(0, 'ac');
  b.applyAll(base);
  const fromA = a.insert(1, 'X');
  const fromB = b.insert(1, 'Y');
  a.applyAll(fromB);
  b.applyAll(fromA);
  assert.equal(a.text(), b.text());
  assert.equal(a.text().length, 4);
});

test('operations can arrive late, out of order and twice', () => {
  const a = new TextCRDT('a');
  const ops = [...a.insert(0, 'abcdef'), ...a.delete(2, 2), ...a.insert(2, 'XY')];
  const b = new TextCRDT('b');
  b.applyAll(ops.slice().reverse());
  b.applyAll(ops);
  assert.equal(b.text(), a.text());
  assert.equal(b.pending.length, 0);
});

test('three replicas converge after random offline editing (property)', () => {
  for (let seed = 1; seed <= 60; seed += 1) {
    const rand = seeded(seed);
    const peers = ['a', 'b', 'c'].map((s) => new TextCRDT(s));
    const outbox = [];
    for (let step = 0; step < 120; step += 1) {
      const p = Math.floor(rand() * 3);
      const d = peers[p];
      const len = d.text().length;
      let ops;
      if (len && rand() < 0.35) ops = d.delete(Math.floor(rand() * len), 1 + Math.floor(rand() * 2));
      else ops = d.insert(Math.floor(rand() * (len + 1)), String.fromCharCode(97 + Math.floor(rand() * 26)).repeat(1 + Math.floor(rand() * 3)));
      ops.forEach((op) => outbox.push({ from: p, op }));
      /* Deliver a random, shuffled part of the backlog — some ops twice. */
      if (rand() < 0.3) {
        const k = Math.floor(rand() * outbox.length);
        for (let i = 0; i < k; i += 1) {
          const m = outbox[Math.floor(rand() * outbox.length)];
          peers.forEach((q, j) => { if (j !== m.from) q.apply(m.op); });
        }
      }
    }
    for (const m of outbox) peers.forEach((q, j) => { if (j !== m.from) q.apply(m.op); });
    const texts = peers.map((q) => q.text());
    assert.equal(new Set(texts).size, 1, `seed ${seed}: ${texts.join(' | ')}`);
    peers.forEach((q) => assert.equal(q.pending.length, 0));
  }
});

test('emoji survive concurrent edits whole', () => {
  const a = new TextCRDT('a');
  const b = new TextCRDT('b');
  b.applyAll(a.edit('🍋🍎'));
  const fromA = a.edit('🍋🍇🍎');
  const fromB = b.edit('🍋🍎🍓');
  a.applyAll(fromB);
  b.applyAll(fromA);
  assert.equal(a.text(), '🍋🍇🍎🍓');
  assert.equal(b.text(), a.text());
});

test('the caret stays put when someone else types before it', () => {
  const a = new TextCRDT('a');
  const b = new TextCRDT('b');
  b.applyAll(a.insert(0, 'world'));
  const caret = b.anchor(5);
  b.applyAll(a.insert(0, 'hello '));
  assert.equal(b.text(), 'hello world');
  assert.equal(b.resolve(caret), 11);
});
