import test from 'node:test';
import assert from 'node:assert/strict';
import { Database } from '../lib/querylite/engine.mjs';
import { seedDatabase, SEED_COUNTS } from '../lib/querylite/seed.mjs';
import { seeded } from '../lib/raft.mjs';

const one = (db, sql) => {
  const results = db.exec(sql);
  const last = results[results.length - 1];
  if (last.type === 'error') throw new Error(last.message);
  return last;
};

function small() {
  const db = new Database();
  one(db, `CREATE TABLE people (id INT PRIMARY KEY, name TEXT NOT NULL, city TEXT, age INT);
           CREATE TABLE pets (id INT PRIMARY KEY, owner INT, kind TEXT);
           INSERT INTO people VALUES (1, 'Asha', 'Pune', 31), (2, 'Ravi', 'Mumbai', 27), (3, 'Meera', 'Pune', 40), (4, 'Kiran', NULL, 22);
           INSERT INTO pets VALUES (1, 1, 'cat'), (2, 1, 'dog'), (3, 3, 'cat');`);
  return db;
}

test('filters, sorts, limits and projects', () => {
  const r = one(small(), "SELECT name, age * 2 AS double FROM people WHERE city = 'Pune' OR age < 25 ORDER BY age DESC LIMIT 2");
  assert.deepEqual(r.columns, ['name', 'double']);
  assert.deepEqual(r.rows, [['Meera', 80], ['Asha', 62]]);
});

test('NULL follows SQL rules', () => {
  const db = small();
  assert.deepEqual(one(db, 'SELECT name FROM people WHERE city IS NULL').rows, [['Kiran']]);
  assert.deepEqual(one(db, "SELECT COUNT(*), COUNT(city) FROM people WHERE city != 'Mumbai'").rows, [[2, 2]]);
});

test('inner and left joins, grouping and HAVING', () => {
  const db = small();
  const inner = one(db, 'SELECT p.name, COUNT(*) AS pets FROM people p JOIN pets x ON x.owner = p.id GROUP BY p.name HAVING pets >= 1 ORDER BY pets DESC, p.name');
  assert.deepEqual(inner.rows, [['Asha', 2], ['Meera', 1]]);
  const left = one(db, 'SELECT p.name, x.kind FROM people p LEFT JOIN pets x ON x.owner = p.id WHERE p.id >= 3 ORDER BY p.id');
  assert.deepEqual(left.rows, [['Meera', 'cat'], ['Kiran', null]]);
});

test('primary keys are unique, types are checked, errors say where', () => {
  const db = small();
  assert.equal(db.exec("INSERT INTO people VALUES (1, 'Dup', 'Pune', 1)")[0].type, 'error');
  assert.match(db.exec("INSERT INTO people VALUES (9, 'X', 'Pune', 'old')")[0].message, /INT/);
  assert.match(db.exec('SELEC * FROM people')[0].message, /Expected SELECT/);
  assert.match(db.exec('SELECT nme FROM people')[0].message, /No column named/);
});

test('ROLLBACK undoes inserts, updates and deletes — indexes included', () => {
  const db = small();
  one(db, 'CREATE INDEX idx_city ON people (city)');
  one(db, "BEGIN; INSERT INTO people VALUES (5, 'Dev', 'Delhi', 35); UPDATE people SET city = 'Delhi' WHERE id = 1; DELETE FROM people WHERE id = 3; ROLLBACK");
  assert.deepEqual(one(db, 'SELECT id, city FROM people ORDER BY id').rows, [[1, 'Pune'], [2, 'Mumbai'], [3, 'Pune'], [4, null]]);
  assert.deepEqual(one(db, "SELECT id FROM people WHERE city = 'Pune' ORDER BY id").rows, [[1], [3]]);
  assert.deepEqual(one(db, "SELECT id FROM people WHERE city = 'Delhi'").rows, []);
});

