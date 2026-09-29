'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Database } from '../../lib/querylite/engine.mjs';
import { seedDatabase } from '../../lib/querylite/seed.mjs';

/*
  The QueryLite console: a SQL editor over the engine in lib/querylite,
  running entirely in this browser tab. Every query shows its plan with real
  row counts. Changes are saved to localStorage, so your tables and indexes
  are still there after a reload; "Reset" brings back the sample shop.
*/

const STORE = 'querylite-db';

const EXAMPLES = [
  { label: 'Find by index', sql: 'SELECT * FROM orders WHERE customer_id = 42;' },
  { label: 'Full table scan', sql: "SELECT COUNT(*) FROM orders WHERE status = 'returned';" },
  { label: 'Add an index', sql: "CREATE INDEX IF NOT EXISTS idx_status ON orders (status);\nSELECT COUNT(*) FROM orders WHERE status = 'returned';" },
  { label: 'Join + group', sql: "SELECT c.city, COUNT(*) AS orders, ROUND(AVG(o.amount)) AS avg_order\nFROM orders o JOIN customers c ON c.id = o.customer_id\nWHERE o.status = 'delivered'\nGROUP BY c.city\nORDER BY orders DESC\nLIMIT 5;" },
  { label: 'Hash join', sql: 'SELECT p.category, SUM(o.qty) AS units, ROUND(SUM(o.amount)) AS revenue\nFROM products p JOIN orders o ON o.product_id = p.id\nGROUP BY p.category\nORDER BY revenue DESC;' },
  { label: 'Transaction', sql: "BEGIN;\nDELETE FROM orders WHERE status = 'cancelled';\nSELECT COUNT(*) AS during FROM orders;\nROLLBACK;\nSELECT COUNT(*) AS after FROM orders;" },
  { label: 'Planner says no', sql: "CREATE INDEX IF NOT EXISTS idx_status ON orders (status);\nSELECT COUNT(*) FROM orders WHERE status = 'delivered';" },
];

const fmt = (v) => {
  if (v === null || v === undefined) return <span className="ql-null">NULL</span>;
  if (typeof v === 'number') return Number.isInteger(v) ? v.toLocaleString('en-US') : v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return String(v);
};

function PlanNode({ node }) {
  if (!node) return null;
  const kind = /Index/.test(node.label) ? 'is-index' : /Seq/.test(node.label) ? 'is-seq' : /Join|Loop/.test(node.label) ? 'is-join' : '';
  return (
    <li>
      <div className={`ql-node ${kind}`}>
        <div className="ql-node-top">
          <b>{node.label}</b>
          {typeof node.rows === 'number' ? <span className="ql-rows">{node.rows.toLocaleString('en-US')} {node.rows === 1 ? 'row' : 'rows'}</span> : <span className="ql-rows">per row</span>}
        </div>
        {node.detail ? <p>{node.detail}</p> : null}
        {node.filter ? <p className="ql-filter">filter: {node.filter}</p> : null}
        {node.note ? <p className="ql-note">{node.note}</p> : null}
      </div>
      {node.children?.length ? <ul>{node.children.map((c, i) => <PlanNode key={i} node={c} />)}</ul> : null}
    </li>
  );
}

function where(sql, pos) {
  const before = sql.slice(0, pos);
  const line = before.split('\n').length;
  const col = pos - before.lastIndexOf('\n');
  return { line, col, text: sql.split('\n')[line - 1] };
}

