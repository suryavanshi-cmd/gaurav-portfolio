'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { GRAPH_LEVELS, runGraph } from './graphLevels';

/*
  "Wire the agent": a LangGraph puzzle.

  Each level shows a small graph with some arrows missing. The player picks
  where each open arrow goes, then runs the level's tests: every test input
  walks through the graph step by step, a dot moving from node to node, and
  passes or fails with a plain sentence. All tests green solves the level.
*/

const STORE = 'graph-game';
const NODE_W = 104;
const NODE_H = 36;

function load() {
  try { return JSON.parse(window.localStorage.getItem(STORE)) || {}; } catch { return {}; }
}
function save(value) {
  try { window.localStorage.setItem(STORE, JSON.stringify(value)); } catch { /* not saved */ }
}

const labelOf = (level, id) => (id === 'END' ? 'END' : id === 'START' ? 'START' : level.nodes[id].label);
const posOf = (level, id) => level.points[id] || level.nodes[id].pos;

/* A curved arrow between two node centres. Two arrows between the same pair
   bend to opposite sides because their direction is opposite. */
function Arrow({ from, to, label, dashed, hot }) {
  if (from[0] === to[0] && from[1] === to[1]) {
    const [x, y] = from;
    const d = `M ${x + NODE_W / 2 - 8} ${y - 8} C ${x + NODE_W / 2 + 40} ${y - 44}, ${x + NODE_W / 2 + 40} ${y + 44}, ${x + NODE_W / 2 - 8} ${y + 8}`;
    return (
      <g className={`gg-edge ${dashed ? 'is-cond' : ''} ${hot ? 'is-hot' : ''}`}>
        <path d={d} markerEnd="url(#gg-head)" />
        {label ? <text x={x + NODE_W / 2 + 36} y={y + 4}>{label}</text> : null}
      </g>
    );
  }
  const [x1, y1] = from;
  const [x2, y2] = to;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  /* Stop at the node's edge rather than its centre. */
  const pad = (u) => Math.min(Math.abs((NODE_W / 2 + 4) / (u.x || 1e-6)), Math.abs((NODE_H / 2 + 5) / (u.y || 1e-6)));
  const u = { x: dx / len, y: dy / len };
  const cut = pad(u);
  const sx = x1 + u.x * cut;
  const sy = y1 + u.y * cut;
  const ex = x2 - u.x * cut;
  const ey = y2 - u.y * cut;
  const bend = 18;
  const cx = (sx + ex) / 2 - u.y * bend;
  const cy = (sy + ey) / 2 + u.x * bend;
  return (
    <g className={`gg-edge ${dashed ? 'is-cond' : ''} ${hot ? 'is-hot' : ''}`}>
      <path d={`M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`} markerEnd="url(#gg-head)" />
      {label ? <text x={cx - u.y * 6} y={cy + u.x * 6 + 3}>{label}</text> : null}
    </g>
  );
}

