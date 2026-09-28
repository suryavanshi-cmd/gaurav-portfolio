'use client';

import { useEffect, useRef, useState } from 'react';
import { Slider, Switch, fmt } from './controls';
import { Segmented } from '../ui';

/*
  An API server calling a payment service, with or without a circuit breaker.

  150 requests a second arrive. Each one borrows a thread from a pool of 200
  and calls the payment service:

    healthy   answers in 50 ms, 1% errors
    erroring  answers in 50 ms, 85% errors
    hanging   never answers; the call gives up at the timeout

  A thread is held until its call returns. When all 200 are busy, new requests
  are turned away at once — including ones that never needed the payment
  service. That is how one slow dependency takes down a whole API.

  The breaker watches the last 40 calls that finished. When the share that
  failed reaches the threshold it opens: calls fail immediately, holding no
  thread. After the open time it goes half-open and lets 5 trial calls
  through. All 5 succeed → closed. Any fails → open again.
*/

const RPS = 150;
const POOL = 200;
const STEP = 0.02;
const BUCKET = 0.5;
const BARS = 60;
const WINDOW = 40;
const TRIALS = 5;

const DEPS = {
  healthy: { latency: 0.05, errors: 0.01 },
  erroring: { latency: 0.05, errors: 0.85 },
  hanging: { latency: Infinity, errors: 1 },
};

const emptyBucket = () => ({ ok: 0, failed: 0, fast: 0, full: 0 });

function freshSim() {
  return {
    t: 0,
    carry: 0,
    arrivals: 0,
    busy: 0,
    calls: [],          // { at, ok, trial }
    window: [],         // last WINDOW outcomes, true = ok
    state: 'closed',
    openUntil: 0,
    trialsSent: 0,
    trialsDone: 0,
    trialsOk: 0,
    bucket: emptyBucket(),
    bucketEnd: BUCKET,
    bars: Array.from({ length: BARS }, emptyBucket),
    events: [],
  };
}

function log(s, text) {
  s.events = [{ t: s.t, text }, ...s.events].slice(0, 4);
}

function advance(s, dt, opts) {
  s.carry += dt;
  const dep = DEPS[opts.dep];
  while (s.carry >= STEP) {
    s.carry -= STEP;
    s.t += STEP;

    /* Calls that finish now give their thread back. */
    const still = [];
    for (const call of s.calls) {
      if (call.at > s.t) { still.push(call); continue; }
      s.busy -= 1;
      if (call.ok) s.bucket.ok += 1; else s.bucket.failed += 1;
      s.window.push(call.ok);
      if (s.window.length > WINDOW) s.window.shift();
      if (call.trial) {
        s.trialsDone += 1;
        if (call.ok) s.trialsOk += 1;
      }
    }
    s.calls = still;

    /* Breaker state changes. */
    if (opts.breaker) {
      if (s.state === 'closed' && s.window.length >= 20) {
        const failed = s.window.filter((ok) => !ok).length / s.window.length;
        if (failed * 100 >= opts.threshold) {
          s.state = 'open';
          s.openUntil = s.t + opts.openFor;
          log(s, `Open — ${Math.round(failed * 100)}% of the last ${s.window.length} calls failed`);
        }
      } else if (s.state === 'open' && s.t >= s.openUntil) {
        s.state = 'half';
        s.trialsSent = 0;
        s.trialsDone = 0;
        s.trialsOk = 0;
        log(s, `Half-open — letting ${TRIALS} trial calls through`);
      } else if (s.state === 'half' && s.trialsDone >= TRIALS) {
        if (s.trialsOk === TRIALS) {
          s.state = 'closed';
          s.window = [];
          log(s, `Closed — all ${TRIALS} trial calls worked`);
        } else {
          s.state = 'open';
          s.openUntil = s.t + opts.openFor;
          log(s, `Open again — ${TRIALS - s.trialsOk} of ${TRIALS} trial calls failed`);
        }
      }
    } else if (s.state !== 'closed') {
      s.state = 'closed';
    }

    /* New requests. */
    s.arrivals += RPS * STEP;
    while (s.arrivals >= 1) {
      s.arrivals -= 1;
      let trial = false;
      if (s.state === 'open') { s.bucket.fast += 1; continue; }
      if (s.state === 'half') {
        if (s.trialsSent >= TRIALS) { s.bucket.fast += 1; continue; }
        trial = true;
      }
      if (s.busy >= POOL) { s.bucket.full += 1; continue; }
      if (trial) s.trialsSent += 1;
      s.busy += 1;
      const hangs = !Number.isFinite(dep.latency);
      const took = hangs ? opts.timeout : dep.latency;
      s.calls.push({ at: s.t + took, ok: !hangs && Math.random() >= dep.errors, trial });
    }

    if (s.t >= s.bucketEnd) {
      s.bars = [...s.bars.slice(1), s.bucket];
      s.bucket = emptyBucket();
      s.bucketEnd += BUCKET;
    }
  }
}

