/*
  Raft, the consensus algorithm behind etcd, Consul and CockroachDB, as a
  deterministic simulation.

  Five servers keep a replicated log. One is elected leader; clients send it
  commands; it copies them to the others and commits an entry once a majority
  has it. Servers can crash and restart, and the network can be split, while
  the algorithm keeps its promises:

    Election safety      at most one leader per term
    Log matching         same index + same term ⇒ same entry and same history
    Leader completeness  a committed entry is in every later leader's log
    State machine safety every server applies the same commands in the same order

  Time is simulated in whole milliseconds with a seeded random generator, so
  a run can be replayed exactly — which is what the tests do, thousands of
  times, with random crashes and partitions, checking the four promises above
  after every step. Follows the Raft paper (Ongaro & Ousterhout, 2014),
  figure 2, without snapshots or membership changes.
*/

export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HEARTBEAT = 50;
const BATCH = 8;

export class RaftCluster {
  constructor({ size = 5, seed = 1, latency = [15, 45], election = [150, 300] } = {}) {
    this.size = size;
    this.rand = seeded(seed);
    this.latency = latency;
    this.election = election;
    this.time = 0;
    this.queue = [];
    this.nextMsg = 1;
    this.groups = null;
    this.events = [];
    this.violations = [];
    this.leadersByTerm = new Map();
    this.committed = new Map();
    this.requests = 0;
    this.nodes = Array.from({ length: size }, (_, id) => ({
      id,
      name: `S${id + 1}`,
      alive: true,
      role: 'follower',
      term: 0,
      votedFor: null,
      log: [],
      commitIndex: 0,
      lastApplied: 0,
      applied: [],
      votes: new Set(),
      nextIndex: [],
      matchIndex: [],
      leaderId: null,
      deadline: 0,
      timeout: 0,
      heartbeatDue: 0,
    }));
    this.nodes.forEach((n) => this.resetTimer(n));
  }

  /* ----- helpers ------------------------------------------------------------ */

  log(text) {
    this.events.unshift({ t: this.time, text });
    if (this.events.length > 60) this.events.pop();
  }

  between([lo, hi]) { return lo + Math.floor(this.rand() * (hi - lo + 1)); }

  resetTimer(n) {
    n.timeout = this.between(this.election);
    n.deadline = this.time + n.timeout;
  }

  majority() { return Math.floor(this.size / 2) + 1; }

  canTalk(a, b) {
    if (!this.groups) return true;
    return this.groups.find((g) => g.has(a)) === this.groups.find((g) => g.has(b));
  }

  lastIndex(n) { return n.log.length; }
  lastTerm(n) { return n.log.length ? n.log[n.log.length - 1].term : 0; }

  send(from, to, type, body) {
    const lat = this.between(this.latency);
    this.queue.push({
      id: this.nextMsg++, from, to, type, body,
      sentAt: this.time, deliverAt: this.time + lat,
      dropped: !this.canTalk(from, to),
    });
  }

  /* ----- state changes -------------------------------------------------------- */

  stepDown(n, term) {
    if (term > n.term) {
      n.term = term;
      n.votedFor = null;
    }
    if (n.role !== 'follower') this.log(`${n.name} steps down to follower (term ${n.term})`);
    n.role = 'follower';
    n.votes.clear();
  }

  startElection(n) {
    n.role = 'candidate';
    n.term += 1;
    n.votedFor = n.id;
    n.votes = new Set([n.id]);
    n.leaderId = null;
    this.resetTimer(n);
    this.log(`${n.name} times out and asks for votes (term ${n.term})`);
    for (const peer of this.nodes) {
      if (peer.id !== n.id) this.send(n.id, peer.id, 'RequestVote', { term: n.term, lastLogIndex: this.lastIndex(n), lastLogTerm: this.lastTerm(n) });
    }
    if (n.votes.size >= this.majority()) this.becomeLeader(n);
  }

