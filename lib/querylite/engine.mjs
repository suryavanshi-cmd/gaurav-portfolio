/*
  QueryLite: the storage engine, query planner and executor.

    Storage     each table keeps rows by id, plus one B+ tree per index.
                A PRIMARY KEY gets a unique index automatically.
    Planner     for every table in a query, picks an access path: an index
                lookup when a WHERE condition compares an indexed column with
                a constant (=, IN, <, <=, >, >=, BETWEEN), otherwise a full
                scan. Conditions that touch one table are pushed down to that
                table's scan. Each join is an index nested loop when the
                joined column is indexed, a hash join for other equality
                joins, and a plain nested loop otherwise.
    Executor    runs the plan and counts rows at every step, so every query
                comes back with its plan and the real numbers — like
                EXPLAIN ANALYZE.
    Transactions  BEGIN starts an undo log; ROLLBACK replays it backwards;
                COMMIT drops it. Indexes are kept in step either way.
*/

import { BPlusTree, compareKeys } from './btree.mjs';
import { SqlError, isAggregate, parse, show } from './sql.mjs';

const lower = (s) => s.toLowerCase();
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

class Table {
  constructor(name, columns) {
    this.name = name;
    this.columns = columns;
    this.colIndex = new Map(columns.map((c, i) => [lower(c.name), i]));
    this.rows = new Map();
    this.nextId = 1;
    this.indexes = new Map(); // column (lower) → { name, column, unique, tree }
  }

  col(name) {
    const i = this.colIndex.get(lower(name));
    if (i === undefined) throw new SqlError(`Table ${this.name} has no column “${name}”`);
    return i;
  }

  addIndex(name, column, unique) {
    const c = this.col(column);
    const tree = new BPlusTree(32);
    for (const [id, row] of this.rows) if (row[c] !== null) tree.insert(row[c], id);
    this.indexes.set(lower(this.columns[c].name), { name, column: this.columns[c].name, col: c, unique, tree });
  }
}

/* ----- Expression evaluation ------------------------------------------------ */

function truthy(v) { return v !== null && v !== false && v !== 0 && v !== undefined; }

function compare(a, b) {
  if (a === null || b === null) return null;
  return compareKeys(a, b);
}

const likeCache = new Map();
function likeRegex(pattern) {
  if (!likeCache.has(pattern)) {
    const re = `^${String(pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.')}$`;
    likeCache.set(pattern, new RegExp(re, 'is'));
  }
  return likeCache.get(pattern);
}

