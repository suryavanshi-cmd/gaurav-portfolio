'use client';

import { useEffect, useRef, useState } from 'react';
import { RaftCluster } from '../../lib/raft.mjs';

/*
  The Raft cluster in lib/raft.mjs, drawn live: five servers in a ring,
  messages flying between them, each server's log underneath. Tap a server
  to crash or restart it; split the network; send client requests. The
  safety checks from the test suite run on every step here too.
*/

const R = 132;
const C = 200;
const pos = (i, n) => {
  const a = (-90 + (360 / n) * i) * (Math.PI / 180);
  return [C + R * Math.cos(a), C + R * Math.sin(a)];
};
const termColor = (term) => `hsl(${(term * 67) % 360} 70% 55%)`;

function snapshot(c) {
  return {
    time: c.time,
    nodes: c.nodes.map((n) => ({
      ...n,
      log: n.log.map((e) => ({ ...e })),
      votes: n.votes.size,
      timerLeft: n.role === 'leader' || !n.alive ? 0 : Math.max(0, (n.deadline - c.time) / n.timeout),
    })),
    msgs: c.queue.map((m) => ({ id: m.id, from: m.from, to: m.to, type: m.type, dropped: m.dropped, big: m.type === 'AppendEntries' && m.body.entries.length > 0, p: Math.min(1, (c.time - m.sentAt) / (m.deliverAt - m.sentAt)) })),
    events: c.events.slice(0, 7),
    groups: c.groups ? c.groups.map((g) => [...g]) : null,
    violations: c.violations.length,
    leader: c.leader(),
  };
}

