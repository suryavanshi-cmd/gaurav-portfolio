/*
  SQL text → syntax tree, with a hand-written lexer and a recursive-descent
  parser. Errors carry the position they happened at, so the console can say
  "expected FROM near 'FORM'" instead of "syntax error".

  Supported:
    CREATE TABLE t (col INT|REAL|TEXT [PRIMARY KEY] [NOT NULL], ...)
    CREATE INDEX [IF NOT EXISTS] name ON t (col)          DROP TABLE t
    INSERT INTO t [(cols)] VALUES (...), (...)
    SELECT [DISTINCT] ... FROM t [alias] [[LEFT] JOIN t2 [alias] ON ...]
      [WHERE ...] [GROUP BY ...] [HAVING ...] [ORDER BY ... [ASC|DESC]]
      [LIMIT n [OFFSET m]]
    UPDATE t SET col = expr, ... [WHERE ...]    DELETE FROM t [WHERE ...]
    EXPLAIN <select>     BEGIN     COMMIT     ROLLBACK
  Expressions: + - * /, = != <> < <= > >=, AND OR NOT, LIKE, IN (...),
  BETWEEN, IS [NOT] NULL, COUNT SUM AVG MIN MAX, UPPER LOWER LENGTH ROUND ABS.
*/

const KEYWORDS = new Set(`SELECT DISTINCT FROM WHERE GROUP BY HAVING ORDER ASC DESC LIMIT OFFSET JOIN LEFT INNER ON AS
AND OR NOT IN IS NULL LIKE BETWEEN INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE INDEX DROP PRIMARY KEY
INT INTEGER REAL TEXT EXPLAIN BEGIN COMMIT ROLLBACK TRUE FALSE IF EXISTS`.split(/\s+/));

export class SqlError extends Error {
  constructor(message, pos) {
    super(message);
    this.pos = pos;
  }
}

export function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i += 1; continue; }
    if (c === '-' && src[i + 1] === '-') { while (i < src.length && src[i] !== '\n') i += 1; continue; }
    const start = i;
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1]))) {
      while (i < src.length && /[0-9.]/.test(src[i])) i += 1;
      out.push({ t: 'num', v: Number(src.slice(start, i)), pos: start });
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      while (i < src.length && /[A-Za-z0-9_]/.test(src[i])) i += 1;
      const word = src.slice(start, i);
      const upper = word.toUpperCase();
      out.push(KEYWORDS.has(upper) ? { t: 'kw', v: upper, pos: start } : { t: 'id', v: word, pos: start });
      continue;
    }
    if (c === '"') {
      i += 1;
      while (i < src.length && src[i] !== '"') i += 1;
      if (i >= src.length) throw new SqlError('Unclosed quoted name', start);
      out.push({ t: 'id', v: src.slice(start + 1, i), pos: start });
      i += 1;
      continue;
    }
    if (c === "'") {
      let s = '';
      i += 1;
      for (;;) {
        if (i >= src.length) throw new SqlError('Unclosed text — add a closing quote', start);
        if (src[i] === "'" && src[i + 1] === "'") { s += "'"; i += 2; continue; }
        if (src[i] === "'") { i += 1; break; }
        s += src[i];
        i += 1;
      }
      out.push({ t: 'str', v: s, pos: start });
      continue;
    }
    const two = src.slice(i, i + 2);
    if (['<=', '>=', '!=', '<>'].includes(two)) { out.push({ t: 'op', v: two === '<>' ? '!=' : two, pos: start }); i += 2; continue; }
    if ('=<>+-*/(),;.%'.includes(c)) { out.push({ t: 'op', v: c, pos: start }); i += 1; continue; }
    throw new SqlError(`Unexpected character “${c}”`, start);
  }
  out.push({ t: 'end', v: '', pos: src.length });
  return out;
}