export default function GraphGame() {
  const [levelIndex, setLevelIndex] = useState(0);
  const [wirings, setWirings] = useState({});
  const [progress, setProgress] = useState({});
  const [run, setRun] = useState(null);       // { results, testIndex, step, done }
  const [attempts, setAttempts] = useState({});
  const [showHint, setShowHint] = useState(false);
  const timers = useRef([]);

  useEffect(() => { setProgress(load()); }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const level = GRAPH_LEVELS[levelIndex];
  const wiring = wirings[level.id] || {};
  const ready = level.slots.every((slot) => wiring[`${slot.from}:${slot.route}`]);

  const stop = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const pickLevel = (i) => { stop(); setRun(null); setShowHint(false); setLevelIndex(i); };

  const wire = (slot, target) => {
    stop();
    setRun(null);
    setWirings((w) => ({ ...w, [level.id]: { ...(w[level.id] || {}), [`${slot.from}:${slot.route}`]: target } }));
  };

  const start = () => {
    stop();
    const results = level.tests.map((test) => ({ test, ...runGraph(level, wiring, test) }));
    const tries = (attempts[level.id] || 0) + 1;
    setAttempts((a) => ({ ...a, [level.id]: tries }));
    const solved = results.every((r) => !r.error);
    const finish = () => {
      setRun({ results, testIndex: results.length - 1, step: Infinity, done: true, solved });
      if (solved && !progress[level.id]) {
        const stars = tries === 1 ? 3 : tries === 2 ? 2 : 1;
        const next = { ...progress, [level.id]: stars };
        setProgress(next);
        save(next);
      }
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }

    /* Play each test's path, one step every 480 ms, a short beat between tests. */
    let t = 0;
    results.forEach((r, testIndex) => {
      r.path.forEach((_, step) => {
        timers.current.push(setTimeout(() => setRun({ results, testIndex, step, done: false }), t));
        t += r.path[step].pause ? 1100 : 480;
      });
      t += 300;
    });
    timers.current.push(setTimeout(finish, t));
  };

  const current = run ? run.results[run.testIndex] : null;
  const activeId = current && run.step !== Infinity ? current.path[Math.min(run.step, current.path.length - 1)]?.node : null;
  const activePause = current && run.step !== Infinity ? current.path[Math.min(run.step, current.path.length - 1)]?.pause : false;
  const prevId = current && run.step > 0 && run.step !== Infinity ? current.path[run.step - 1]?.node : null;

  const arrows = useMemo(() => {
    const list = [{ from: 'START', to: level.entry, fixed: true }];
    Object.entries(level.edges).forEach(([from, to]) => list.push({ from, to, fixed: true }));
    level.slots.forEach((slot) => {
      const to = wiring[`${slot.from}:${slot.route}`];
      if (to) list.push({ from: slot.from, to, label: slot.route.replace('_', ' '), fixed: false });
    });
    return list;
  }, [level, wiring]);

  const dot = activeId ? posOf(level, activeId) : null;
  const allIds = ['START', ...Object.keys(level.nodes), 'END'];
  const solvedCount = GRAPH_LEVELS.filter((l) => progress[l.id]).length;

  return (
    <div className="tool gg">
      <div className="gg-levels" role="group" aria-label="Levels">
        {GRAPH_LEVELS.map((l, i) => (
          <button key={l.id} type="button" className={`${i === levelIndex ? 'is-on' : ''} ${progress[l.id] ? 'is-done' : ''}`} onClick={() => pickLevel(i)} aria-pressed={i === levelIndex}>
            <b>{progress[l.id] ? '★'.repeat(progress[l.id]) : i + 1}</b>
            <span>{l.title}</span>
          </button>
        ))}
      </div>

      <div className="gg-main">
        <div className="gg-stage">
          <p className="gg-goal"><b>Goal</b>{level.goal}</p>
          <svg className="gg-svg" viewBox={`0 0 320 ${level.height}`} role="img" aria-label={`Graph for level ${levelIndex + 1}`}>
            <defs>
              <marker id="gg-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" />
              </marker>
            </defs>
            {arrows.map((a) => (
              <Arrow
                key={`${a.from}-${a.to}-${a.label || ''}`}
                from={posOf(level, a.from)}
                to={posOf(level, a.to)}
                label={a.label}
                dashed={!a.fixed}
                hot={prevId === a.from && activeId === a.to}
              />
            ))}
            {allIds.map((id) => {
              const [x, y] = posOf(level, id);
              const terminal = id === 'START' || id === 'END';
              const w = terminal ? 70 : NODE_W;
              return (
                <g key={id} className={`gg-node ${terminal ? 'is-term' : ''} ${activeId === id ? 'is-active' : ''} ${activeId === id && activePause ? 'is-paused' : ''}`}>
                  <rect x={x - w / 2} y={y - NODE_H / 2} width={w} height={NODE_H} rx={terminal ? 18 : 11} />
                  <text x={x} y={y + 4.5}>{activeId === id && activePause ? '⏸ waiting…' : labelOf(level, id)}</text>
                </g>
              );
            })}
            {dot ? <circle className="gg-dot" r="6" style={{ transform: `translate(${dot[0]}px, ${dot[1] - NODE_H / 2 - 2}px)` }} /> : null}
          </svg>
        </div>

        <div className="gg-side">
          <h3 className="gg-h">Connect the arrows</h3>
          <div className="gg-slots">
            {level.slots.map((slot) => {
              const key = `${slot.from}:${slot.route}`;
              return (
                <div key={key} className="gg-slot">
                  <p>After <b>{labelOf(level, slot.from)}</b>, {slot.when}, go to:</p>
                  <div className="gg-choices">
                    {slot.options.map((opt) => (
                      <button key={opt} type="button" className={wiring[key] === opt ? 'is-on' : ''} onClick={() => wire(slot, opt)} aria-pressed={wiring[key] === opt}>
                        {labelOf(level, opt)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="gg-actions">
            <button type="button" className="btn btn-primary" onClick={start} disabled={!ready || (run && !run.done)}>
              {run && !run.done ? 'Running…' : `Run ${level.tests.length} ${level.tests.length === 1 ? 'test' : 'tests'}`}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowHint((v) => !v)} aria-expanded={showHint}>Hint</button>
          </div>
          {!ready ? <p className="gg-note">Pick a target for every arrow to run the tests.</p> : null}
          {showHint ? <p className="gg-hint">{level.hint}</p> : null}
        </div>
      </div>

      {run ? (
        <div className="gg-results" aria-live="polite">
          {run.results.map((r, i) => {
            const shown = run.done || i < run.testIndex;
            const playing = !run.done && i === run.testIndex;
            const steps = playing ? r.path.slice(0, run.step + 1) : r.path;
            return (
              <div key={r.test.name} className={`gg-test ${shown ? (r.error ? 'is-bad' : 'is-ok') : ''} ${playing ? 'is-playing' : ''}`}>
                <div className="gg-test-head">
                  <span className="gg-test-mark" aria-hidden="true">{shown ? (r.error ? '✗' : '✓') : '…'}</span>
                  <b>{r.test.name}</b>
                </div>
                {(shown || playing) ? (
                  <ol className="gg-path">
                    {steps.map((p, j) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <li key={j}><code>{labelOf(level, p.node)}</code>{p.log ? <span>{p.log}</span> : null}</li>
                    ))}
                  </ol>
                ) : null}
                {shown && r.error ? <p className="gg-why">{r.error}</p> : null}
              </div>
            );
          })}

          {run.done ? (
            run.solved ? (
              <div className="gg-win">
                <p className="gg-stars" aria-label={`${progress[level.id] || 1} stars`}>{'★'.repeat(progress[level.id] || 1)}</p>
                <p><b>Level solved.</b> {level.lesson}</p>
                {levelIndex < GRAPH_LEVELS.length - 1 ? (
                  <button type="button" className="btn btn-primary" onClick={() => pickLevel(levelIndex + 1)}>Next level ›</button>
                ) : (
                  <p className="gg-note">That’s every level — {solvedCount} of {GRAPH_LEVELS.length} solved. You just built the four patterns most LangGraph agents are made of.</p>
                )}
              </div>
            ) : (
              <p className="verdict is-bad"><span className="verdict-icon" aria-hidden="true">✗</span><span><b>Not yet.</b> Change an arrow and run the tests again. Stuck? Tap “Hint”.</span></p>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
