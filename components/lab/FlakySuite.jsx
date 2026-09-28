'use client';

import { useMemo, useState } from 'react';
import { Slider, Switch } from './controls';

/*
  A CI test suite, run 20 times.

  48 tests, each one a fixed type:

    timing (12)   waits for something to be ready. With Thread.sleep(3000) it
                  always costs 3 s, and fails when "ready" takes longer than
                  that (7% of the time). Waiting for the condition costs only
                  as long as it takes, and never fails on time.
    shared (8)    reads data another test also writes. Alone, it passes. Run
                  in parallel, it fails 20% of the time — unless each test
                  creates its own data.
    bug (1)       a real race condition in the app. Fails 25% of runs, no
                  matter what. This is the one the suite exists to catch.
    stable (27)   just passes.

  A failed test is retried up to `retries` times, each try drawing fresh luck.
  Tests are handed out to the least-busy worker; the build takes as long as
  the busiest worker.

  Everything is seeded, so the same settings give the same 20 builds until
  you press "Run again" — changing a switch changes only what the switch does.
*/

const BUILDS = 20;
const SLEEP = 3;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TESTS = (() => {
  const rng = mulberry32(7);
  const kinds = [
    ...Array(12).fill('timing'),
    ...Array(8).fill('shared'),
    'bug',
    ...Array(27).fill('stable'),
  ];
  /* Shuffle once so the types are spread through the suite, as they are in
     real life. */
  for (let i = kinds.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }
  return kinds.map((kind, i) => ({ id: i, kind, base: 0.15 + rng() * 0.85 }));
})();

function attempt(test, opts, rng) {
  switch (test.kind) {
    case 'timing': {
      const ready = rng() < 0.07 ? SLEEP + 0.2 + rng() * 2 : 0.1 + rng() * 0.6;
      return opts.wait
        ? { d: test.base + ready, fail: false }
        : { d: test.base + SLEEP, fail: ready > SLEEP };
    }
    case 'shared':
      return { d: test.base, fail: opts.workers > 1 && !opts.ownData && rng() < 0.2 };
    case 'bug':
      return { d: test.base, fail: rng() < 0.25 };
    default:
      return { d: test.base, fail: false };
  }
}

function runBuild(opts, seed) {
  const rng = mulberry32(seed);
  const load = Array(opts.workers).fill(0);
  const blocks = [];
  let retries = 0;
  let failed = 0;
  let bugFailedOnce = false;
  let bugReported = false;
  const flakes = { timing: 0, shared: 0 };

  for (const test of TESTS) {
    const w = load.indexOf(Math.min(...load));
    let passed = false;
    for (let tries = 0; tries <= opts.retries; tries += 1) {
      const a = attempt(test, opts, rng);
      blocks.push({ worker: w, start: load[w], d: a.d, fail: a.fail, kind: test.kind, retry: tries > 0 });
      load[w] += a.d;
      if (tries > 0) retries += 1;
      if (a.fail && test.kind === 'bug') bugFailedOnce = true;
      if (a.fail && test.kind in flakes) flakes[test.kind] += 1;
      if (!a.fail) { passed = true; break; }
    }
    if (!passed) {
      failed += 1;
      if (test.kind === 'bug') bugReported = true;
    }
  }

  return {
    blocks,
    wall: Math.max(...load),
    retries,
    failed,
    flakes,
    green: failed === 0,
    bugShowed: bugFailedOnce,
    bugHidden: bugFailedOnce && !bugReported,
  };
}

const COLORS = {
  ok: 'var(--ok)',
  bad: 'var(--bad)',
};

