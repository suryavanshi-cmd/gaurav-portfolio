import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCitations } from '../src/agent/answer.js';

/*
  The citation audit is the last line of defence. These tests describe the
  behaviour that matters: a reference to a passage that was never supplied is
  treated as evidence of invention, not as a typo to tidy up.
*/

test('valid citations are kept and reported', () => {
  const { answer, cited, invalid } = auditCitations('Claims settle in 7 days [1]. Pune leads [2].', 4);
  assert.equal(invalid, 0);
  assert.deepEqual(cited, [1, 2]);
  assert.match(answer, /\[1\]/);
});

test('a citation beyond the supplied passages is stripped and counted', () => {
  const { answer, cited, invalid } = auditCitations('Revenue tripled [7].', 3);
  assert.equal(invalid, 1);
  assert.deepEqual(cited, []);
  assert.doesNotMatch(answer, /\[7\]/);
});

test('correction references are always valid', () => {
  const { cited, invalid } = auditCitations('The TPA desk handles this [C1].', 2);
  assert.equal(invalid, 0);
  assert.deepEqual(cited, []);
});

test('a mix keeps the real citation and drops the invented one', () => {
  const { answer, cited, invalid } = auditCitations('Settled [1], and growing fast [9].', 2);
  assert.equal(invalid, 1);
  assert.deepEqual(cited, [1]);
  assert.match(answer, /\[1\]/);
  assert.doesNotMatch(answer, /\[9\]/);
});

test('zero is not a valid passage number', () => {
  const { invalid, cited } = auditCitations('Something [0].', 3);
  assert.equal(invalid, 1);
  assert.deepEqual(cited, []);
});

test('the same passage cited twice is reported once', () => {
  const { cited } = auditCitations('First [2]. Second [2].', 3);
  assert.deepEqual(cited, [2]);
});