function evaluate(e, t, ctx) {
  switch (e.type) {
    case 'lit': return e.value;
    case 'col': {
      if (e._out !== undefined) return ctx.out[e._out];
      const row = t[e._s];
      return row ? row[e._c] : null;
    }
    case 'fn': {
      if (isAggregate(e.name)) {
        if (!ctx?.aggs) throw new SqlError(`${e.name}() needs GROUP BY, or can only be used in SELECT, HAVING or ORDER BY`);
        return ctx.aggs.get(e);
      }
      if (!e.args.length) throw new SqlError(`${e.name}() needs a value`);
      const v = evaluate(e.args[0], t, ctx);
      if (v === null || v === undefined) return null;
      switch (e.name) {
        case 'UPPER': return String(v).toUpperCase();
        case 'LOWER': return String(v).toLowerCase();
        case 'LENGTH': return String(v).length;
        case 'ABS': return typeof v === 'number' ? Math.abs(v) : null;
        case 'ROUND': {
          const digits = e.args[1] ? evaluate(e.args[1], t, ctx) : 0;
          const f = 10 ** digits;
          return typeof v === 'number' ? Math.round(v * f) / f : null;
        }
        default: return null;
      }
    }
    case 'neg': {
      const v = evaluate(e.expr, t, ctx);
      return typeof v === 'number' ? -v : null;
    }
    case 'not': {
      const v = evaluate(e.expr, t, ctx);
      return v === null ? null : !truthy(v);
    }
    case 'isnull': {
      const v = evaluate(e.expr, t, ctx);
      return e.negate ? v !== null : v === null;
    }
    case 'like': {
      const v = evaluate(e.expr, t, ctx);
      const p = evaluate(e.pattern, t, ctx);
      if (v === null || p === null) return null;
      const r = likeRegex(p).test(String(v));
      return e.negate ? !r : r;
    }
    case 'in': {
      const v = evaluate(e.expr, t, ctx);
      if (v === null) return null;
      const r = e.list.some((x) => compare(v, evaluate(x, t, ctx)) === 0);
      return e.negate ? !r : r;
    }
    case 'between': {
      const v = evaluate(e.expr, t, ctx);
      const lo = evaluate(e.lo, t, ctx);
      const hi = evaluate(e.hi, t, ctx);
      if (v === null || lo === null || hi === null) return null;
      const r = compare(v, lo) >= 0 && compare(v, hi) <= 0;
      return e.negate ? !r : r;
    }
    case 'bin': {
      if (e.op === 'AND') {
        const l = evaluate(e.left, t, ctx);
        if (l !== null && !truthy(l)) return false;
        const r = evaluate(e.right, t, ctx);
        if (r !== null && !truthy(r)) return false;
        return l === null || r === null ? null : true;
      }
      if (e.op === 'OR') {
        const l = evaluate(e.left, t, ctx);
        if (truthy(l)) return true;
        const r = evaluate(e.right, t, ctx);
        if (truthy(r)) return true;
        return l === null || r === null ? null : false;
      }
      const l = evaluate(e.left, t, ctx);
      const r = evaluate(e.right, t, ctx);
      if (l === null || r === null) return null;
      switch (e.op) {
        case '=': return compare(l, r) === 0;
        case '!=': return compare(l, r) !== 0;
        case '<': return compare(l, r) < 0;
        case '<=': return compare(l, r) <= 0;
        case '>': return compare(l, r) > 0;
        case '>=': return compare(l, r) >= 0;
        default: break;
      }
      if (typeof l !== 'number' || typeof r !== 'number') return null;
      switch (e.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return r === 0 ? null : l / r;
        case '%': return r === 0 ? null : l % r;
        default: return null;
      }
    }
    default: return null;
  }
}

/* Walks an expression tree. */
function visit(e, fn) {
  if (!e || typeof e !== 'object') return;
  fn(e);
  for (const k of ['left', 'right', 'expr', 'pattern', 'lo', 'hi']) if (e[k]) visit(e[k], fn);
  for (const k of ['args', 'list']) if (e[k]) e[k].forEach((x) => visit(x, fn));
}

/* Resolves every column reference to (source, column) once, before running. */
function bind(e, sources, outNames) {
  visit(e, (n) => {
    if (n.type !== 'col') return;
    if (n.table) {
      const s = sources.findIndex((src) => src.alias === lower(n.table));
      if (s < 0) throw new SqlError(`Unknown table or alias “${n.table}”`);
      n._s = s;
      n._c = sources[s].table.col(n.name);
      return;
    }
    const hits = [];
    sources.forEach((src, s) => {
      const c = src.table.colIndex.get(lower(n.name));
      if (c !== undefined) hits.push([s, c]);
    });
    if (hits.length > 1) throw new SqlError(`Column “${n.name}” is in more than one table — write it as table.${n.name}`);
    if (hits.length === 1) { [n._s, n._c] = hits[0]; return; }
    const out = outNames ? outNames.findIndex((x) => lower(x) === lower(n.name)) : -1;
    if (out >= 0) { n._out = out; return; }
    throw new SqlError(`No column named “${n.name}”`);
  });
  return e;
}

function sourcesOf(e) {
  const set = new Set();
  visit(e, (n) => { if (n.type === 'col' && n._s !== undefined) set.add(n._s); });
  return set;
}

function conjuncts(e) {
  if (!e) return [];
  if (e.type === 'bin' && e.op === 'AND') return [...conjuncts(e.left), ...conjuncts(e.right)];
  return [e];
}

const isConst = (e) => e.type === 'lit' || (e.type === 'neg' && e.expr.type === 'lit');
const constValue = (e) => evaluate(e, [], null);
const FLIP = { '<': '>', '<=': '>=', '>': '<', '>=': '<=', '=': '=' };

/* Can this condition be answered by an index on source s? Returns the
   lookup, or null. Equality and IN beat ranges. */