  becomeLeader(n) {
    n.role = 'leader';
    n.leaderId = n.id;
    n.nextIndex = this.nodes.map(() => n.log.length + 1);
    n.matchIndex = this.nodes.map(() => 0);
    n.matchIndex[n.id] = n.log.length;
    this.log(`${n.name} wins with ${n.votes.size} votes and leads term ${n.term}`);

    /* Election safety and leader completeness, checked as they happen. */
    const prev = this.leadersByTerm.get(n.term);
    if (prev !== undefined && prev !== n.id) this.violations.push(`two leaders in term ${n.term}: S${prev + 1} and ${n.name}`);
    this.leadersByTerm.set(n.term, n.id);
    for (const [index, entry] of this.committed) {
      const mine = n.log[index - 1];
      if (!mine || mine.term !== entry.term || mine.cmd !== entry.cmd) {
        this.violations.push(`${n.name} became leader of term ${n.term} without committed entry ${index}`);
      }
    }
    this.broadcast(n);
  }

  broadcast(n) {
    for (const peer of this.nodes) if (peer.id !== n.id) this.replicate(n, peer.id);
    n.heartbeatDue = this.time + HEARTBEAT;
  }

  replicate(n, to) {
    const prevLogIndex = n.nextIndex[to] - 1;
    const prevLogTerm = prevLogIndex > 0 ? n.log[prevLogIndex - 1].term : 0;
    const entries = n.log.slice(prevLogIndex, prevLogIndex + BATCH);
    this.send(n.id, to, 'AppendEntries', { term: n.term, prevLogIndex, prevLogTerm, entries, leaderCommit: n.commitIndex });
  }

  commitTo(n, index) {
    if (index <= n.commitIndex) return;
    n.commitIndex = index;
    while (n.lastApplied < n.commitIndex) {
      n.lastApplied += 1;
      const entry = n.log[n.lastApplied - 1];
      n.applied.push(entry.cmd);
      const known = this.committed.get(n.lastApplied);
      if (known && (known.term !== entry.term || known.cmd !== entry.cmd)) {
        this.violations.push(`${n.name} applied a different entry at index ${n.lastApplied}`);
      }
      if (!known) this.committed.set(n.lastApplied, { term: entry.term, cmd: entry.cmd });
    }
  }

  /* ----- message handlers ----------------------------------------------------- */

  deliver(m) {
    const n = this.nodes[m.to];
    if (!n.alive || m.dropped || !this.canTalk(m.from, m.to)) return;
    const b = m.body;
    if (b.term > n.term) this.stepDown(n, b.term);

    switch (m.type) {
      case 'RequestVote': {
        const upToDate = b.lastLogTerm > this.lastTerm(n) || (b.lastLogTerm === this.lastTerm(n) && b.lastLogIndex >= this.lastIndex(n));
        const granted = b.term === n.term && (n.votedFor === null || n.votedFor === m.from) && upToDate;
        if (granted) {
          n.votedFor = m.from;
          this.resetTimer(n);
        }
        this.send(n.id, m.from, 'Vote', { term: n.term, granted });
        break;
      }
      case 'Vote': {
        if (n.role !== 'candidate' || b.term !== n.term || !b.granted) break;
        n.votes.add(m.from);
        if (n.votes.size >= this.majority()) this.becomeLeader(n);
        break;
      }
      case 'AppendEntries': {
        if (b.term < n.term) {
          this.send(n.id, m.from, 'AppendReply', { term: n.term, success: false, lastIndex: this.lastIndex(n) });
          break;
        }
        if (n.role !== 'follower') this.stepDown(n, b.term);
        if (n.leaderId !== m.from) n.leaderId = m.from;
        this.resetTimer(n);
        const okPrev = b.prevLogIndex === 0 || (b.prevLogIndex <= n.log.length && n.log[b.prevLogIndex - 1].term === b.prevLogTerm);
        if (!okPrev) {
          this.send(n.id, m.from, 'AppendReply', { term: n.term, success: false, lastIndex: Math.min(this.lastIndex(n), b.prevLogIndex - 1) });
          break;
        }
        b.entries.forEach((e, k) => {
          const index = b.prevLogIndex + 1 + k;
          const existing = n.log[index - 1];
          if (existing && existing.term !== e.term) n.log.length = index - 1;
          if (!n.log[index - 1]) n.log.push({ term: e.term, cmd: e.cmd });
        });
        const lastNew = b.prevLogIndex + b.entries.length;
        if (b.leaderCommit > n.commitIndex) this.commitTo(n, Math.min(b.leaderCommit, lastNew));
        this.send(n.id, m.from, 'AppendReply', { term: n.term, success: true, matchIndex: lastNew });
        break;
      }
      case 'AppendReply': {
        if (n.role !== 'leader' || b.term !== n.term) break;
        if (b.success) {
          n.matchIndex[m.from] = Math.max(n.matchIndex[m.from], b.matchIndex);
          n.nextIndex[m.from] = n.matchIndex[m.from] + 1;
          /* Commit the highest index a majority has — only entries from the
             current term count directly (figure 8 of the paper). */
          for (let i = n.log.length; i > n.commitIndex; i -= 1) {
            if (n.log[i - 1].term !== n.term) break;
            const have = n.matchIndex.filter((x) => x >= i).length;
            if (have >= this.majority()) {
              const before = n.commitIndex;
              this.commitTo(n, i);
              this.log(`${n.name} commits up to entry ${i} (${i - before} new)`);
              break;
            }
          }
          if (n.nextIndex[m.from] <= n.log.length) this.replicate(n, m.from);
        } else {
          n.nextIndex[m.from] = Math.max(1, Math.min(n.nextIndex[m.from] - 1, b.lastIndex + 1));
          this.replicate(n, m.from);
        }
        break;
      }
      default: break;
    }
  }