export default function FlakySuite() {
  const [wait, setWait] = useState(false);
  const [ownData, setOwnData] = useState(false);
  const [workers, setWorkers] = useState(4);
  const [retries, setRetries] = useState(2);
  const [seed, setSeed] = useState(1);
  const [picked, setPicked] = useState(BUILDS - 1);

  const builds = useMemo(() => {
    const opts = { wait, ownData, workers, retries };
    return Array.from({ length: BUILDS }, (_, i) => runBuild(opts, seed * 1000 + i));
  }, [wait, ownData, workers, retries, seed]);

  const build = builds[picked];
  const green = builds.filter((b) => b.green).length;
  const avgTime = builds.reduce((sum, b) => sum + b.wall, 0) / BUILDS;
  const totalRetries = builds.reduce((sum, b) => sum + b.retries, 0);
  const bugShowed = builds.filter((b) => b.bugShowed).length;
  const bugHidden = builds.filter((b) => b.bugHidden).length;
  const timingFlakes = builds.reduce((sum, b) => sum + b.flakes.timing, 0);
  const sharedFlakes = builds.reduce((sum, b) => sum + b.flakes.shared, 0);

  let verdict;
  if (bugHidden > 0 && retries > 1) {
    verdict = {
      tone: 'bad',
      icon: '!',
      text: <><b>Retries hid a real bug.</b> The race condition failed in {bugShowed} of {BUILDS} builds, and a retry turned it green {bugHidden} {bugHidden === 1 ? 'time' : 'times'}. Allow one retry at most, and count every one.</>,
    };
  } else if (timingFlakes > 0) {
    verdict = {
      tone: 'warn',
      icon: '!',
      text: <><b>Sleep makes it slow and flaky.</b> Each timing test waits a fixed 3 s, and still failed {timingFlakes} {timingFlakes === 1 ? 'time' : 'times'} when the app took longer. Turn on “wait for the condition”.</>,
    };
  } else if (sharedFlakes > 0) {
    verdict = {
      tone: 'warn',
      icon: '!',
      text: <><b>Tests are sharing data.</b> {sharedFlakes} failures came from tests that pass alone but fail in parallel — try 1 worker and watch them go quiet. Turn on “each test owns its data”.</>,
    };
  } else if (!wait) {
    verdict = {
      tone: 'warn',
      icon: '!',
      text: <><b>Green, but slow.</b> Twelve tests sleep for 3 s whether they need to or not. Waiting for the condition cuts that to what they actually need.</>,
    };
  } else if (bugHidden > 0) {
    verdict = {
      tone: 'warn',
      icon: '!',
      text: <><b>No more noise — but watch the retry.</b> Even one retry turned the real bug green {bugHidden} {bugHidden === 1 ? 'time' : 'times'}. That is why every retry is counted: a test that needed one did not really pass.</>,
    };
  } else {
    verdict = {
      tone: 'ok',
      icon: '✓',
      text: bugShowed
        ? <><b>Red means red again.</b> Every red build ({BUILDS - green}) is the real bug — found in {bugShowed} of {BUILDS} runs. Nothing else fails, so nobody reruns and hopes.</>
        : <><b>All green, and honest.</b> The real bug did not show up in these 20 runs. Press “Run again”.</>,
    };
  }

  const lanes = Array.from({ length: workers }, (_, w) => build.blocks.filter((b) => b.worker === w));
  const replay = `${seed}-${picked}-${wait}-${ownData}-${workers}-${retries}`;

  return (
    <div className="tool">
      <div className="tool-stage flaky-stage">
        <div className="flaky-head">
          <span>Build {picked + 1} of {BUILDS} · {build.wall.toFixed(1)} s</span>
          <span className={build.green ? 'is-ok' : 'is-bad'}>{build.green ? '✓ Passed' : `✗ ${build.failed} failed`}</span>
        </div>
        <div className="gantt" key={replay} aria-label={`Build ${picked + 1}: ${workers} workers, ${build.wall.toFixed(1)} seconds`} role="img">
          {lanes.map((lane, w) => (
            // eslint-disable-next-line react/no-array-index-key
            <div className="gantt-lane" key={w}>
              <span className="gantt-label">W{w + 1}</span>
              <div className="gantt-track">
                {lane.map((b, i) => (
                  <i
                    // eslint-disable-next-line react/no-array-index-key
                    key={i}
                    className={`${b.kind === 'bug' ? 'is-bug' : ''} ${b.retry ? 'is-retry' : ''}`}
                    style={{
                      left: `${(b.start / build.wall) * 100}%`,
                      width: `${(b.d / build.wall) * 100}%`,
                      background: b.fail ? COLORS.bad : COLORS.ok,
                      animationDelay: `${(b.start / build.wall) * 1.1}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="builds" role="group" aria-label="Builds — pick one to see it">
          {builds.map((b, i) => (
            <button
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              type="button"
              className={`${b.green ? 'is-ok' : 'is-bad'} ${b.bugHidden ? 'is-hidden' : ''} ${i === picked ? 'is-on' : ''}`}
              onClick={() => setPicked(i)}
              aria-pressed={i === picked}
              aria-label={`Build ${i + 1}: ${b.green ? 'passed' : 'failed'}${b.bugHidden ? ', real bug hidden by a retry' : ''}`}
            />
          ))}
        </div>
      </div>

      <div className="tool-body">
        <div className="tool-controls">
          <Switch label="Wait for the condition (no sleep)" checked={wait} onChange={setWait} />
          <Switch label="Each test owns its data" checked={ownData} onChange={setOwnData} />
          <Slider label="Parallel workers" value={workers} min={1} max={8} onChange={setWorkers} format={(x) => `${x}`} />
          <Slider label="Retries per failed test" value={retries} min={0} max={3} onChange={setRetries} format={(x) => `${x}`} />
        </div>

        <div className="tool-actions">
          <button type="button" className="btn btn-primary" onClick={() => { setSeed((s) => s + 1); setPicked(BUILDS - 1); }}>
            Run 20 builds again
          </button>
        </div>

        <div className="readouts" aria-live="polite">
          <div className="readout"><span>Green builds</span><strong className={green === BUILDS ? 'is-ok' : ''}>{green} / {BUILDS}</strong></div>
          <div className="readout"><span>Average build</span><strong>{avgTime.toFixed(1)} s</strong></div>
          <div className="readout"><span>Retries used</span><strong className={totalRetries ? 'is-warn' : ''}>{totalRetries}</strong></div>
          <div className="readout"><span>Real bug hidden</span><strong className={bugHidden ? 'is-bad' : 'is-ok'}>{bugHidden} / {bugShowed}</strong></div>
        </div>

        <p className={`verdict is-${verdict.tone}`}>
          <span className="verdict-icon" aria-hidden="true">{verdict.icon}</span>
          <span>{verdict.text}</span>
        </p>

        <p className="legend">
          <span><i style={{ background: 'var(--ok)' }} />passed</span>
          <span><i style={{ background: 'var(--bad)' }} />failed</span>
          <span><i className="legend-retry" />retry</span>
          <span><i className="legend-bug" />the real bug</span>
          <span><i className="legend-hidden" />build where a retry hid it</span>
        </p>
      </div>
    </div>
  );
}