function indexable(c, s, table) {
  const onCol = (e) => e.type === 'col' && e._s === s && e._out === undefined && table.indexes.get(lower(table.columns[e._c].name));
  if (c.type === 'bin' && FLIP[c.op]) {
    let col = c.left;
    let val = c.right;
    let op = c.op;
    if (!onCol(col) || !isConst(val)) { col = c.right; val = c.left; op = FLIP[c.op]; }
    const idx = onCol(col);
    if (!idx || !isConst(val)) return null;
    const v = constValue(val);
    if (v === null) return null;
    if (op === '=') return { idx, kind: 'eq', keys: [v], rank: 0 };
    const r = { idx, kind: 'range', rank: 2 };
    if (op === '<') Object.assign(r, { hi: v, hiInc: false });
    if (op === '<=') Object.assign(r, { hi: v, hiInc: true });
    if (op === '>') Object.assign(r, { lo: v, loInc: false });
    if (op === '>=') Object.assign(r, { lo: v, loInc: true });
    return r;
  }
  if (c.type === 'in' && !c.negate) {
    const idx = onCol(c.expr);
    if (idx && c.list.every(isConst)) return { idx, kind: 'eq', keys: c.list.map(constValue).filter((v) => v !== null), rank: 1 };
  }
  if (c.type === 'between' && !c.negate) {
    const idx = onCol(c.expr);
    if (idx && isConst(c.lo) && isConst(c.hi)) return { idx, kind: 'range', lo: constValue(c.lo), hi: constValue(c.hi), loInc: true, hiInc: true, rank: 2 };
  }
  return null;
}

function describeLookup(l) {
  const col = l.idx.column;
  if (l.kind === 'eq') return l.keys.length === 1 ? `${col} = ${JSON.stringify(l.keys[0])}` : `${col} IN (${l.keys.map((k) => JSON.stringify(k)).join(', ')})`;
  const parts = [];
  if (l.lo !== undefined) parts.push(`${col} ${l.loInc ? '>=' : '>'} ${JSON.stringify(l.lo)}`);
  if (l.hi !== undefined) parts.push(`${col} ${l.hiInc ? '<=' : '<'} ${JSON.stringify(l.hi)}`);
  return parts.join(' AND ');
}

/* Reads one table, by index when it can, applying its pushed-down filters.
   Returns [ids, plan node]. */
function scan(source, s, conds, stats) {
  const { table } = source;
  let best = null;
  for (const c of conds) {
    const l = indexable(c, s, table);
    if (l && (!best || l.rank < best.l.rank)) best = { l, c };
  }
  let ids;
  let node;
  let skipped = null;
  if (best) {
    const { l } = best;
    let visited = 0;
    if (l.kind === 'eq') {
      ids = [];
      for (const k of l.keys) {
        const r = l.idx.tree.get(k);
        ids.push(...r.ids);
        visited += r.visited;
      }
    } else {
      const r = l.idx.tree.range(l.lo, l.hi, l.loInc, l.hiInc);
      ({ ids } = r);
      visited = r.visited;
    }
    stats.indexNodes += visited;
    /* Cost check: an index pays off when it narrows things down. When it
       matches most of the table, jumping row by row through it is slower
       than reading every row in order — so read them all, as real planners do. */
    if (table.rows.size > 200 && ids.length > table.rows.size * 0.3) {
      skipped = { l, share: ids.length / table.rows.size };
      best = null;
    } else {
      stats.scanned += ids.length;
      node = { label: 'Index Scan', detail: `${table.name} using ${l.idx.name} (${describeLookup(l)})`, read: ids.length, note: `${visited} index pages read` };
    }
  }
  if (!best) {
    ids = [...table.rows.keys()];
    stats.scanned += ids.length;
    node = {
      label: 'Seq Scan',
      detail: table.name,
      read: ids.length,
      note: skipped ? `${skipped.l.idx.name} skipped: it matches ${Math.round(skipped.share * 100)}% of rows, so reading them all is cheaper` : 'reads every row',
    };
  }
  const rest = conds.filter((c) => !best || c !== best.c);
  if (rest.length) {
    node.filter = rest.map(show).join(' AND ');
    ids = ids.filter((id) => {
      const t = [];
      t[s] = table.rows.get(id);
      return rest.every((c) => truthy(evaluate(c, t, null)));
    });
  }
  node.rows = ids.length;
  return [ids, node];
}

/* ----- The database ---------------------------------------------------------- */

export class Database {
  constructor() {
    this.tables = new Map();
    this.txn = null;
  }

