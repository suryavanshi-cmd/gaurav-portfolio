/*
  A text CRDT (RGA — Replicated Growable Array).

  Every character gets a unique id: [counter, site], where counter is a
  Lamport clock. An insert names the character it goes after (its origin);
  a delete only marks a character as gone (a tombstone), so later inserts
  can still find their origin.

  Why replicas always agree: to place a new character after its origin, skip
  every following character with a *larger* id — those were inserted later,
  either concurrently with higher priority or after them — and insert there.
  That rule gives the same order no matter what order operations arrive in.
  Operations are also idempotent (a duplicate is ignored), and ones that
  arrive before what they depend on wait in a buffer. So replicas can go
  offline, edit freely, reconnect, and converge — no server, no locks.
*/

export const compareIds = (a, b) => (a[0] !== b[0] ? a[0] - b[0] : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);
const key = (id) => `${id[0]}@${id[1]}`;

export class TextCRDT {
  constructor(site) {
    this.site = site;
    this.clock = 0;
    this.elems = [];        // document order, tombstones included
    this.byId = new Map();  // key → element
    this.pending = [];      // operations waiting for what they depend on
    this.log = [];          // every operation integrated, for syncing newcomers
  }

  text() {
    let s = '';
    for (const e of this.elems) if (!e.deleted) s += e.ch;
    return s;
  }

  /* The element at a visible position, skipping tombstones. */
  visibleAt(pos) {
    let seen = -1;
    for (const e of this.elems) {
      if (e.deleted) continue;
      seen += 1;
      if (seen === pos) return e;
    }
    return null;
  }

  indexOfKey(k) {
    for (let i = 0; i < this.elems.length; i += 1) if (this.elems[i].key === k) return i;
    return -1;
  }

  /* ----- local edits: return the operations to send to other replicas ------- */

  insert(pos, str) {
    const ops = [];
    let left = pos > 0 ? this.visibleAt(pos - 1)?.id ?? null : null;
    for (const ch of str) {
      this.clock += 1;
      const op = { type: 'ins', id: [this.clock, this.site], left, ch };
      this.apply(op);
      ops.push(op);
      left = op.id;
    }
    return ops;
  }

  delete(pos, count = 1) {
    const targets = [];
    for (let i = 0; i < count; i += 1) {
      const e = this.visibleAt(pos + i);
      if (e) targets.push(e.id);
    }
    const ops = targets.map((id) => ({ type: 'del', id }));
    ops.forEach((op) => this.apply(op));
    return ops;
  }

  /* Turns "the textarea now says X" into the smallest delete + insert.
     Compared by characters (code points), not UTF-16 units, so an emoji is
     never split in half. */
  edit(nextText) {
    const prev = [...this.text()];
    const next = [...nextText];
    let start = 0;
    while (start < prev.length && start < next.length && prev[start] === next[start]) start += 1;
    let endPrev = prev.length;
    let endNext = next.length;
    while (endPrev > start && endNext > start && prev[endPrev - 1] === next[endNext - 1]) { endPrev -= 1; endNext -= 1; }
    if (start === endPrev && start === endNext) return [];
    return [...this.delete(start, endPrev - start), ...this.insert(start, next.slice(start, endNext).join(''))];
  }

  /* ----- remote operations ----------------------------------------------------- */

  /* Integrates an operation if its dependency is present, else buffers it.
     Returns true if anything changed. */
  apply(op) {
    if (!this.ready(op)) {
      if (!this.pending.some((p) => p.type === op.type && key(p.id) === key(op.id))) this.pending.push(op);
      return false;
    }
    const changed = this.integrate(op);
    if (changed) this.drain();
    return changed;
  }

  applyAll(ops) {
    let changed = false;
    for (const op of ops) changed = this.apply(op) || changed;
    return changed;
  }

  ready(op) {
    if (op.type === 'ins') return op.left === null || this.byId.has(key(op.left));
    return this.byId.has(key(op.id));
  }

  integrate(op) {
    if (op.type === 'del') {
      const e = this.byId.get(key(op.id));
      if (e.deleted) return false;
      e.deleted = true;
      this.log.push(op);
      return true;
    }
    const k = key(op.id);
    if (this.byId.has(k)) return false;
    let i = op.left === null ? 0 : this.indexOfKey(key(op.left)) + 1;
    while (i < this.elems.length && compareIds(this.elems[i].id, op.id) > 0) i += 1;
    const e = { id: op.id, key: k, ch: op.ch, deleted: false, left: op.left };
    this.elems.splice(i, 0, e);
    this.byId.set(k, e);
    if (op.id[0] > this.clock) this.clock = op.id[0];
    this.log.push(op);
    return true;
  }

  drain() {
    let progress = true;
    while (progress && this.pending.length) {
      progress = false;
      for (let i = 0; i < this.pending.length; i += 1) {
        const op = this.pending[i];
        if (this.ready(op)) {
          this.pending.splice(i, 1);
          this.integrate(op);
          progress = true;
          break;
        }
      }
    }
  }

  /* ----- caret mapping, so remote edits don't move your cursor --------------- */

  /* The id of the character just before a visible position (null = start). */
  anchor(pos) { return pos > 0 ? this.visibleAt(pos - 1)?.id ?? null : null; }

  /* Where that anchor is now, as a visible position. A deleted anchor maps to
     just after the nearest visible character before it. */
  resolve(anchor) {
    if (anchor === null) return 0;
    const at = this.indexOfKey(key(anchor));
    if (at < 0) return 0;
    let pos = 0;
    for (let i = 0; i <= at; i += 1) if (!this.elems[i].deleted) pos += 1;
    return pos;
  }

  stats() {
    const tomb = this.elems.filter((e) => e.deleted).length;
    return { chars: this.elems.length - tomb, tombstones: tomb, pending: this.pending.length, ops: this.log.length, clock: this.clock };
  }
}
