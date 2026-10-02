import test from 'node:test';
import assert from 'node:assert/strict';
import { selectContributors, composeTeamAnswer } from '../src/agent/router.js';

/*
  Routing arithmetic.

  `route_agents` decides *which* agents hold evidence, in SQL, against a live
  index. What happens to that ranked list afterwards is plain arithmetic, and it
  is the part someone will tune: widen `spread` and every question fans out to
  agents with nothing to say; narrow it and a question stops reaching an agent
  that could have answered. Neither failure throws, and neither is visible in a
  transcript, so both are asserted here.
*/

const routed = (...similarities) =>
  similarities.map((best_similarity, i) => ({
    agent_id: `id-${i}`,
    slug: `agent-${i}`,
    best_similarity,
  }));

test('no candidates means nobody is asked', () => {
  assert.deepEqual(selectContributors([]), []);
});

test('a clear leader is asked alone', () => {
  const chosen = selectContributors(routed(0.61, 0.22, 0.20), { spread: 0.12 });
  assert.deepEqual(chosen.map((c) => c.slug), ['agent-0'], 'the others are far below');
});

test('a close second is consulted, a distant third is not', () => {
  const chosen = selectContributors(routed(0.52, 0.45, 0.31), { spread: 0.12 });
  assert.deepEqual(chosen.map((c) => c.slug), ['agent-0', 'agent-1']);
});

test('the spread boundary is inclusive', () => {
  /* Exactly `spread` below the leader is still in. An exclusive bound here would
     make the documented number mean something slightly different from what it
     says, which is the kind of thing that gets re-tuned instead of fixed. */
  const chosen = selectContributors(routed(0.40, 0.28), { spread: 0.12 });
  assert.equal(chosen.length, 2, '0.28 is 0.12 below 0.40 and qualifies');

  const justOutside = selectContributors(routed(0.40, 0.2799), { spread: 0.12 });
  assert.equal(justOutside.length, 1, 'a hair further out does not');
});

test('maxAgents caps the fan-out even when everybody is close', () => {
  const chosen = selectContributors(routed(0.50, 0.49, 0.48, 0.47, 0.46), { maxAgents: 3 });
  assert.equal(chosen.length, 3, 'a five-way tie still costs three answers, not five');
  assert.deepEqual(chosen.map((c) => c.slug), ['agent-0', 'agent-1', 'agent-2'], 'the best three');
});

test('ranking order survives selection', () => {
  const chosen = selectContributors(routed(0.50, 0.47, 0.44), { maxAgents: 3 });
  const scores = chosen.map((c) => c.best_similarity);
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a), 'still best first');
});

test('the defaults are the shipped ones', () => {
  /* The defaults are the numbers the README quotes, so they are worth pinning.
     Cut-off is 0.50 - 0.12 = 0.38: all four below qualify, and the cap decides. */
  assert.equal(selectContributors(routed(0.50, 0.45, 0.42, 0.40)).length, 3);
  assert.equal(selectContributors(routed(0.50, 0.45, 0.37)).length, 2, 'and 0.37 is outside it');
});

test('one contributor reads as a plain answer, unattributed', () => {
  const answer = composeTeamAnswer([
    { agent: { name: 'Claims Desk' }, answer: 'Seven working days [1].' },
  ]);
  assert.equal(answer, 'Seven working days [1].', 'no header for a single source');
});

test('several contributors are attributed by name', () => {
  const answer = composeTeamAnswer([
    { agent: { name: 'Claims Desk' }, answer: 'Seven working days [1].' },
    { agent: { name: 'HR' }, answer: 'Twelve days of leave [1].' },
  ]);
  assert.equal(answer, '**Claims Desk**\nSeven working days [1].\n\n**HR**\nTwelve days of leave [1].');
  /* Each half keeps its own [1] because each was numbered against its own
     passages. Merging the lists would make the citations point at the wrong
     document, which is exactly the laundering the composition design avoids. */
  assert.equal(answer.match(/\[1\]/g).length, 2, 'citation numbers stay per-agent');
});