  table(name) {
    const t = this.tables.get(lower(name));
    if (!t) throw new SqlError(`No table named “${name}”`);
    return t;
  }

  /* Runs one or more statements. Stops at the first error, which is returned
     as the last result — earlier statements keep their effect. */
  exec(sql) {
    const results = [];
    let statements;
    try {
      statements = parse(sql);
    } catch (err) {
      return [{ type: 'error', message: err.message, pos: err.pos }];
    }
    for (const stmt of statements) {
      const t0 = now();
      try {
        const r = this.run(stmt);
        r.ms = now() - t0;
        r.text = stmt.text;
        results.push(r);
      } catch (err) {
        if (!(err instanceof SqlError)) throw err;
        results.push({ type: 'error', message: err.message, text: stmt.text });
        break;
      }
    }
    return results;
  }

  run(stmt) {
    switch (stmt.type) {
      case 'select': return this.select(stmt);
      case 'explain': {
        const r = this.select(stmt.select);
        return { type: 'plan', plan: r.plan, stats: r.stats, message: `Plan for a query returning ${r.rows.length} rows` };
      }
      case 'insert': return this.insert(stmt);
      case 'update': return this.update(stmt);
      case 'delete': return this.delete(stmt);
      case 'createTable': return this.createTable(stmt);
      case 'createIndex': return this.createIndex(stmt);
      case 'drop': {
        this.noDdlInTxn();
        this.table(stmt.table);
        this.tables.delete(lower(stmt.table));
        return { type: 'ok', message: `Dropped table ${stmt.table}` };
      }
      case 'begin':
        if (this.txn) throw new SqlError('Already in a transaction — COMMIT or ROLLBACK first');
        this.txn = { undo: [] };
        return { type: 'ok', message: 'Transaction started. Changes can be undone with ROLLBACK.' };
      case 'commit':
        if (!this.txn) throw new SqlError('No transaction to commit');
        this.txn = null;
        return { type: 'ok', message: 'Committed.' };
      case 'rollback': {
        if (!this.txn) throw new SqlError('No transaction to roll back');
        const { undo } = this.txn;
        this.txn = null;
        for (let i = undo.length - 1; i >= 0; i -= 1) {
          const u = undo[i];
          const t = this.tables.get(u.table);
          if (u.op === 'insert') this.rawDelete(t, u.id);
          if (u.op === 'delete') this.rawInsert(t, u.id, u.row);
          if (u.op === 'update') this.rawUpdate(t, u.id, u.row);
        }
        return { type: 'ok', message: `Rolled back ${undo.length} ${undo.length === 1 ? 'change' : 'changes'}.` };
      }
      default: throw new SqlError('Unsupported statement');
    }
  }

  noDdlInTxn() {
    if (this.txn) throw new SqlError('CREATE and DROP are not allowed inside a transaction here');
  }

  createTable({ table, columns }) {
    this.noDdlInTxn();
    if (this.tables.has(lower(table))) throw new SqlError(`Table ${table} already exists`);
    const seen = new Set();
    for (const c of columns) {
      if (seen.has(lower(c.name))) throw new SqlError(`Column ${c.name} appears twice`);
      seen.add(lower(c.name));
    }
    const t = new Table(table, columns);
    const pk = columns.find((c) => c.primary);
    if (pk) t.addIndex(`pk_${table}`, pk.name, true);
    this.tables.set(lower(table), t);
    return { type: 'ok', message: `Created table ${table}${pk ? ` (primary key ${pk.name} is indexed)` : ''}` };
  }

  createIndex({ name, table, column, ifNotExists }) {
    this.noDdlInTxn();
    const t = this.table(table);
    if (t.indexes.has(lower(column))) {
      if (ifNotExists) return { type: 'ok', message: `${t.name}.${column} already has an index — skipped` };
      throw new SqlError(`${t.name}.${column} already has an index`);
    }
    const t0 = now();
    t.addIndex(name, column, false);
    const { tree } = t.indexes.get(lower(t.columns[t.col(column)].name));
    const s = tree.stats();
    return { type: 'ok', message: `Built index ${name} on ${t.name}(${column}): ${s.entries.toLocaleString('en-US')} entries, ${s.nodes} pages, height ${s.height} — in ${(now() - t0).toFixed(1)} ms` };
  }

