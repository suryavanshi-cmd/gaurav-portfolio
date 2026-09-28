'use client';

import { useState } from 'react';
import { Slider, fmt } from './controls';

/*
  Little's Law and database pool sizing.

    requests in flight      L = λ × W
    busy DB connections     λ × (database time per request)
    healthy DB connections  ≈ 2 × cores + 1, in total across every server

  The verdicts are checked in order of how badly each problem hurts, and only
  the first that applies is shown — one clear next step beats five warnings.
*/

const PRESETS = [
  { label: 'Small app', rps: 200, latency: 120, dbMs: 8, servers: 2, pool: 10, cores: 4 },
  { label: 'Busy API', rps: 20000, latency: 80, dbMs: 4, servers: 20, pool: 30, cores: 16 },
  { label: '100,000 / s', rps: 100000, latency: 50, dbMs: 1, servers: 50, pool: 20, cores: 64 },
];

function Meter({ label, value, limit, max, tone, note }) {
  const pct = Math.min(100, (value / max) * 100);
  const markPct = Math.min(100, (limit / max) * 100);
  return (
    <div>
      <div className="meter-head">
        <span>{label}</span>
        <strong>{fmt(value)} <span className="muted">/ healthy ≈ {fmt(limit)}</span></strong>
      </div>
      <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)} aria-label={label}>
        <i className={tone === 'ok' ? '' : `is-${tone}`} style={{ width: `${pct}%` }} />
        <span className="meter-mark" style={{ left: `calc(${markPct}% - 1px)` }} aria-hidden="true" />
      </div>
      {note ? <p className="meter-note">{note}</p> : null}
    </div>
  );
}

export default function CapacityPlanner() {
  const [v, setV] = useState(PRESETS[1]);
  const set = (key) => (value) => setV((current) => ({ ...current, [key]: value, label: null }));

  const inFlight = v.rps * (v.latency / 1000);
  const perServer = inFlight / v.servers;
  const dbBusy = v.rps * (v.dbMs / 1000);
  const poolTotal = v.servers * v.pool;
  const healthy = v.cores * 2 + 1;

  let verdict;
  if (dbBusy > healthy) {
    verdict = {
      tone: 'bad',
      text: <>The <b>database is the limit</b>. At this traffic it needs about {fmt(dbBusy)} connections busy all the time, but it works best near {fmt(healthy)}. Make each query faster (indexes, fewer queries per request), cache more reads, or move reads to replicas.</>,
    };
  } else if (poolTotal < dbBusy) {
    verdict = {
      tone: 'bad',
      text: <>The <b>pools are too small</b>. Requests need {fmt(dbBusy)} connections at once but only {fmt(poolTotal)} exist, so they queue in the app. Raise the pool size a little.</>,
    };
  } else if (poolTotal > healthy * 4) {
    verdict = {
      tone: 'warn',
      text: <><b>Too many connections</b>: {v.servers} servers × {v.pool} = {fmt(poolTotal)} pointed at a database that works best near {fmt(healthy)}. Put a pooler such as PgBouncer in front, or shrink each pool.</>,
    };
  } else if (perServer > 800) {
    verdict = {
      tone: 'warn',
      text: <>Each server holds about <b>{fmt(perServer)} requests at once</b>. That needs non-blocking I/O or a lot of threads — or more servers.</>,
    };
  } else {
    verdict = {
      tone: 'ok',
      text: <><b>Looks healthy.</b> The database has headroom and the pools fit it. Try raising the response time and watch how fast the in-flight count grows.</>,
    };
  }

  const dbTone = dbBusy > healthy ? 'bad' : dbBusy > healthy * 0.75 ? 'warn' : 'ok';
  const poolTone = poolTotal > healthy * 4 || poolTotal < dbBusy ? 'warn' : 'ok';

  return (
    <div className="tool">
      <div className="tool-stage">
        <div className="meters">
          <Meter
            label="Busy database connections"
            value={dbBusy}
            limit={healthy}
            max={Math.max(healthy * 2, dbBusy * 1.1)}
            tone={dbTone}
            note="Requests per second × database time per request. The black mark is what the database handles well."
          />
          <Meter
            label="Open connections (all pools)"
            value={poolTotal}
            limit={healthy}
            max={Math.max(healthy * 5, poolTotal * 1.1)}
            tone={poolTone}
            note="Servers × pool size. Far above the mark, extra connections only add waiting."
          />
        </div>
        <div className="law" aria-label="Working">
          L = λ × W → {fmt(v.rps)} req/s × {(v.latency / 1000).toFixed(3)} s = <b>{fmt(inFlight)} requests in flight</b>
          {' '}· {fmt(perServer)} per server
          <br />
          DB: {fmt(v.rps)} × {(v.dbMs / 1000).toFixed(4)} s = <b>{fmt(dbBusy)} busy</b> · healthy ≈ 2 × {v.cores} cores + 1 = <b>{healthy}</b>
        </div>
      </div>

      <div className="tool-body">
        <div className="tool-actions" style={{ marginTop: 0, marginBottom: 22 }} role="group" aria-label="Presets">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={`btn ${v.label === preset.label ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setV(preset)}
              aria-pressed={v.label === preset.label}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="tool-controls">
          <Slider label="Traffic" value={v.rps} min={10} max={200000} log onChange={set('rps')} format={(x) => `${fmt(x)} req/s`} />
          <Slider label="Average response time" value={v.latency} min={5} max={1000} step={5} onChange={set('latency')} format={(x) => `${x} ms`} />
          <Slider label="Database time per request" value={v.dbMs} min={0.5} max={60} step={0.5} onChange={set('dbMs')} format={(x) => `${x} ms`} />
          <Slider label="App servers" value={v.servers} min={1} max={100} onChange={set('servers')} format={(x) => `${x}`} />
          <Slider label="Pool size per server" value={v.pool} min={1} max={100} onChange={set('pool')} format={(x) => `${x}`} />
          <Slider label="Database CPU cores" value={v.cores} min={2} max={64} onChange={set('cores')} format={(x) => `${x}`} />
        </div>

        <div className="readouts" aria-live="polite">
          <div className="readout"><span>In flight</span><strong>{fmt(inFlight)}</strong></div>
          <div className="readout"><span>Per server</span><strong>{fmt(perServer)}</strong></div>
          <div className="readout"><span>DB busy</span><strong className={`is-${dbTone}`}>{fmt(dbBusy)}</strong></div>
          <div className="readout"><span>Open connections</span><strong className={`is-${poolTone}`}>{fmt(poolTotal)}</strong></div>
        </div>

        <p className={`verdict is-${verdict.tone}`}>
          <span className="verdict-icon" aria-hidden="true">{verdict.tone === 'ok' ? '✓' : '!'}</span>
          <span>{verdict.text}</span>
        </p>
      </div>
    </div>
  );
}
