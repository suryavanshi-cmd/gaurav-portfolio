// Minimal PostgREST + GoTrue stand-in backed by a real Postgres.
//
// The point is that the application code under test talks to the genuine
// @supabase/supabase-js client and the genuine SQL functions — only the
// transport in between is local. A hand-written fake of the store would drift
// from the migrations and stop catching the bugs that matter.
import express from 'express';
import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.PGHOST || '/tmp',
  port: Number(process.env.PGPORT || 5433),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || undefined,
  database: process.env.PGDATABASE || 'rakta',
});

const app = express();
app.use(express.json());

/** jwt -> { id, email }. Tests register tokens here. */
export const TOKENS = new Map();

// ── GoTrue ─────────────────────────────────────────────────────────────────
app.get('/auth/v1/user', (req, res) => {
  const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const user = TOKENS.get(token);
  if (!user) return res.status(401).json({ message: 'invalid token' });
  return res.json({ id: user.id, email: user.email, aud: 'authenticated' });
});

// ── RPC ────────────────────────────────────────────────────────────────────
app.post('/rest/v1/rpc/:fn', async (req, res) => {
  const args = req.body || {};
  const keys = Object.keys(args);
  const isObj = (v) => v !== null && typeof v === 'object';

  // PostgREST infers jsonb from the JSON body; node-postgres would send an
  // object as text, so the cast has to be explicit here.
  const params = keys
    .map((k, i) => `${k} => $${i + 1}${isObj(args[k]) ? '::jsonb' : ''}`)
    .join(', ');

  try {
    const r = await pool.query(
      `select * from public.${req.params.fn}(${params})`,
      keys.map((k) => (isObj(args[k]) ? JSON.stringify(args[k]) : args[k])),
    );
    // PostgREST returns a bare scalar for scalar functions, rows for RETURNS TABLE.
    if (r.fields.length === 1 && r.fields[0].name === req.params.fn) {
      return res.json(r.rows.length ? r.rows[0][req.params.fn] : null);
    }
    return res.json(r.rows);
  } catch (e) {
    return res.status(400).json({ message: e.message, code: e.code });
  }
});

// ── table access ───────────────────────────────────────────────────────────
function eqFilters(query, values) {
  const filters = [];
  for (const [k, v] of Object.entries(query)) {
    if (['select', 'order', 'limit', 'offset'].includes(k)) continue;
    const m = String(v).match(/^eq\.(.*)$/);
    if (m) { values.push(m[1]); filters.push(`${k} = $${values.length}`); }
  }
  return filters;
}

app.post('/rest/v1/:table', async (req, res) => {
  const rows = Array.isArray(req.body) ? req.body : [req.body];
  try {
    for (const row of rows) {
      const cols = Object.keys(row);
      await pool.query(
        `insert into public.${req.params.table} (${cols.join(',')}) values (${cols.map((_, i) => `$${i + 1}`).join(',')})`,
        cols.map((c) => (row[c] !== null && typeof row[c] === 'object' ? JSON.stringify(row[c]) : row[c])),
      );
    }
    return res.status(201).json([]);
  } catch (e) {
    return res.status(409).json({ message: e.message, code: e.code });
  }
});

app.patch('/rest/v1/:table', async (req, res) => {
  const set = Object.keys(req.body || {});
  const values = set.map((k) => req.body[k]);
  const filters = eqFilters(req.query, values);
  try {
    await pool.query(
      `update public.${req.params.table} set ${set.map((k, i) => `${k} = $${i + 1}`).join(', ')}`
      + (filters.length ? ` where ${filters.join(' and ')}` : ''),
      values,
    );
    return res.status(204).end();
  } catch (e) {
    return res.status(400).json({ message: e.message, code: e.code });
  }
});

app.get('/rest/v1/:table', async (req, res) => {
  const select = String(req.query.select || '');

  // PostgREST embedded resource: reports.select('*, patients(...)')
  if (req.params.table === 'reports' && select.includes('patients(')) {
    const id = String(req.query.id || '').replace(/^eq\./, '');
    const limit = Number(req.query.limit || 50);
    try {
      const r = await pool.query(
        `select r.*, json_build_object('id',p.id,'name',p.name,'phone',p.phone,'age',p.age,'sex',p.sex) as patients
           from public.reports r join public.patients p on p.id = r.patient_id
          ${id ? 'where r.id = $1' : ''}
          order by r.created_at desc limit ${limit}`,
        id ? [id] : [],
      );
      return res.json(r.rows);
    } catch (e) {
      return res.status(400).json({ message: e.message, code: e.code });
    }
  }

  const values = [];
  const filters = eqFilters(req.query, values);
  try {
    const r = await pool.query(
      `select * from public.${req.params.table}${filters.length ? ` where ${filters.join(' and ')}` : ''}`
      + (req.query.limit ? ` limit ${Number(req.query.limit)}` : ''),
      values,
    );
    return res.json(r.rows);
  } catch (e) {
    return res.status(400).json({ message: e.message, code: e.code });
  }
});

export function start(port) {
  return new Promise((resolve) => { const s = app.listen(port, () => resolve(s)); });
}

export { pool };
