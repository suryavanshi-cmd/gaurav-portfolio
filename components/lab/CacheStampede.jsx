'use client';

import { useEffect, useRef, useState } from 'react';
import { Slider, Switch, fmt } from './controls';

/*
  A cache in front of a database, simulated in 20 ms steps.

  400 keys are all cached at t = 0 — the moment after a deploy or a restart.
  4,000 requests a second each pick a random key.

    key still valid                 → cache hit, no database work
    key expired, nobody refreshing  → database query, and this request starts
                                      a 300 ms refresh
    key expired, refresh in flight  → with single-flight: wait for that
                                      refresh (no database work)
                                      without: query the database as well

  When a refresh finishes, the key is cached again for TTL seconds — plus or
  minus 25% if jitter is on. Without jitter every key that was cached together
  expires together, forever, and the database takes all of them at once.
*/

const KEYS = 400;
const RPS = 4000;
const DB_TIME = 0.3;
const DB_CAPACITY = 300;
const STEP = 0.02;
const SPEED = 2;      // simulated seconds per real second
const WINDOW = 40;    // seconds of history on the chart

function freshSim(ttl, jitter) {
  const expires = new Float64Array(KEYS);
  const refreshing = new Float64Array(KEYS).fill(-1);
  for (let k = 0; k < KEYS; k += 1) expires[k] = ttl * (1 + (jitter ? 0.25 : 0) * (2 * Math.random() - 1));
  return {
    t: 0, expires, refreshing, hits: 0, requests: 0, db: 0,
    second: 0, secondDb: 0, bars: Array(WINDOW).fill(0), peak: 0, carry: 0,
  };
}

function advance(s, dtSim, opts) {
  s.carry += dtSim;
  while (s.carry >= STEP) {
    s.carry -= STEP;
    s.t += STEP;
    const perStep = RPS * STEP;
    for (let i = 0; i < perStep; i += 1) {
      const k = (Math.random() * KEYS) | 0;
      s.requests += 1;
      if (s.t < s.expires[k]) {
        s.hits += 1;
      } else if (s.refreshing[k] > s.t) {
        if (!opts.singleFlight) { s.db += 1; s.secondDb += 1; }
      } else {
        s.db += 1;
        s.secondDb += 1;
        s.refreshing[k] = s.t + DB_TIME;
      }
    }
    for (let k = 0; k < KEYS; k += 1) {
      if (s.refreshing[k] > 0 && s.refreshing[k] <= s.t) {
        const spread = opts.jitter ? 0.25 * (2 * Math.random() - 1) : 0;
        s.expires[k] = s.t + opts.ttl * (1 + spread);
        s.refreshing[k] = -1;
      }
    }
    if (Math.floor(s.t) > s.second) {
      s.second = Math.floor(s.t);
      s.bars = [...s.bars.slice(1), s.secondDb];
      s.peak = Math.max(s.peak, s.secondDb);
      s.secondDb = 0;
    }
  }
}