export default function RaftDemo() {
  const cluster = useRef(null);
  const [view, setView] = useState(null);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(0.3);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const [seed, setSeed] = useState(1);

  if (!cluster.current) cluster.current = new RaftCluster({ seed });

  useEffect(() => {
    setView(snapshot(cluster.current));
    if (!running) return undefined;
    let frame = 0;
    let last = performance.now();
    let carry = 0;
    const loop = (now) => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min(now - last, 100);
      last = now;
      carry += dt * speedRef.current;
      const ms = Math.floor(carry);
      carry -= ms;
      if (ms > 0) {
        cluster.current.run(ms);
        setView(snapshot(cluster.current));
      }
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [running, seed]);

  const act = (fn) => { fn(cluster.current); setView(snapshot(cluster.current)); };
  const reset = () => { cluster.current = new RaftCluster({ seed: seed + 1 }); setSeed((s) => s + 1); };

  if (!view) return <div className="tool" style={{ minHeight: 480 }} aria-busy="true" />;

  const n = view.nodes.length;
  const leader = view.leader;
  const maxLen = Math.max(8, ...view.nodes.map((x) => x.log.length));
  const from = Math.max(0, maxLen - 14);
  const split = Boolean(view.groups);
  const sameSide = (a, b) => !view.groups || view.groups.some((g) => g.includes(a) && g.includes(b));

  return (
    <div className="tool raft">
      <div className="raft-status" aria-live="polite">
        <span className={`raft-pill ${leader ? 'is-ok' : 'is-warn'}`}>
          {leader ? <>Leader <b>{leader.name}</b> · term {leader.term}</> : 'No leader — election running'}
        </span>
        <span className="raft-pill">t = {(view.time / 1000).toFixed(1)} s</span>
        <span className={`raft-pill ${view.violations ? 'is-bad' : 'is-ok'}`}>{view.violations ? `${view.violations} safety violations` : 'Safety checks: all passing'}</span>
      </div>

      <div className="raft-main">
        <svg className="raft-svg" viewBox="0 0 400 400" role="img" aria-label={`Raft cluster of ${n} servers. ${leader ? `${leader.name} leads term ${leader.term}.` : 'No leader.'}`}>
          {view.nodes.map((a, i) => view.nodes.slice(i + 1).map((b) => {
            const [x1, y1] = pos(a.id, n);
            const [x2, y2] = pos(b.id, n);
            return <line key={`${a.id}-${b.id}`} x1={x1} y1={y1} x2={x2} y2={y2} className={`raft-link ${sameSide(a.id, b.id) ? '' : 'is-cut'}`} />;
          }))}
          {view.msgs.map((m) => {
            const [x1, y1] = pos(m.from, n);
            const [x2, y2] = pos(m.to, n);
            const p = m.dropped ? Math.min(m.p, 0.45) : m.p;
            return (
              <circle
                key={m.id}
                cx={x1 + (x2 - x1) * p}
                cy={y1 + (y2 - y1) * p}
                r={m.big ? 6.5 : m.type === 'AppendEntries' ? 4.5 : 3.5}
                className={`raft-msg is-${m.type} ${m.dropped ? 'is-dropped' : ''}`}
              />
            );
          })}
          {view.nodes.map((node) => {
            const [x, y] = pos(node.id, n);
            const circ = 2 * Math.PI * 41;
            return (
              <g key={node.id} className={`raft-node is-${node.alive ? node.role : 'dead'}`} onClick={() => act((c) => (node.alive ? c.crash(node.id) : c.restart(node.id)))} role="button" tabIndex={0} aria-label={`${node.name}: ${node.alive ? node.role : 'crashed'}. ${node.alive ? 'Crash it' : 'Restart it'}.`} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act((c) => (node.alive ? c.crash(node.id) : c.restart(node.id))); } }}>
                {node.alive && node.role !== 'leader' ? (
                  <circle cx={x} cy={y} r="41" className="raft-timer" style={{ strokeDasharray: `${circ * node.timerLeft} ${circ}` }} transform={`rotate(-90 ${x} ${y})`} />
                ) : null}
                <circle cx={x} cy={y} r="33" className="raft-body" />
                <text x={x} y={y - 4} className="raft-name">{node.alive ? node.name : '✕'}</text>
                <text x={x} y={y + 13} className="raft-term">{node.alive ? `term ${node.term}` : node.name}</text>
              </g>
            );
          })}
        </svg>

        <div className="raft-side">
          <div className="raft-actions">
            <button type="button" className="btn btn-primary" onClick={() => act((c) => c.request())} disabled={!leader}>Send a request</button>
            <button type="button" className="btn btn-ghost" onClick={() => act((c) => leader && c.crash(leader.id))} disabled={!leader}>Crash the leader</button>
            <button type="button" className="btn btn-ghost" onClick={() => act((c) => (split ? c.heal() : c.partition(leader ? [leader.id, (leader.id + 1) % n] : [0, 1])))}>
              {split ? 'Heal the network' : 'Split the network'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setRunning((v) => !v)} aria-pressed={!running}>{running ? 'Pause' : 'Play'}</button>
            <button type="button" className="btn btn-ghost" onClick={reset}>Reset</button>
          </div>
          <label className="raft-speed">
            <span>Speed</span>
            <input type="range" className="range" min="0.05" max="1" step="0.05" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} style={{ '--fill': `${((speed - 0.05) / 0.95) * 100}%` }} />
            <output>{speed.toFixed(2)}×</output>
          </label>
          <ol className="raft-events">
            {view.events.map((e, i) => <li key={`${e.t}-${i}`}><code>{(e.t / 1000).toFixed(2)}s</code>{e.text}</li>)}
          </ol>
        </div>
      </div>

      <div className="raft-logs" role="table" aria-label="Each server's log">
        <div className="raft-log-row raft-log-head" role="row">
          <span role="columnheader">Log</span>
          {Array.from({ length: maxLen - from }, (_, i) => <span key={i} role="columnheader">{from + i + 1}</span>)}
        </div>
        {view.nodes.map((node) => (
          <div key={node.id} className={`raft-log-row ${node.alive ? '' : 'is-dead'}`} role="row">
            <span role="rowheader">{node.name}{node.role === 'leader' && node.alive ? ' ★' : ''}</span>
            {Array.from({ length: maxLen - from }, (_, i) => {
              const idx = from + i;
              const e = node.log[idx];
              if (!e) return <span key={i} className="raft-cell is-empty" role="cell" />;
              const committed = idx < node.commitIndex;
              return (
                <span key={i} role="cell" className={`raft-cell ${committed ? 'is-committed' : ''}`} style={{ '--term': termColor(e.term) }} title={`${e.cmd} · term ${e.term}${committed ? ' · committed' : ''}`}>
                  {e.term}
                </span>
              );
            })}
          </div>
        ))}
      </div>

      <p className="legend">
        <span><i style={{ background: 'var(--warn)' }} />vote messages</span>
        <span><i style={{ background: 'var(--accent)' }} />append / heartbeat (bigger = carries entries)</span>
        <span>Log cells show the term; filled = committed. Tap a server to crash or restart it.</span>
      </p>
    </div>
  );
}
