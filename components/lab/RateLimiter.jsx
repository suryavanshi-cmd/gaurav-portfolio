'use client';

import { useEffect, useRef, useState } from 'react';
import { Slider } from './controls';
import { useColors } from './useColors';

/*
  A token bucket, simulated.

  The bucket holds up to `capacity` tokens and refills at `refill` tokens per
  second. Requests arrive as a Poisson process at `incoming` per second — the
  gaps between them are exponentially distributed, which is what real,
  independent traffic looks like. When a request reaches the gate it takes one
  token if there is one (accepted, 200) or is turned away (rejected, 429).

  Over time the accepted rate settles at min(incoming, refill): the bucket size
  only decides how large a burst can get through at once.
*/

const HEIGHT = 250;
const SPEED = 260; // px per second along the lane

export default function RateLimiter() {
  const [capacity, setCapacity] = useState(8);
  const [refill, setRefill] = useState(3);
  const [incoming, setIncoming] = useState(6);
  const [running, setRunning] = useState(true);
  const [stats, setStats] = useState({ accepted: 0, rejected: 0, tokens: 8 });

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const colors = useColors();
  const params = useRef({ capacity, refill, incoming });
  params.current = { capacity, refill, incoming };

  const sim = useRef(null);
  if (!sim.current) {
    sim.current = { tokens: 8, reqs: [], nextArrival: 0, accepted: 0, rejected: 0, burst: [] };
  }

  /* A smaller bucket can't hold more tokens than it now allows. */
  useEffect(() => {
    sim.current.tokens = Math.min(sim.current.tokens, capacity);
  }, [capacity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let width = 0;
    let frame = 0;
    let last = performance.now();
    let sampleAt = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = wrapRef.current.clientWidth;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(HEIGHT * dpr);
      canvas.style.height = `${HEIGHT}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrapRef.current);

    const nextGap = (rate) => (rate > 0 ? -Math.log(1 - Math.random()) / rate : Infinity);

    const step = (dt) => {
      const s = sim.current;
      const { capacity: cap, refill: r, incoming: lambda } = params.current;
      const gate = width * 0.46;
      const laneY = 168;

      s.tokens = Math.min(cap, s.tokens + r * dt);

      s.nextArrival -= dt;
      if (!Number.isFinite(s.nextArrival)) s.nextArrival = nextGap(lambda);
      while (s.nextArrival <= 0) {
        s.reqs.push({ x: 14, y: laneY, vx: SPEED, vy: 0, state: 'queued', alpha: 1 });
        s.nextArrival += nextGap(lambda);
      }

      for (let i = s.burst.length - 1; i >= 0; i -= 1) {
        s.burst[i] -= dt;
        if (s.burst[i] <= 0) {
          s.reqs.push({ x: 14, y: laneY, vx: SPEED, vy: 0, state: 'queued', alpha: 1 });
          s.burst.splice(i, 1);
        }
      }

      for (const q of s.reqs) {
        if (q.state === 'queued' && q.x >= gate) {
          if (s.tokens >= 1) {
            s.tokens -= 1;
            q.state = 'ok';
            s.accepted += 1;
          } else {
            /* Turned away: it loses its forward speed and falls off the lane
               under gravity, fading as it goes. */
            q.state = 'bad';
            q.vx = SPEED * 0.35;
            q.vy = -120;
            s.rejected += 1;
          }
        }
        if (q.state === 'bad') {
          q.vy += 900 * dt;
          q.alpha -= dt * 1.4;
        }
        q.x += q.vx * dt;
        q.y += q.vy * dt;
      }

      s.reqs = s.reqs.filter((q) => q.x < width + 10 && q.alpha > 0 && q.y < HEIGHT + 10);
    };

    const draw = () => {
      const c = colors.current;
      if (!c) return;
      const s = sim.current;
      const { capacity: cap } = params.current;
      const gate = width * 0.46;
      const laneY = 168;

      ctx.clearRect(0, 0, width, HEIGHT);

      /* Lane. */
      ctx.strokeStyle = c.line;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(10, laneY);
      ctx.lineTo(width - 10, laneY);
      ctx.stroke();
      ctx.setLineDash([]);

      /* Gate. */
      ctx.strokeStyle = c.fg3;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(gate, laneY - 18);
      ctx.lineTo(gate, laneY + 18);
      ctx.stroke();

      /* Bucket, with one dot per whole token and a fill level for the fraction. */
      const bw = 104;
      const bh = 96;
      const bx = gate - bw / 2;
      const by = 22;
      ctx.fillStyle = c.elev;
      ctx.strokeStyle = c.line;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 14);
      ctx.fill();
      ctx.stroke();

      const level = s.tokens / cap;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 14);
      ctx.clip();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = c.accent;
      ctx.fillRect(bx, by + bh * (1 - level), bw, bh * level);
      ctx.restore();

      const whole = Math.floor(s.tokens);
      const perRow = 5;
      for (let i = 0; i < cap; i += 1) {
        const col = i % perRow;
        const row = Math.floor(i / perRow);
        const cx = bx + 20 + col * 16;
        const cy = by + bh - 16 - row * 16;
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        if (i < whole) {
          ctx.fillStyle = c.accent;
          ctx.fill();
        } else {
          ctx.strokeStyle = c.line;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      ctx.fillStyle = c.fg3;
      ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TOKEN BUCKET', gate, by - 7);
      ctx.textAlign = 'left';
      ctx.fillText('CLIENTS', 10, laneY + 36);
      ctx.textAlign = 'right';
      ctx.fillStyle = c.ok;
      ctx.fillText('200 → API', width - 10, laneY + 36);
      ctx.fillStyle = c.bad;
      ctx.fillText('429 TOO MANY', gate + 120, HEIGHT - 12);

      /* Requests. */
      for (const q of s.reqs) {
        ctx.globalAlpha = Math.max(0, q.alpha);
        ctx.fillStyle = q.state === 'ok' ? c.ok : q.state === 'bad' ? c.bad : c.fg3;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now) => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      if (running) step(dt);
      draw();
      if (now > sampleAt) {
        sampleAt = now + 200;
        const s = sim.current;
        setStats({ accepted: s.accepted, rejected: s.rejected, tokens: s.tokens });
      }
    };
    frame = requestAnimationFrame(loop);

    const onVisibility = () => { last = performance.now(); };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [running, colors]);

  const burst = () => {
    for (let i = 0; i < 15; i += 1) sim.current.burst.push(i * 0.035);
    if (!running) setRunning(true);
  };

  const reset = () => {
    sim.current = { tokens: capacity, reqs: [], nextArrival: 0, accepted: 0, rejected: 0, burst: [] };
    setStats({ accepted: 0, rejected: 0, tokens: capacity });
  };

  const total = stats.accepted + stats.rejected;
  const rate = total ? Math.round((stats.accepted / total) * 100) : 100;
  const longRun = Math.min(incoming, refill);

  return (
    <div className="tool">
      <div className="tool-stage" ref={wrapRef}>
        <canvas ref={canvasRef} role="img" aria-label={`Token bucket simulation: ${stats.accepted} accepted, ${stats.rejected} rejected`} />
      </div>
      <div className="tool-body">
        <div className="tool-controls">
          <Slider label="Bucket size (burst)" value={capacity} min={1} max={20} onChange={setCapacity} format={(v) => `${v} tokens`} />
          <Slider label="Refill rate (limit)" value={refill} min={0.5} max={10} step={0.5} onChange={setRefill} format={(v) => `${v} / s`} />
          <Slider label="Incoming traffic" value={incoming} min={0} max={20} step={0.5} onChange={setIncoming} format={(v) => `${v} req / s`} />
        </div>

        <div className="tool-actions">
          <button type="button" className="btn btn-primary" onClick={burst}>Send a burst of 15</button>
          <button type="button" className="btn btn-ghost" onClick={() => setRunning((v) => !v)} aria-pressed={!running}>
            {running ? 'Pause' : 'Play'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={reset}>Reset</button>
        </div>

        <div className="readouts" aria-live="polite">
          <div className="readout"><span>Accepted (200)</span><strong className="is-ok">{stats.accepted}</strong></div>
          <div className="readout"><span>Rejected (429)</span><strong className="is-bad">{stats.rejected}</strong></div>
          <div className="readout"><span>Let through</span><strong>{rate}%</strong></div>
          <div className="readout"><span>Tokens now</span><strong>{stats.tokens.toFixed(1)}</strong></div>
        </div>

        <p className="verdict is-info">
          <span className="verdict-icon" aria-hidden="true">ℹ︎</span>
          <span>
            In the long run this lets through <b>{longRun} requests a second</b> — the lower of the traffic and the refill
            rate. The bucket size only decides how big a burst gets through before the 429s start.
          </span>
        </p>
      </div>
    </div>
  );
}