test('the planner uses an index when it can, and gets the same answer', () => {
  const db = seedDatabase();
  const before = one(db, "SELECT COUNT(*) FROM orders WHERE status = 'returned'");
  assert.equal(before.plan.children[0].label, 'Seq Scan');
  assert.equal(before.stats.scanned, SEED_COUNTS.orders);
  one(db, 'CREATE INDEX idx_status ON orders (status)');
  const after = one(db, "SELECT COUNT(*) FROM orders WHERE status = 'returned'");
  assert.equal(after.plan.children[0].label, 'Index Scan');
  assert.deepEqual(after.rows, before.rows);
  assert.ok(after.stats.scanned < SEED_COUNTS.orders / 10);
  /* 72% of orders are delivered: the index would not narrow it down, so the
     planner reads the table instead, and says why. */
  const common = one(db, "SELECT COUNT(*) FROM orders WHERE status = 'delivered'");
  assert.equal(common.plan.children[0].label, 'Seq Scan');
  assert.match(common.plan.children[0].note, /idx_status skipped/);
});

test('index and full-scan plans agree on random queries (property)', () => {
  const rand = seeded(42);
  const plain = seedDatabase();
  const indexed = seedDatabase();
  one(indexed, 'CREATE INDEX i1 ON orders (amount); CREATE INDEX i2 ON orders (day); CREATE INDEX i3 ON orders (status)');
  const statuses = ['delivered', 'shipped', 'pending', 'cancelled', 'returned'];
  for (let i = 0; i < 60; i += 1) {
    const a = Math.floor(rand() * 40000);
    const day = `2025-${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}-15`;
    const conds = [
      `amount > ${a}`, `amount <= ${a}`, `amount BETWEEN ${a} AND ${a + 5000}`, `day >= '${day}'`,
      `status IN ('${statuses[i % 5]}', '${statuses[(i + 2) % 5]}')`, `customer_id = ${1 + Math.floor(rand() * 2000)}`,
    ];
    const where = [conds[i % conds.length], conds[Math.floor(rand() * conds.length)]].join(' AND ');
    const sql = `SELECT id FROM orders WHERE ${where} ORDER BY id`;
    assert.deepEqual(one(indexed, sql).rows, one(plain, sql).rows, sql);
  }
});

test('join strategies agree: index nested loop, hash join, nested loop', () => {
  const db = seedDatabase();
  const tail = "WHERE o.status = 'returned' GROUP BY p.category ORDER BY p.category";
  const joinOf = (r) => r.plan.children[0].children[0];
  /* products.id is indexed → probe it once per order. */
  const indexLoop = one(db, `SELECT p.category, COUNT(*) AS n, SUM(o.qty) AS q FROM orders o JOIN products p ON p.id = o.product_id ${tail}`);
  /* orders.product_id is not indexed → build a hash table of orders. */
  const hash = one(db, `SELECT p.category, COUNT(*) AS n, SUM(o.qty) AS q FROM products p JOIN orders o ON o.product_id = p.id ${tail}`);
  /* No usable equality → compare every pair. */
  const nested = one(db, `SELECT p.category, COUNT(*) AS n, SUM(o.qty) AS q FROM products p JOIN orders o ON o.product_id - p.id = 0 ${tail}`);
  assert.match(joinOf(indexLoop).label, /Index Nested Loop/);
  assert.match(joinOf(hash).label, /Hash Join/);
  assert.match(joinOf(nested).label, /Nested Loop/);
  assert.deepEqual(hash.rows, indexLoop.rows);
  assert.deepEqual(nested.rows, indexLoop.rows);
  assert.ok(indexLoop.rows.reduce((s, row) => s + row[1], 0) > 0);
});

test('a saved database loads back with the same data and indexes', () => {
  const db = small();
  one(db, 'CREATE INDEX idx_age ON people (age)');
  const copy = Database.load(db.serialize());
  assert.deepEqual(one(copy, 'SELECT * FROM people ORDER BY id').rows, one(db, 'SELECT * FROM people ORDER BY id').rows);
  assert.equal(one(copy, 'SELECT name FROM people WHERE age > 30').plan.label, 'Index Scan');
});
