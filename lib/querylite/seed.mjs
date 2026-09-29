/*
  The sample shop the console opens with: customers, products and orders.
  Generated from a fixed seed, so every visitor — and every test — gets the
  same 22,060 rows.

  orders.customer_id has an index; orders.status and orders.day do not, so
  the first thing to try is watching a query change plan after
  CREATE INDEX.
*/

import { Database } from './engine.mjs';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ['Aarav', 'Diya', 'Kabir', 'Isha', 'Rohan', 'Meera', 'Arjun', 'Sara', 'Vihaan', 'Anika', 'Reyansh', 'Tara', 'Ishaan', 'Kiara', 'Advait', 'Myra', 'Kian', 'Zoya', 'Dev', 'Nisha'];
const LAST = ['Patil', 'Sharma', 'Iyer', 'Khan', 'Deshmukh', 'Reddy', 'Gupta', 'Kulkarni', 'Nair', 'Singh', 'Joshi', 'Mehta'];
const CITIES = ['Pune', 'Mumbai', 'Bengaluru', 'Delhi', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Nashik'];
const CATEGORIES = { Books: [199, 899], Electronics: [999, 49999], Home: [299, 5999], Sports: [399, 7999], Grocery: [49, 999], Fashion: [499, 4999] };
const STATUS = [['delivered', 0.72], ['shipped', 0.12], ['pending', 0.08], ['cancelled', 0.05], ['returned', 0.03]];

export const SEED_COUNTS = { customers: 2000, products: 60, orders: 20000 };

export function seedDatabase() {
  const r = rng(20260929);
  const pick = (list) => list[Math.floor(r() * list.length)];
  const db = new Database();
  db.exec(`
    CREATE TABLE customers (id INT PRIMARY KEY, name TEXT NOT NULL, city TEXT, joined INT);
    CREATE TABLE products (id INT PRIMARY KEY, name TEXT NOT NULL, category TEXT, price REAL);
    CREATE TABLE orders (id INT PRIMARY KEY, customer_id INT, product_id INT, qty INT, amount REAL, status TEXT, day TEXT);
    CREATE INDEX idx_orders_customer ON orders (customer_id);
  `);
  const customers = db.table('customers');
  const products = db.table('products');
  const orders = db.table('orders');

  for (let id = 1; id <= SEED_COUNTS.customers; id += 1) {
    db.rawInsert(customers, id, [id, `${pick(FIRST)} ${pick(LAST)}`, pick(CITIES), 2018 + Math.floor(r() * 8)]);
  }
  customers.nextId = SEED_COUNTS.customers + 1;

  const cats = Object.keys(CATEGORIES);
  const prices = [];
  for (let id = 1; id <= SEED_COUNTS.products; id += 1) {
    const cat = cats[(id - 1) % cats.length];
    const [lo, hi] = CATEGORIES[cat];
    const price = Math.round(lo + r() * (hi - lo));
    prices[id] = price;
    db.rawInsert(products, id, [id, `${cat} item ${Math.ceil(id / cats.length)}`, cat, price]);
  }
  products.nextId = SEED_COUNTS.products + 1;

  for (let id = 1; id <= SEED_COUNTS.orders; id += 1) {
    const product = 1 + Math.floor(r() * SEED_COUNTS.products);
    const qty = 1 + Math.floor(r() ** 3 * 5);
    let x = r();
    let status = STATUS[0][0];
    for (const [s, p] of STATUS) {
      if (x < p) { status = s; break; }
      x -= p;
    }
    const day = new Date(Date.UTC(2025, 0, 1) + Math.floor(r() * 365) * 86400000).toISOString().slice(0, 10);
    db.rawInsert(orders, id, [id, 1 + Math.floor(r() * SEED_COUNTS.customers), product, qty, prices[product] * qty, status, day]);
  }
  orders.nextId = SEED_COUNTS.orders + 1;
  return db;
}