  check(table, row) {
    return table.columns.map((c, i) => {
      let v = row[i];
      if (v === undefined) v = null;
      if (v === null) {
        if (c.notNull) throw new SqlError(`${table.name}.${c.name} cannot be NULL`);
        return null;
      }
      if (c.type === 'TEXT') return typeof v === 'string' ? v : String(v);
      if (typeof v !== 'number') throw new SqlError(`${table.name}.${c.name} is ${c.type} — got text “${v}”`);
      if (c.type === 'INT' && !Number.isInteger(v)) throw new SqlError(`${table.name}.${c.name} is INT — got ${v}`);
      return v;
    });
  }

  unique(table, row, exceptId) {
    for (const idx of table.indexes.values()) {
      if (!idx.unique || row[idx.col] === null) continue;
      const { ids } = idx.tree.get(row[idx.col]);
      if (ids.some((id) => id !== exceptId)) throw new SqlError(`Duplicate ${idx.column} ${JSON.stringify(row[idx.col])} in ${table.name}`);
    }
  }

  rawInsert(t, id, row) {
    t.rows.set(id, row);
    for (const idx of t.indexes.values()) if (row[idx.col] !== null) idx.tree.insert(row[idx.col], id);
  }

  rawDelete(t, id) {
    const row = t.rows.get(id);
    for (const idx of t.indexes.values()) if (row[idx.col] !== null) idx.tree.delete(row[idx.col], id);
    t.rows.delete(id);
  }

  rawUpdate(t, id, row) {
    const old = t.rows.get(id);
    for (const idx of t.indexes.values()) {
      if (compare(old[idx.col], row[idx.col]) === 0) continue;
      if (old[idx.col] !== null) idx.tree.delete(old[idx.col], id);
      if (row[idx.col] !== null) idx.tree.insert(row[idx.col], id);
    }
    t.rows.set(id, row);
  }

  insert({ table, columns, rows }) {
    const t = this.table(table);
    const order = columns ? columns.map((c) => t.col(c)) : t.columns.map((_, i) => i);
    let n = 0;
    for (const values of rows) {
      if (values.length !== order.length) throw new SqlError(`Expected ${order.length} values, got ${values.length}`);
      const row = new Array(t.columns.length).fill(null);
      values.forEach((e, i) => { row[order[i]] = evaluate(e, [], null); });
      const clean = this.check(t, row);
      this.unique(t, clean);
      const id = t.nextId;
      t.nextId += 1;
      this.rawInsert(t, id, clean);
      if (this.txn) this.txn.undo.push({ op: 'insert', table: lower(t.name), id });
      n += 1;
    }
    return { type: 'ok', message: `Inserted ${n} ${n === 1 ? 'row' : 'rows'} into ${t.name}` };
  }

  matching(t, where, stats) {
    const sources = [{ alias: lower(t.name), table: t }];
    const conds = conjuncts(where).map((c) => bind(c, sources));
    return scan(sources[0], 0, conds, stats);
  }

  update({ table, sets, where }) {
    const t = this.table(table);
    const stats = { scanned: 0, indexNodes: 0 };
    const [ids, node] = this.matching(t, where, stats);
    const sources = [{ alias: lower(t.name), table: t }];
    const plan = sets.map((s) => ({ c: t.col(s.column), e: bind(s.expr, sources) }));
    for (const id of ids) {
      const old = t.rows.get(id);
      const row = old.slice();
      for (const { c, e } of plan) row[c] = evaluate(e, [old], null);
      const clean = this.check(t, row);
      this.unique(t, clean, id);
      this.rawUpdate(t, id, clean);
      if (this.txn) this.txn.undo.push({ op: 'update', table: lower(t.name), id, row: old });
    }
    return { type: 'ok', message: `Updated ${ids.length} ${ids.length === 1 ? 'row' : 'rows'} in ${t.name}`, plan: node, stats };
  }

  delete({ table, where }) {
    const t = this.table(table);
    const stats = { scanned: 0, indexNodes: 0 };
    const [ids, node] = this.matching(t, where, stats);
    for (const id of ids) {
      const row = t.rows.get(id);
      this.rawDelete(t, id);
      if (this.txn) this.txn.undo.push({ op: 'delete', table: lower(t.name), id, row });
    }
    return { type: 'ok', message: `Deleted ${ids.length} ${ids.length === 1 ? 'row' : 'rows'} from ${t.name}`, plan: node, stats };
  }

