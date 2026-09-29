import test from 'node:test';
import assert from 'node:assert/strict';
import { RaftCluster, seeded } from '../lib/raft.mjs';

test('elects exactly one leader and replicates a command to everyone', () => {
  const c = new RaftCluster({ seed: 3 });
  c.run(1500);
  const leaders = c.nodes.filter((n) => n.role === 'leader');
  assert.equal(leaders.length, 1);
  assert.notEqual(c.request('x=1'), null);
  c.run(500);
  for (const n of c.nodes) assert.deepEqual(n.applied, ['x=1']);
  assert.deepEqual(c.violations, []);
});

test('a crashed leader is replaced, and the new leader keeps committed entries', () => {
  const c = new RaftCluster({ seed: 11 });
  c.run(1500);
  c.request('a');
  c.request('b');
  c.run(400);
  const old = c.leader();
  c.crash(old.id);
  c.run(2000);
  const next = c.leader();
  assert.ok(next && next.id !== old.id);
  assert.deepEqual(next.log.slice(0, 2).map((e) => e.cmd), ['a', 'b']);
  c.request('c');
  c.restart(old.id);
  c.run(1500);
  for (const n of c.nodes) assert.deepEqual(n.applied, ['a', 'b', 'c']);
  assert.deepEqual(c.violations, []);
});

test('a minority partition cannot commit; healing brings it back in line', () => {
  const c = new RaftCluster({ seed: 5 });
  c.run(1500);
  const l = c.leader();
  c.partition([l.id]);
  c.request('lost');
  c.run(2000);
  const majorityLeader = c.leader();
  assert.notEqual(majorityLeader.id, l.id);
  c.request('kept');
  c.run(500);
  assert.ok(!c.nodes.some((n) => n.applied.includes('lost')), 'a command sent to the isolated leader is never applied');
  c.heal();
  c.run(2000);
  for (const n of c.nodes) assert.deepEqual(n.applied, ['kept']);
  assert.deepEqual(c.violations, []);
});

test('safety holds under random crashes, restarts and partitions (property)', () => {
  for (let seed = 1; seed <= 40; seed += 1) {
    const rand = seeded(seed * 97);
    const c = new RaftCluster({ seed });
    for (let step = 0; step < 60; step += 1) {
      const r = rand();
      const id = Math.floor(rand() * 5);
      if (r < 0.35) c.request();
      else if (r < 0.5) c.crash(id);
      else if (r < 0.65) c.restart(id);
      else if (r < 0.72) c.partition([id, (id + 1) % 5].slice(0, 1 + Math.floor(rand() * 2)));
      else if (r < 0.8) c.heal();
      c.run(50 + Math.floor(rand() * 250));
    }
    assert.deepEqual(c.violations, [], `seed ${seed}`);
    /* After everything heals and restarts, the cluster settles to one log. */
    c.heal();
    c.nodes.forEach((n) => c.restart(n.id));
    c.run(4000);
    c.request('final');
    c.run(2000);
    const applied = c.nodes.map((n) => JSON.stringify(n.applied));
    assert.equal(new Set(applied).size, 1, `seed ${seed}: all servers agree`);
    assert.deepEqual(c.violations, [], `seed ${seed}`);
  }
});