const STATE_LABEL = { closed: 'Closed', open: 'Open', half: 'Half-open' };

export default function CircuitBreaker() {
  const [dep, setDep] = useState('healthy');
  const [breaker, setBreaker] = useState(true);
  const [timeout, setTimeoutS] = useState(2);
  const [threshold, setThreshold] = useState(50);
  const [openFor, setOpenFor] = useState(4);
  const [running, setRunning] = useState(true);
  const [view, setView] = useState(() => snapshot(freshSim()));

  const sim = useRef(null);
  if (!sim.current) sim.current = freshSim();
  const opts = useRef({});
  opts.current = { dep, breaker, timeout, threshold, openFor };

  useEffect(() => {
    if (!running) return undefined;
    let frame = 0;
    let last = performance.now();
    let paintAt = 0;
    const loop = (now) => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      advance(sim.current, dt, opts.current);
      if (now > paintAt) {
        paintAt = now + 90;
        setView(snapshot(sim.current));
      }
    };
    frame = requestAnimationFrame(loop);
    const onVisibility = () => { last = performance.now(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [running]);

  const reset = () => {
    sim.current = freshSim();
    setView(snapshot(sim.current));
  };

  const max = Math.max(RPS * BUCKET * 1.1, ...view.bars.map((b) => b.ok + b.failed + b.fast + b.full));
  const recent = view.bars.slice(-4);
  const poolFull = recent.some((b) => b.full > 0);
  const errors = recent.reduce((sum, b) => sum + b.failed + b.full, 0);

  let verdict;
  if (poolFull && !breaker) {
    verdict = { tone: 'bad', icon: '✗', text: <><b>The whole API is down.</b> Every thread is stuck waiting on a service that will not answer, so even requests that never touch payments are turned away. One slow dependency took everything with it.</> };
  } else if (poolFull) {
    verdict = { tone: 'warn', icon: '!', text: <><b>The pool filled up before the breaker saw enough.</b> Hung calls only count as failed when they time out. A shorter timeout makes the breaker react sooner.</> };
  } else if (view.state === 'open') {
    verdict = { tone: 'ok', icon: '✓', text: <><b>Breaker open: calls fail in 0 ms instead of waiting.</b> Threads stay free, the rest of the API keeps working, and the payment service gets room to recover. Set it back to healthy and watch it close.</> };
  } else if (view.state === 'half') {
    verdict = { tone: 'info', icon: 'ℹ︎', text: <><b>Half-open.</b> {TRIALS} trial calls go through to test whether the service is back. Everything else still fails fast.</> };
  } else if (dep !== 'healthy' && !breaker) {
    verdict = { tone: 'warn', icon: '!', text: <><b>Every call still goes to a failing service.</b> Users wait for an error, and the service never gets a break to recover. Turn the breaker on.</> };
  } else if (errors > 0 && dep !== 'healthy') {
    verdict = { tone: 'info', icon: 'ℹ︎', text: <><b>Counting failures.</b> The breaker opens when {threshold}% of the last {WINDOW} finished calls have failed.</> };
  } else {
    verdict = { tone: 'info', icon: 'ℹ︎', text: <><b>All healthy.</b> Now make the payment service fail or hang, above, and watch what happens with the breaker on — and off.</> };
  }

  return (
    <div className="tool">
      <div className="tool-stage cb-stage">
        <div className="cb-top">
          <Segmented
            label="Payment service"
            value={dep}
            onChange={setDep}
            options={[
              { value: 'healthy', label: 'Healthy' },
              { value: 'erroring', label: 'Erroring' },
              { value: 'hanging', label: 'Hanging' },
            ]}
          />
          <span className={`cb-state is-${breaker ? view.state : 'none'}`} aria-live="polite">
            <i aria-hidden="true" />
            {breaker ? `Breaker ${STATE_LABEL[view.state].toLowerCase()}` : 'No breaker'}
          </span>
        </div>

        <div className="cb-chart" role="img" aria-label="Requests per half second: succeeded, failed, failed fast by the breaker, and turned away because the pool was full.">
          {view.bars.map((b, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div className="cb-bar" key={i}>
              <b className="is-full" style={{ height: `${(b.full / max) * 100}%` }} />
              <b className="is-failed" style={{ height: `${(b.failed / max) * 100}%` }} />
              <b className="is-fast" style={{ height: `${(b.fast / max) * 100}%` }} />
              <b className="is-ok" style={{ height: `${(b.ok / max) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="cb-axis"><span>30 s ago</span><span>now · t = {view.t.toFixed(0)} s</span></div>

        <div className="cb-pool" aria-label={`Threads busy: ${view.busy} of ${POOL}`}>
          <span>Threads busy</span>
          <div className="meter"><i style={{ width: `${(view.busy / POOL) * 100}%` }} className={view.busy >= POOL ? 'is-bad' : view.busy > POOL * 0.6 ? 'is-warn' : ''} /></div>
          <strong>{view.busy} / {POOL}</strong>
        </div>
      </div>

      <div className="tool-body">
        <div className="tool-controls">
          <Switch label="Circuit breaker" checked={breaker} onChange={setBreaker} />
          <Slider label="Call timeout" value={timeout} min={0.5} max={3} step={0.5} onChange={setTimeoutS} format={(x) => `${x} s`} />
          <Slider label="Open when failed ≥" value={threshold} min={20} max={90} step={10} onChange={setThreshold} format={(x) => `${x}%`} />
          <Slider label="Stay open for" value={openFor} min={1} max={10} onChange={setOpenFor} format={(x) => `${x} s`} />
        </div>

        <div className="tool-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setRunning((v) => !v)} aria-pressed={!running}>
            {running ? 'Pause' : 'Resume'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={reset}>Reset</button>
        </div>

        <p className={`verdict is-${verdict.tone}`}>
          <span className="verdict-icon" aria-hidden="true">{verdict.icon}</span>
          <span>{verdict.text}</span>
        </p>

        {view.events.length ? (
          <ol className="cb-log" aria-label="Breaker changes">
            {view.events.map((e) => <li key={`${e.t}-${e.text}`}><code>{e.t.toFixed(1)} s</code>{e.text}</li>)}
          </ol>
        ) : null}

        <p className="legend">
          <span><i style={{ background: 'var(--ok)' }} />succeeded</span>
          <span><i style={{ background: 'var(--bad)' }} />failed after waiting</span>
          <span><i style={{ background: 'var(--fg-3)' }} />failed fast (breaker)</span>
          <span><i style={{ background: 'var(--warn)' }} />turned away — no free thread</span>
          <span>{fmt(RPS)} requests / s</span>
        </p>
      </div>
    </div>
  );
}

function snapshot(s) {
  return { t: s.t, busy: s.busy, state: s.state, bars: s.bars, events: s.events };
}