export default function CacheStampede() {
  const [jitter, setJitter] = useState(false);
  const [singleFlight, setSingleFlight] = useState(false);
  const [ttl, setTtl] = useState(10);
  const [running, setRunning] = useState(true);
  const [view, setView] = useState(() => ({ bars: Array(WINDOW).fill(0), peak: 0, db: 0, hitRate: 0, t: 0 }));

  const opts = useRef({ jitter, singleFlight, ttl });
  opts.current = { jitter, singleFlight, ttl };
  const sim = useRef(null);

  const restart = () => {
    sim.current = freshSim(opts.current.ttl, opts.current.jitter);
    setView({ bars: Array(WINDOW).fill(0), peak: 0, db: 0, hitRate: 0, t: 0 });
  };

  if (!sim.current) sim.current = freshSim(ttl, jitter);

  /* Any change starts again from "everything cached at once", so each
     combination of fixes is compared from the same starting point. */
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    restart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jitter, singleFlight, ttl]);

  useEffect(() => {
    if (!running) return undefined;
    let frame = 0;
    let last = performance.now();
    let lastSecond = -1;

    const loop = (now) => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const s = sim.current;
      advance(s, dt * SPEED, opts.current);
      if (s.second !== lastSecond) {
        lastSecond = s.second;
        setView({
          bars: s.bars,
          peak: s.peak,
          db: s.db,
          hitRate: s.requests ? s.hits / s.requests : 0,
          t: s.second,
        });
      }
    };
    frame = requestAnimationFrame(loop);
    const onVisibility = () => { last = performance.now(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', onVisibility); };
  }, [running]);

  /* A fixed scale, so switching the fixes on and off is a fair comparison. */
  const scale = Math.max(1400, view.peak * 1.08);
  const capAt = (DB_CAPACITY / scale) * 100;
  const over = view.peak > DB_CAPACITY;

  let verdict;
  if (!jitter && !singleFlight) {
    verdict = { tone: 'bad', text: <>Every key was cached at the same moment, so they <b>all expire together</b>. Each expiry sends a wall of queries to the database — and it repeats every cycle.</> };
  } else if (jitter && singleFlight) {
    verdict = { tone: 'ok', text: <>Jitter spreads the expiries out and single-flight sends <b>one query per key</b>. The database sees a steady trickle instead of spikes.</> };
  } else if (jitter) {
    verdict = { tone: 'warn', text: <>Jitter spreads the expiries, so the spikes flatten. But each expired key still gets a few duplicate queries while it refreshes — add <b>single-flight</b>.</> };
  } else {
    verdict = { tone: 'warn', text: <>Single-flight stops duplicate queries — <b>one per key</b>. But the keys still expire together, so the spikes remain. Add <b>jitter</b>.</> };
  }

  return (
    <div className="tool">
      <div className="tool-stage">
        <div className="chart" role="img" aria-label={`Database queries per second over the last ${WINDOW} seconds. Peak ${fmt(view.peak)}.`}>
          <div className="chart-axis" aria-hidden="true">
            <span>{fmt(scale)}</span><span>{fmt(scale / 2)}</span><span>0</span>
          </div>
          <div className="chart-bars">
            {view.bars.map((value, i) => (
              <b
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                className={value > DB_CAPACITY ? 'is-over' : ''}
                style={{ height: `${Math.min(100, (value / scale) * 100)}%` }}
              />
            ))}
            <div className="chart-cap" style={{ bottom: `${capAt}%` }}>
              <span>Database limit · {DB_CAPACITY} queries/s</span>
            </div>
          </div>
          <div className="chart-x" aria-hidden="true"><span>{WINDOW} s ago</span><span>now · t = {view.t} s</span></div>
        </div>
      </div>

      <div className="tool-body">
        <div className="tool-controls">
          <Switch label="Jitter: expire ±25% apart" checked={jitter} onChange={setJitter} />
          <Switch label="Single-flight: one refresh per key" checked={singleFlight} onChange={setSingleFlight} />
          <Slider label="Cache TTL" value={ttl} min={6} max={30} onChange={setTtl} format={(v) => `${v} s`} />
        </div>

        <div className="tool-actions">
          <button type="button" className="btn btn-primary" onClick={restart}>Restart — cache everything at once</button>
          <button type="button" className="btn btn-ghost" onClick={() => setRunning((v) => !v)} aria-pressed={!running}>
            {running ? 'Pause' : 'Play'}
          </button>
        </div>

        <div className="readouts" aria-live="polite">
          <div className="readout"><span>Peak DB queries / s</span><strong className={over ? 'is-bad' : 'is-ok'}>{fmt(view.peak)}</strong></div>
          <div className="readout"><span>Total DB queries</span><strong>{fmt(view.db)}</strong></div>
          <div className="readout"><span>Cache hit rate</span><strong>{(view.hitRate * 100).toFixed(1)}%</strong></div>
          <div className="readout"><span>Traffic</span><strong>{fmt(RPS)}/s</strong></div>
        </div>

        <p className={`verdict is-${verdict.tone}`}>
          <span className="verdict-icon" aria-hidden="true">{verdict.tone === 'ok' ? '✓' : '!'}</span>
          <span>{verdict.text}</span>
        </p>
        <p className="legend">
          <span>Each bar is one second.</span>
          <span><i style={{ background: 'var(--accent)' }} />under the limit</span>
          <span><i style={{ background: 'var(--bad)' }} />over the limit</span>
          <span>Changing a switch restarts from the same moment, for a fair comparison.</span>
        </p>
      </div>
    </div>
  );
}