  select(q) {
    const stats = { scanned: 0, indexNodes: 0 };
    const sources = [{ alias: lower(q.from.alias), table: this.table(q.from.table) }];
    for (const j of q.joins) {
      if (sources.some((s) => s.alias === lower(j.alias))) throw new SqlError(`Alias “${j.alias}” is used twice`);
      sources.push({ alias: lower(j.alias), table: this.table(j.table), join: j });
    }
    const leftJoined = new Set(sources.map((s, i) => (s.join?.kind === 'left' ? i : -1)).filter((i) => i >= 0));

    /* WHERE conditions that touch exactly one table (and not the null side of
       a LEFT JOIN) are pushed down to that table's scan. */
    const conds = conjuncts(q.where).map((c) => bind(c, sources));
    const pushed = sources.map(() => []);
    const residual = [];
    for (const c of conds) {
      const used = sourcesOf(c);
      const [only] = used;
      if (used.size === 1 && !leftJoined.has(only)) pushed[only].push(c);
      else if (used.size === 0) pushed[0].push(c);
      else residual.push(c);
    }

    const [ids0, scan0] = scan(sources[0], 0, pushed[0], stats);
    let tuples = ids0.map((id) => [sources[0].table.rows.get(id)]);
    let plan = scan0;

    for (let s = 1; s < sources.length; s += 1) {
      const src = sources[s];
      const on = bind(src.join.on, sources.slice(0, s + 1).concat());
      const onParts = conjuncts(on);
      const local = pushed[s];
      const passLocal = (row) => {
        if (!local.length) return true;
        const t = [];
        t[s] = row;
        return local.every((c) => truthy(evaluate(c, t, null)));
      };

      /* An equality between a column of this table and an expression over
         the earlier tables drives the join. */
      let key = null;
      for (const p of onParts) {
        if (p.type !== 'bin' || p.op !== '=') continue;
        for (const [mine, other] of [[p.left, p.right], [p.right, p.left]]) {
          const otherSrc = sourcesOf(other);
          if (mine.type === 'col' && mine._s === s && !otherSrc.has(s) && otherSrc.size) key = { mine, other, part: p };
        }
        if (key) break;
      }
      const rest = key ? onParts.filter((p) => p !== key.part) : onParts;
      const idx = key && src.table.indexes.get(lower(src.table.columns[key.mine._c].name));

      const out = [];
      let node;
      if (key && idx) {
        let probes = 0;
        for (const t of tuples) {
          const v = evaluate(key.other, t, null);
          let matched = false;
          if (v !== null) {
            const r = idx.tree.get(v);
            probes += 1;
            stats.indexNodes += r.visited;
            stats.scanned += r.ids.length;
            for (const id of r.ids) {
              const row = src.table.rows.get(id);
              if (!passLocal(row)) continue;
              const nt = t.concat([row]);
              if (rest.every((c) => truthy(evaluate(c, nt, null)))) { out.push(nt); matched = true; }
            }
          }
          if (!matched && src.join.kind === 'left') out.push(t.concat([null]));
        }
        node = { label: `${src.join.kind === 'left' ? 'Left ' : ''}Index Nested Loop`, detail: `${show(key.part)} — ${probes.toLocaleString('en-US')} lookups in ${idx.name}`, children: [plan, { label: 'Index Lookup', detail: `${src.table.name} using ${idx.name}`, rows: null }] };
      } else {
        const [rids, rscan] = scan(src, s, local, stats);
        const rows = rids.map((id) => src.table.rows.get(id));
        if (key) {
          const hash = new Map();
          for (const row of rows) {
            const k = row[key.mine._c];
            if (k === null) continue;
            const hk = typeof k === 'number' ? k : `s:${k}`;
            if (!hash.has(hk)) hash.set(hk, []);
            hash.get(hk).push(row);
          }
          for (const t of tuples) {
            const v = evaluate(key.other, t, null);
            const bucket = v === null ? undefined : hash.get(typeof v === 'number' ? v : `s:${v}`);
            let matched = false;
            if (bucket) {
              for (const row of bucket) {
                const nt = t.concat([row]);
                if (rest.every((c) => truthy(evaluate(c, nt, null)))) { out.push(nt); matched = true; }
              }
            }
            if (!matched && src.join.kind === 'left') out.push(t.concat([null]));
          }
          node = { label: `${src.join.kind === 'left' ? 'Left ' : ''}Hash Join`, detail: `${show(key.part)} — hash table of ${rows.length.toLocaleString('en-US')} ${src.table.name} rows`, children: [plan, rscan] };
        } else {
          for (const t of tuples) {
            let matched = false;
            for (const row of rows) {
              const nt = t.concat([row]);
              if (onParts.every((c) => truthy(evaluate(c, nt, null)))) { out.push(nt); matched = true; }
            }
            if (!matched && src.join.kind === 'left') out.push(t.concat([null]));
          }
          node = { label: `${src.join.kind === 'left' ? 'Left ' : ''}Nested Loop`, detail: `${show(on)} — ${(tuples.length * rows.length).toLocaleString('en-US')} pairs compared`, children: [plan, rscan] };
        }
      }
      node.rows = out.length;
      tuples = out;
      plan = node;
    }

    if (residual.length) {
      tuples = tuples.filter((t) => residual.every((c) => truthy(evaluate(c, t, null))));
      plan = { label: 'Filter', detail: residual.map(show).join(' AND '), rows: tuples.length, children: [plan] };
    }

    /* Output columns: stars expand to real columns. */
    const outCols = [];
    for (const c of q.columns) {
      if (c.star) {
        sources.forEach((src, s) => {
          if (c.table && src.alias !== lower(c.table)) return;
          src.table.columns.forEach((col, ci) => {
            const clash = sources.some((o, os) => os !== s && o.table.colIndex.has(lower(col.name)));
            outCols.push({ name: clash ? `${src.alias}.${col.name}` : col.name, expr: { type: 'col', table: null, name: col.name, _s: s, _c: ci } });
          });
        });
        if (c.table && !sources.some((src) => src.alias === lower(c.table))) throw new SqlError(`Unknown table or alias “${c.table}”`);
      } else {
        bind(c.expr, sources);
        outCols.push({ name: c.alias || (c.expr.type === 'col' ? c.expr.name : show(c.expr)), expr: c.expr });
      }
    }
    const outNames = outCols.map((c) => c.name);

    const aggNodes = [];
    const collect = (e) => visit(e, (n) => { if (n.type === 'fn' && isAggregate(n.name)) aggNodes.push(n); });
    outCols.forEach((c) => collect(c.expr));
    if (q.having) { bind(q.having, sources, outNames); collect(q.having); }
    q.orderBy.forEach((o) => {
      if (!(o.expr.type === 'lit' && typeof o.expr.value === 'number')) bind(o.expr, sources, outNames);
      collect(o.expr);
    });
    q.groupBy.forEach((g) => bind(g, sources, outNames));
    for (const a of aggNodes) a.args.forEach((x) => { bind(x, sources); visit(x, (n) => { if (n.type === 'fn' && isAggregate(n.name)) throw new SqlError('Aggregates cannot be nested'); }); });

    /* Each context is one output row before projection: a tuple, plus the
       aggregate values when grouping. */
    let contexts;
    if (q.groupBy.length || aggNodes.length) {
      const groups = new Map();
      for (const t of tuples) {
        const keyVals = q.groupBy.map((g) => (g._out !== undefined ? evaluate(outCols[g._out].expr, t, null) : evaluate(g, t, null)));
        const k = JSON.stringify(keyVals);
        if (!groups.has(k)) groups.set(k, { t, acc: aggNodes.map(() => ({ n: 0, sum: 0, min: null, max: null, seen: new Set() })) });
        const g = groups.get(k);
        aggNodes.forEach((a, i) => {
          const acc = g.acc[i];
          if (a.star) { acc.n += 1; return; }
          const v = evaluate(a.args[0], t, null);
          if (v === null) return;
          if (a.distinct) {
            const dk = typeof v === 'number' ? v : `s:${v}`;
            if (acc.seen.has(dk)) return;
            acc.seen.add(dk);
          }
          acc.n += 1;
          if (typeof v === 'number') acc.sum += v;
          if (acc.min === null || compare(v, acc.min) < 0) acc.min = v;
          if (acc.max === null || compare(v, acc.max) > 0) acc.max = v;
        });
      }
      if (!groups.size && !q.groupBy.length) groups.set('[]', { t: [], acc: aggNodes.map(() => ({ n: 0, sum: 0, min: null, max: null, seen: new Set() })) });
      contexts = [...groups.values()].map((g) => {
        const aggs = new Map();
        aggNodes.forEach((a, i) => {
          const acc = g.acc[i];
          const v = { COUNT: acc.n, SUM: acc.n ? acc.sum : null, AVG: acc.n ? acc.sum / acc.n : null, MIN: acc.min, MAX: acc.max }[a.name];
          aggs.set(a, v);
        });
        return { t: g.t, aggs };
      });
      plan = { label: 'Hash Aggregate', detail: q.groupBy.length ? `group by ${q.groupBy.map(show).join(', ')}` : 'one group (whole result)', rows: contexts.length, children: [plan] };
    } else {
      contexts = tuples.map((t) => ({ t, aggs: null }));
    }

    let rows = contexts.map((ctx) => {
      ctx.out = [];
      outCols.forEach((c, i) => { ctx.out[i] = evaluate(c.expr, ctx.t, ctx); });
      return ctx;
    });

    if (q.having) {
      rows = rows.filter((ctx) => truthy(evaluate(q.having, ctx.t, ctx)));
      plan = { label: 'Filter', detail: `HAVING ${show(q.having)}`, rows: rows.length, children: [plan] };
    }

    if (q.orderBy.length) {
      const keyed = rows.map((ctx) => ({
        ctx,
        keys: q.orderBy.map((o) => (o.expr.type === 'lit' && typeof o.expr.value === 'number' ? ctx.out[o.expr.value - 1] : evaluate(o.expr, ctx.t, ctx))),
      }));
      keyed.sort((a, b) => {
        for (let i = 0; i < q.orderBy.length; i += 1) {
          const x = a.keys[i];
          const y = b.keys[i];
          if (x === y) continue;
          if (x === null || x === undefined) return 1;
          if (y === null || y === undefined) return -1;
          const c = compareKeys(x, y);
          if (c) return q.orderBy[i].desc ? -c : c;
        }
        return 0;
      });
      rows = keyed.map((k) => k.ctx);
      plan = { label: 'Sort', detail: q.orderBy.map((o) => `${show(o.expr)}${o.desc ? ' DESC' : ''}`).join(', '), rows: rows.length, children: [plan] };
    }

    let values = rows.map((ctx) => ctx.out);
    if (q.distinct) {
      const seen = new Set();
      values = values.filter((v) => {
        const k = JSON.stringify(v);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      plan = { label: 'Distinct', detail: '', rows: values.length, children: [plan] };
    }
    if (q.limit !== null || q.offset) {
      values = values.slice(q.offset, q.limit === null ? undefined : q.offset + q.limit);
      plan = { label: 'Limit', detail: `${q.limit ?? 'all'}${q.offset ? ` offset ${q.offset}` : ''}`, rows: values.length, children: [plan] };
    }

    return { type: 'rows', columns: outNames, rows: values, plan, stats };
  }

  /* ----- Persistence ------------------------------------------------------- */

  serialize() {
    return JSON.stringify({
      v: 1,
      tables: [...this.tables.values()].map((t) => ({
        name: t.name,
        columns: t.columns,
        nextId: t.nextId,
        rows: [...t.rows.entries()],
        indexes: [...t.indexes.values()].filter((i) => !i.unique || !i.name.startsWith('pk_')).map((i) => ({ name: i.name, column: i.column })),
      })),
    });
  }

  static load(json) {
    const data = JSON.parse(json);
    const db = new Database();
    for (const spec of data.tables) {
      const t = new Table(spec.name, spec.columns);
      t.nextId = spec.nextId;
      for (const [id, row] of spec.rows) t.rows.set(id, row);
      const pk = spec.columns.find((c) => c.primary);
      if (pk) t.addIndex(`pk_${spec.name}`, pk.name, true);
      for (const i of spec.indexes) t.addIndex(i.name, i.column, false);
      db.tables.set(lower(spec.name), t);
    }
    return db;
  }

  schema() {
    return [...this.tables.values()].map((t) => ({
      name: t.name,
      rows: t.rows.size,
      columns: t.columns.map((c) => ({ ...c, indexed: t.indexes.has(lower(c.name)) })),
      indexes: [...t.indexes.values()].map((i) => ({ name: i.name, column: i.column, unique: i.unique, ...i.tree.stats() })),
    }));
  }
}
