import test from 'node:test';
import assert from 'node:assert/strict';
import { BPlusTree } from '../lib/querylite/btree.mjs';
import { seeded } from '../lib/raft.mjs';

test('keeps every key findable and in order through many splits', () => {
  const t = new BPlusTree(4);
  const keys = Array.from({ length: 2000 }, (_, i) => (i * 7919) % 2000);
  keys.forEach((k, id) => t.insert(k, id));
  t.check();
  assert.ok(t.height() > 3, 'small order forces a deep tree');
  keys.forEach((k, id) => assert.deepEqual(t.get(k).ids, [id]));
  assert.deepEqual(t.get(5000).ids, []);
});

test('range scans walk the leaf chain with open and closed ends', () => {
  const t = new BPlusTree(5);
  for (let i = 0; i < 500; i += 1) t.insert(i, i);
  assert.deepEqual(t.range(10, 14).ids, [10, 11, 12, 13, 14]);
  assert.deepEqual(t.range(10, 14, false, false).ids, [11, 12, 13]);
  assert.deepEqual(t.range(undefined, 2).ids, [0, 1, 2]);
  assert.deepEqual(t.range(497).ids, [497, 498, 499]);
});

test('duplicates, text keys and deletes stay consistent (random)', () => {
  const rand = seeded(7);
  const t = new BPlusTree(6);
  const truth = new Map();
  for (let step = 0; step < 6000; step += 1) {
    const k = rand() < 0.5 ? Math.floor(rand() * 300) : `k${Math.floor(rand() * 300)}`;
    if (rand() < 0.7) {
      t.insert(k, step);
      if (!truth.has(k)) truth.set(k, []);
      truth.get(k).push(step);
    } else if (truth.get(k)?.length) {
      const ids = truth.get(k);
      const id = ids.splice(Math.floor(rand() * ids.length), 1)[0];
      assert.equal(t.delete(k, id), true);
    }
  }
  t.check();
  for (const [k, ids] of truth) assert.deepEqual(t.get(k).ids.sort((a, b) => a - b), ids.slice().sort((a, b) => a - b));
});