export default function QueryLite() {
  const db = useRef(null);
  const [ready, setReady] = useState(false);
  const [sql, setSql] = useState(EXAMPLES[0].sql);
  const [results, setResults] = useState([]);
  const [schema, setSchema] = useState([]);
  const [saved, setSaved] = useState(false);
  const [inTxn, setInTxn] = useState(false);
  const [lastSql, setLastSql] = useState('');
  const editor = useRef(null);

  const refresh = () => {
    setSchema(db.current.schema());
    setInTxn(Boolean(db.current.txn));
  };

  const run = useCallback((text) => {
    if (!db.current) return;
    const out = db.current.exec(text);
    setResults(out);
    setLastSql(text);
    if (out.some((r) => r.type === 'ok') && !db.current.txn) {
      try {
        window.localStorage.setItem(STORE, db.current.serialize());
        setSaved(true);
      } catch { /* too big for this browser's storage — still works, just not saved */ }
    }
    refresh();
  }, []);

  useEffect(() => {
    /* Build (or restore) the database after first paint, so the page shows
       at once; seeding 22,060 rows takes about a tenth of a second. */
    const id = setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(STORE);
        if (stored) { db.current = Database.load(stored); setSaved(true); }
      } catch { db.current = null; }
      if (!db.current) db.current = seedDatabase();
      setReady(true);
      run(EXAMPLES[0].sql);
    }, 30);
    return () => clearTimeout(id);
  }, [run]);

  const reset = () => {
    try { window.localStorage.removeItem(STORE); } catch { /* nothing stored */ }
    db.current = seedDatabase();
    setSaved(false);
    setSql(EXAMPLES[0].sql);
    run(EXAMPLES[0].sql);
  };

  const onKey = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      run(sql);
    }
  };

  const shown = results.filter((r) => r.type === 'rows' || r.type === 'plan');
  const main = shown[shown.length - 1];
  const error = results.find((r) => r.type === 'error');
  const messages = results.filter((r) => r.type === 'ok');
  const errAt = error && typeof error.pos === 'number' ? where(lastSql, error.pos) : null;

  return (
    <div className="tool ql">
      <div className="ql-top">
        <div className="ql-editor">
          <div className="ql-chips" role="group" aria-label="Examples">
            {EXAMPLES.map((ex) => (
              <button key={ex.label} type="button" onClick={() => { setSql(ex.sql); run(ex.sql); }}>{ex.label}</button>
            ))}
          </div>
          <textarea
            ref={editor}
            className="code-input ql-sql"
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            onKeyDown={onKey}
            spellCheck={false}
            aria-label="SQL"
          />
          <div className="ql-bar">
            <button type="button" className="btn btn-primary" onClick={() => run(sql)} disabled={!ready}>{ready ? 'Run' : 'Loading…'}</button>
            <span className="ql-hint">⌘/Ctrl + Enter</span>
            {inTxn ? <span className="ql-txn">In a transaction — COMMIT or ROLLBACK</span> : null}
            <span className="ql-spacer" />
            {saved ? <span className="ql-saved">Saved in this browser</span> : null}
            <button type="button" className="btn btn-ghost" onClick={reset}>Reset data</button>
          </div>
        </div>

        <aside className="ql-schema" aria-label="Tables">
          {schema.map((t) => (
            <details key={t.name} open={t.name === 'orders'}>
              <summary><b>{t.name}</b><span>{t.rows.toLocaleString('en-US')} rows</span></summary>
              <ul>
                {t.columns.map((c) => (
                  <li key={c.name}>
                    <span>{c.primary ? '🔑 ' : ''}{c.name}</span>
                    <em>{c.type}{c.indexed ? ' · indexed' : ''}</em>
                  </li>
                ))}
              </ul>
              {t.indexes.map((i) => (
                <p key={i.name} className="ql-index">B+ tree <b>{i.name}</b>: {i.nodes} pages, height {i.height}</p>
              ))}
            </details>
          ))}
        </aside>
      </div>

      <div className="ql-out" aria-live="polite">
        {messages.map((m, i) => <p key={i} className="ql-msg">✓ {m.message}{m.ms !== undefined ? <span> · {m.ms.toFixed(1)} ms</span> : null}</p>)}
        {error ? (
          <div className="ql-error" role="alert">
            <b>Error:</b> {error.message}
            {errAt ? (
              <pre>{`line ${errAt.line}: ${errAt.text}\n${' '.repeat(String(errAt.line).length + 7 + errAt.col - 1)}^`}</pre>
            ) : null}
          </div>
        ) : null}

        {main ? (
          <>
            <div className="ql-stats">
              <span><b>{main.type === 'rows' ? main.rows.length.toLocaleString('en-US') : '—'}</b> rows returned</span>
              <span><b>{main.stats.scanned.toLocaleString('en-US')}</b> rows read</span>
              <span><b>{main.stats.indexNodes.toLocaleString('en-US')}</b> index pages</span>
              <span><b>{main.ms.toFixed(1)}</b> ms</span>
            </div>
            <div className="ql-grid">
              {main.type === 'rows' ? (
                <div className="ql-table-wrap">
                  <table className="ql-table">
                    <thead><tr>{main.columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
                    <tbody>
                      {main.rows.slice(0, 100).map((row, i) => (
                        // eslint-disable-next-line react/no-array-index-key
                        <tr key={i}>{row.map((v, j) => <td key={j} className={typeof v === 'number' ? 'is-num' : ''}>{fmt(v)}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                  {main.rows.length > 100 ? <p className="ql-more">Showing 100 of {main.rows.length.toLocaleString('en-US')} rows.</p> : null}
                  {!main.rows.length ? <p className="ql-more">No rows.</p> : null}
                </div>
              ) : null}
              <div className="ql-plan">
                <h4>Query plan <span>(real counts)</span></h4>
                <ul className="ql-tree"><PlanNode node={main.plan} /></ul>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