const AGGREGATES = new Set(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']);
const SCALARS = new Set(['UPPER', 'LOWER', 'LENGTH', 'ROUND', 'ABS']);
export const isAggregate = (name) => AGGREGATES.has(name);

class Parser {
  constructor(src) {
    this.src = src;
    this.toks = tokenize(src);
    this.i = 0;
  }

  get peek() { return this.toks[this.i]; }

  near(tok = this.peek) {
    return tok.t === 'end' ? 'at the end' : `near “${this.src.slice(tok.pos, tok.pos + 12).split(/\s/)[0]}”`;
  }

  fail(what) { throw new SqlError(`Expected ${what} ${this.near()}`, this.peek.pos); }

  isKw(...words) { return this.peek.t === 'kw' && words.includes(this.peek.v); }
  isOp(...ops) { return this.peek.t === 'op' && ops.includes(this.peek.v); }

  kw(word) {
    if (!this.isKw(word)) this.fail(word);
    return this.toks[this.i++];
  }

  op(o) {
    if (!this.isOp(o)) this.fail(`“${o}”`);
    return this.toks[this.i++];
  }

  acceptKw(word) { if (this.isKw(word)) { this.i += 1; return true; } return false; }
  acceptOp(o) { if (this.isOp(o)) { this.i += 1; return true; } return false; }

  ident(what = 'a name') {
    const t = this.peek;
    if (t.t !== 'id') this.fail(what);
    this.i += 1;
    return t.v;
  }

  statements() {
    const list = [];
    while (this.peek.t !== 'end') {
      if (this.acceptOp(';')) continue;
      const start = this.peek.pos;
      const stmt = this.statement();
      stmt.text = this.src.slice(start, this.peek.pos).trim();
      list.push(stmt);
      if (this.peek.t !== 'end' && !this.isOp(';')) this.fail('“;” between statements');
    }
    return list;
  }

  statement() {
    if (this.isKw('SELECT')) return this.select();
    if (this.acceptKw('EXPLAIN')) {
      if (!this.isKw('SELECT')) this.fail('SELECT after EXPLAIN');
      return { type: 'explain', select: this.select() };
    }
    if (this.acceptKw('INSERT')) return this.insert();
    if (this.acceptKw('UPDATE')) return this.update();
    if (this.acceptKw('DELETE')) return this.del();
    if (this.acceptKw('CREATE')) return this.create();
    if (this.acceptKw('DROP')) { this.kw('TABLE'); return { type: 'drop', table: this.ident('a table name') }; }
    if (this.acceptKw('BEGIN')) return { type: 'begin' };
    if (this.acceptKw('COMMIT')) return { type: 'commit' };
    if (this.acceptKw('ROLLBACK')) return { type: 'rollback' };
    return this.fail('SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, EXPLAIN, BEGIN, COMMIT or ROLLBACK');
  }

  create() {
    if (this.acceptKw('INDEX')) {
      let ifNotExists = false;
      if (this.acceptKw('IF')) { this.kw('NOT'); this.kw('EXISTS'); ifNotExists = true; }
      const name = this.ident('an index name');
      this.kw('ON');
      const table = this.ident('a table name');
      this.op('(');
      const column = this.ident('a column name');
      this.op(')');
      return { type: 'createIndex', name, table, column, ifNotExists };
    }
    this.kw('TABLE');
    const table = this.ident('a table name');
    this.op('(');
    const columns = [];
    do {
      const name = this.ident('a column name');
      let type;
      if (this.acceptKw('INT') || this.acceptKw('INTEGER')) type = 'INT';
      else if (this.acceptKw('REAL')) type = 'REAL';
      else if (this.acceptKw('TEXT')) type = 'TEXT';
      else this.fail('a type: INT, REAL or TEXT');
      const col = { name, type, primary: false, notNull: false };
      for (;;) {
        if (this.acceptKw('PRIMARY')) { this.kw('KEY'); col.primary = true; col.notNull = true; continue; }
        if (this.acceptKw('NOT')) { this.kw('NULL'); col.notNull = true; continue; }
        break;
      }
      columns.push(col);
    } while (this.acceptOp(','));
    this.op(')');
    if (columns.filter((c) => c.primary).length > 1) throw new SqlError('Only one PRIMARY KEY column is supported', this.peek.pos);
    return { type: 'createTable', table, columns };
  }

  insert() {
    this.kw('INTO');
    const table = this.ident('a table name');
    let columns = null;
    if (this.acceptOp('(')) {
      columns = [];
      do columns.push(this.ident('a column name')); while (this.acceptOp(','));
      this.op(')');
    }
    this.kw('VALUES');
    const rows = [];
    do {
      this.op('(');
      const row = [];
      do row.push(this.expr()); while (this.acceptOp(','));
      this.op(')');
      rows.push(row);
    } while (this.acceptOp(','));
    return { type: 'insert', table, columns, rows };
  }

  update() {
    const table = this.ident('a table name');
    this.kw('SET');
    const sets = [];
    do {
      const column = this.ident('a column name');
      this.op('=');
      sets.push({ column, expr: this.expr() });
    } while (this.acceptOp(','));
    const where = this.acceptKw('WHERE') ? this.expr() : null;
    return { type: 'update', table, sets, where };
  }

  del() {
    this.kw('FROM');
    const table = this.ident('a table name');
    const where = this.acceptKw('WHERE') ? this.expr() : null;
    return { type: 'delete', table, where };
  }

  tableRef() {
    const table = this.ident('a table name');
    let alias = table;
    if (this.acceptKw('AS')) alias = this.ident('an alias');
    else if (this.peek.t === 'id') alias = this.ident();
    return { table, alias };
  }

  select() {
    this.kw('SELECT');
    const distinct = this.acceptKw('DISTINCT');
    const columns = [];
    do {
      if (this.acceptOp('*')) { columns.push({ star: true }); continue; }
      if (this.peek.t === 'id' && this.toks[this.i + 1].v === '.' && this.toks[this.i + 2].v === '*') {
        const table = this.ident();
        this.i += 2;
        columns.push({ star: true, table });
        continue;
      }
      const expr = this.expr();
      let alias = null;
      if (this.acceptKw('AS')) alias = this.ident('an alias');
      else if (this.peek.t === 'id') alias = this.ident();
      columns.push({ expr, alias });
    } while (this.acceptOp(','));

    this.kw('FROM');
    const from = this.tableRef();
    const joins = [];
    for (;;) {
      let kind = null;
      if (this.isKw('JOIN')) kind = 'inner';
      else if (this.isKw('INNER') && this.toks[this.i + 1].v === 'JOIN') { this.i += 1; kind = 'inner'; }
      else if (this.isKw('LEFT') && this.toks[this.i + 1].v === 'JOIN') { this.i += 1; kind = 'left'; }
      if (!kind) break;
      this.kw('JOIN');
      const ref = this.tableRef();
      this.kw('ON');
      joins.push({ ...ref, kind, on: this.expr() });
    }

    const where = this.acceptKw('WHERE') ? this.expr() : null;
    let groupBy = [];
    if (this.acceptKw('GROUP')) {
      this.kw('BY');
      do groupBy.push(this.expr()); while (this.acceptOp(','));
    }
    const having = this.acceptKw('HAVING') ? this.expr() : null;
    const orderBy = [];
    if (this.acceptKw('ORDER')) {
      this.kw('BY');
      do {
        const expr = this.expr();
        let desc = false;
        if (this.acceptKw('DESC')) desc = true; else this.acceptKw('ASC');
        orderBy.push({ expr, desc });
      } while (this.acceptOp(','));
    }
    let limit = null;
    let offset = 0;
    if (this.acceptKw('LIMIT')) {
      if (this.peek.t !== 'num') this.fail('a number after LIMIT');
      limit = this.toks[this.i++].v;
      if (this.acceptKw('OFFSET')) {
        if (this.peek.t !== 'num') this.fail('a number after OFFSET');
        offset = this.toks[this.i++].v;
      }
    }
    return { type: 'select', distinct, columns, from, joins, where, groupBy, having, orderBy, limit, offset };
  }

  /* Expressions, lowest precedence first. */
  expr() { return this.or(); }

  or() {
    let left = this.and();
    while (this.acceptKw('OR')) left = { type: 'bin', op: 'OR', left, right: this.and() };
    return left;
  }

  and() {
    let left = this.not();
    while (this.acceptKw('AND')) left = { type: 'bin', op: 'AND', left, right: this.not() };
    return left;
  }

  not() {
    if (this.acceptKw('NOT')) return { type: 'not', expr: this.not() };
    return this.comparison();
  }

  comparison() {
    const left = this.additive();
    if (this.isOp('=', '!=', '<', '<=', '>', '>=')) {
      const op = this.toks[this.i++].v;
      return { type: 'bin', op, left, right: this.additive() };
    }
    if (this.acceptKw('IS')) {
      const negate = this.acceptKw('NOT');
      this.kw('NULL');
      return { type: 'isnull', expr: left, negate };
    }
    const negate = this.isKw('NOT') && ['LIKE', 'IN', 'BETWEEN'].includes(this.toks[this.i + 1].v) ? (this.i += 1, true) : false;
    if (this.acceptKw('LIKE')) return { type: 'like', expr: left, pattern: this.additive(), negate };
    if (this.acceptKw('IN')) {
      this.op('(');
      const list = [];
      do list.push(this.expr()); while (this.acceptOp(','));
      this.op(')');
      return { type: 'in', expr: left, list, negate };
    }
    if (this.acceptKw('BETWEEN')) {
      const lo = this.additive();
      this.kw('AND');
      return { type: 'between', expr: left, lo, hi: this.additive(), negate };
    }
    return left;
  }

  additive() {
    let left = this.multiplicative();
    while (this.isOp('+', '-')) {
      const op = this.toks[this.i++].v;
      left = { type: 'bin', op, left, right: this.multiplicative() };
    }
    return left;
  }

  multiplicative() {
    let left = this.unary();
    while (this.isOp('*', '/', '%')) {
      const op = this.toks[this.i++].v;
      left = { type: 'bin', op, left, right: this.unary() };
    }
    return left;
  }

  unary() {
    if (this.acceptOp('-')) return { type: 'neg', expr: this.unary() };
    return this.primary();
  }

  primary() {
    const t = this.peek;
    if (t.t === 'num') { this.i += 1; return { type: 'lit', value: t.v }; }
    if (t.t === 'str') { this.i += 1; return { type: 'lit', value: t.v }; }
    if (this.acceptKw('NULL')) return { type: 'lit', value: null };
    if (this.acceptKw('TRUE')) return { type: 'lit', value: 1 };
    if (this.acceptKw('FALSE')) return { type: 'lit', value: 0 };
    if (this.acceptOp('(')) {
      const e = this.expr();
      this.op(')');
      return e;
    }
    if (t.t === 'id') {
      this.i += 1;
      const upper = t.v.toUpperCase();
      if (this.isOp('(') && (AGGREGATES.has(upper) || SCALARS.has(upper))) {
        this.i += 1;
        if (upper === 'COUNT' && this.acceptOp('*')) { this.op(')'); return { type: 'fn', name: 'COUNT', star: true, args: [] }; }
        const distinct = AGGREGATES.has(upper) && this.acceptKw('DISTINCT');
        const args = [];
        if (!this.isOp(')')) do args.push(this.expr()); while (this.acceptOp(','));
        this.op(')');
        return { type: 'fn', name: upper, args, distinct };
      }
      if (this.isOp('(')) throw new SqlError(`Unknown function “${t.v}”`, t.pos);
      if (this.acceptOp('.')) return { type: 'col', table: t.v, name: this.ident('a column name') };
      return { type: 'col', table: null, name: t.v };
    }
    return this.fail('a value, a column or “(”');
  }
}

export function parse(src) {
  return new Parser(src).statements();
}

/* Readable text for an expression, used in plans and column headers. */
export function show(e) {
  switch (e.type) {
    case 'lit': return e.value === null ? 'NULL' : typeof e.value === 'string' ? `'${e.value}'` : String(e.value);
    case 'col': return e.table ? `${e.table}.${e.name}` : e.name;
    case 'bin': return `${show(e.left)} ${e.op} ${show(e.right)}`;
    case 'not': return `NOT ${show(e.expr)}`;
    case 'neg': return `-${show(e.expr)}`;
    case 'isnull': return `${show(e.expr)} IS ${e.negate ? 'NOT ' : ''}NULL`;
    case 'like': return `${show(e.expr)} ${e.negate ? 'NOT ' : ''}LIKE ${show(e.pattern)}`;
    case 'in': return `${show(e.expr)} ${e.negate ? 'NOT ' : ''}IN (${e.list.map(show).join(', ')})`;
    case 'between': return `${show(e.expr)} ${e.negate ? 'NOT ' : ''}BETWEEN ${show(e.lo)} AND ${show(e.hi)}`;
    case 'fn': return `${e.name}(${e.star ? '*' : `${e.distinct ? 'DISTINCT ' : ''}${e.args.map(show).join(', ')}`})`;
    default: return '?';
  }
}