  /* ----- driving it ----------------------------------------------------------- */

  tick() {
    this.time += 1;
    const due = [];
    const later = [];
    for (const m of this.queue) (m.deliverAt <= this.time ? due : later).push(m);
    this.queue = later;
    due.sort((a, b) => a.deliverAt - b.deliverAt || a.id - b.id);
    for (const m of due) this.deliver(m);

    for (const n of this.nodes) {
      if (!n.alive) continue;
      if (n.role === 'leader') {
        if (this.time >= n.heartbeatDue) this.broadcast(n);
      } else if (this.time >= n.deadline) {
        this.startElection(n);
      }
    }
    this.checkLogs();
  }

  run(ms) { for (let i = 0; i < ms; i += 1) this.tick(); }

  /* State machine safety: every server's applied commands are a prefix of
     the longest. */
  checkLogs() {
    let longest = [];
    for (const n of this.nodes) if (n.applied.length > longest.length) longest = n.applied;
    for (const n of this.nodes) {
      for (let i = 0; i < n.applied.length; i += 1) {
        if (n.applied[i] !== longest[i]) {
          this.violations.push(`${n.name} applied commands in a different order at ${i + 1}`);
          return;
        }
      }
    }
  }

  leader() {
    const leaders = this.nodes.filter((n) => n.alive && n.role === 'leader');
    return leaders.sort((a, b) => b.term - a.term)[0] || null;
  }

  /* A client sends a command. Only a leader accepts it. */
  request(cmd) {
    const l = this.leader();
    if (!l) {
      this.log('Request refused: there is no leader right now');
      return null;
    }
    this.requests += 1;
    const command = cmd ?? `x=${this.requests}`;
    l.log.push({ term: l.term, cmd: command });
    l.matchIndex[l.id] = l.log.length;
    this.log(`Client sends “${command}” to leader ${l.name} (entry ${l.log.length})`);
    this.broadcast(l);
    return l.id;
  }

  crash(id) {
    const n = this.nodes[id];
    if (!n.alive) return;
    n.alive = false;
    this.log(`${n.name} crashes`);
  }

  /* On restart, term, vote and log survive (they are on disk); everything
     else is rebuilt, including the applied state, from the log. */
  restart(id) {
    const n = this.nodes[id];
    if (n.alive) return;
    Object.assign(n, { alive: true, role: 'follower', votes: new Set(), leaderId: null, commitIndex: 0, lastApplied: 0, applied: [] });
    this.resetTimer(n);
    this.log(`${n.name} restarts with ${n.log.length} entries on disk`);
  }

  partition(ids) {
    const a = new Set(ids);
    const b = new Set(this.nodes.map((n) => n.id).filter((id) => !a.has(id)));
    this.groups = [a, b];
    this.log(`Network split: {${[...a].map((i) => `S${i + 1}`).join(', ')}} | {${[...b].map((i) => `S${i + 1}`).join(', ')}}`);
  }

  heal() {
    if (!this.groups) return;
    this.groups = null;
    this.log('Network healed');
  }
}
