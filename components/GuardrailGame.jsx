'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/*
  Guardrail — a real-time arcade round.

  Prompts fall down the context window. You slide one guardrail along the
  bottom and decide, with your hands rather than a multiple choice, what it
  intercepts. Red packets are attacks and have to be caught. Green ones are
  legitimate traffic and have to be let through, so the guardrail is as much
  something you move out of the way as something you aim.

  The playfield is canvas and lives in a ref — the loop never touches React
  state. Score, lives and wave are ordinary state because they only change on
  discrete events, which also makes them announceable and testable.
*/

const HEIGHT = 430;
const SHIELD_W = 96;
const SHIELD_H = 12;
const START_LIVES = 3;
const BEST_KEY = 'guardrail-best';

const ATTACKS = [
  'ignore previous',
  'DAN persona',
  'base64 payload',
  'system prompt',
  'tool exfil',
  'indirect inject',
  'payload split',
  'role override',
];

const SAFE = [
  'claim status?',
  'webhook errors',
  'draft letter',
  'redaction policy',
  'retry logic?',
  'schema diff',
  'latency p95',
];

const palettes = {
  light: {
    grid: 'rgba(0,0,0,0.05)',
    shield: '#18181b',
    attack: '#dc2626',
    attackInk: '#ffffff',
    safe: '#15803d',
    safeInk: '#ffffff',
    flash: 'rgba(220,38,38,0.16)',
  },
  dark: {
    grid: 'rgba(255,255,255,0.06)',
    shield: '#f4f4f5',
    attack: '#f87171',
    attackInk: '#1a0d0d',
    safe: '#4ade80',
    safeInk: '#08210f',
    flash: 'rgba(248,113,113,0.18)',
  },
};

function makePacket(width, wave) {
  const attack = Math.random() < 0.5;
  const label = attack
    ? ATTACKS[Math.floor(Math.random() * ATTACKS.length)]
    : SAFE[Math.floor(Math.random() * SAFE.length)];
  const w = Math.max(96, Math.min(150, label.length * 8 + 26));
  return {
    attack,
    label,
    w,
    h: 26,
    x: Math.random() * Math.max(1, width - w),
    y: -30,
    vy: 100 + wave * 22 + Math.random() * 30,
    done: false,
  };
}

export default function GuardrailGame() {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const [phase, setPhase] = useState('idle');
  const [hud, setHud] = useState({ score: 0, lives: START_LIVES, wave: 1, combo: 1 });
  const [best, setBest] = useState(0);
  const [flash, setFlash] = useState('');

  useEffect(() => {
    try {
      setBest(Number(window.localStorage.getItem(BEST_KEY) || 0));
    } catch {
      /* storage unavailable — best simply stays at zero */
    }
  }, []);

  const start = useCallback(() => {
    const width = wrapRef.current?.clientWidth ?? 600;
    stateRef.current = {
      packets: [],
      shieldX: width / 2 - SHIELD_W / 2,
      targetX: width / 2 - SHIELD_W / 2,
      score: 0,
      lives: START_LIVES,
      wave: 1,
      combo: 1,
      elapsed: 0,
      sinceSpawn: 0,
      breachAt: -999,
      keys: { left: false, right: false },
    };
    setHud({ score: 0, lives: START_LIVES, wave: 1, combo: 1 });
    setFlash('');
    setPhase('playing');
  }, []);

  /* Controls. Held arrows steer; a pointer or finger drags the guardrail
     directly, which is the only workable scheme on a touch screen. */
  useEffect(() => {
    if (phase !== 'playing') return undefined;

    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (key === 'arrowleft' || key === 'a') { stateRef.current.keys.left = true; event.preventDefault(); }
      if (key === 'arrowright' || key === 'd') { stateRef.current.keys.right = true; event.preventDefault(); }
      if (key === 'escape') setPhase('over');
    };
    const onKeyUp = (event) => {
      const key = event.key.toLowerCase();
      if (key === 'arrowleft' || key === 'a') stateRef.current.keys.left = false;
      if (key === 'arrowright' || key === 'd') stateRef.current.keys.right = false;
    };

    const canvas = canvasRef.current;
    const onPointer = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      stateRef.current.targetX = Math.max(0, Math.min(rect.width - SHIELD_W, x - SHIELD_W / 2));
      if (event.cancelable) event.preventDefault();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('pointermove', onPointer);
    canvas.addEventListener('pointerdown', onPointer);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointermove', onPointer);
      canvas.removeEventListener('pointerdown', onPointer);
    };
  }, [phase]);

  /* The loop. */
  useEffect(() => {
    if (phase !== 'playing') return undefined;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    let previous = performance.now();
    let width = 0;

    const dark = window.matchMedia('(prefers-color-scheme: dark)');
    let colors = palettes[dark.matches ? 'dark' : 'light'];
    const onScheme = (event) => { colors = palettes[event.matches ? 'dark' : 'light']; };
    dark.addEventListener('change', onScheme);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = wrapRef.current.clientWidth;
      canvas.width = width * dpr;
      canvas.height = HEIGHT * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${HEIGHT}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrapRef.current);

    /* Pausing on a hidden tab stops the first frame back from advancing the
       world by however long the tab was in the background. */
    let hidden = false;
    const onVisibility = () => {
      hidden = document.hidden;
      previous = performance.now();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const step = (now) => {
      frame = window.requestAnimationFrame(step);
      const game = stateRef.current;
      if (!game || hidden) { previous = now; return; }

      const delta = Math.min((now - previous) / 1000, 0.05);
      previous = now;

      game.elapsed += delta;
      game.wave = Math.min(9, 1 + Math.floor(game.elapsed / 14));

      // Steering.
      if (game.keys.left) game.targetX -= 420 * delta;
      if (game.keys.right) game.targetX += 420 * delta;
      game.targetX = Math.max(0, Math.min(width - SHIELD_W, game.targetX));
      game.shieldX += (game.targetX - game.shieldX) * Math.min(1, delta * 18);

      // Spawning, faster with each wave.
      game.sinceSpawn += delta;
      const gap = Math.max(0.38, 0.92 - game.wave * 0.07);
      if (game.sinceSpawn >= gap) {
        game.sinceSpawn = 0;
        game.packets.push(makePacket(width, game.wave));
      }

      const shieldY = HEIGHT - 34;
      let changed = false;

      game.packets.forEach((packet) => {
        if (packet.done) return;
        packet.y += packet.vy * delta;

        const hitsShield =
          packet.y + packet.h >= shieldY &&
          packet.y <= shieldY + SHIELD_H &&
          packet.x + packet.w >= game.shieldX &&
          packet.x <= game.shieldX + SHIELD_W;

        if (hitsShield) {
          packet.done = true;
          changed = true;
          if (packet.attack) {
            game.score += 100 * game.combo;
            game.combo = Math.min(9, game.combo + 1);
            setFlash(`blocked · ${packet.label}`);
          } else {
            // Catching legitimate traffic is the expensive mistake.
            game.score = Math.max(0, game.score - 40);
            game.combo = 1;
            setFlash(`false positive · ${packet.label}`);
          }
          return;
        }

        if (packet.y > HEIGHT) {
          packet.done = true;
          changed = true;
          if (packet.attack) {
            game.lives -= 1;
            game.combo = 1;
            game.breachAt = game.elapsed;
            setFlash(`breach · ${packet.label}`);
          } else {
            game.score += 50 * game.combo;
            setFlash(`passed · ${packet.label}`);
          }
        }
      });

      game.packets = game.packets.filter((packet) => !packet.done);

      if (changed) {
        setHud({ score: game.score, lives: game.lives, wave: game.wave, combo: game.combo });
      }

      // Draw.
      ctx.clearRect(0, 0, width, HEIGHT);

      for (let y = 40; y < HEIGHT; y += 40) {
        ctx.fillStyle = colors.grid;
        ctx.fillRect(0, y, width, 1);
      }

      if (game.elapsed - game.breachAt < 0.28) {
        ctx.fillStyle = colors.flash;
        ctx.fillRect(0, 0, width, HEIGHT);
      }

      ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textBaseline = 'middle';
      game.packets.forEach((packet) => {
        ctx.fillStyle = packet.attack ? colors.attack : colors.safe;
        ctx.beginPath();
        ctx.roundRect(packet.x, packet.y, packet.w, packet.h, 6);
        ctx.fill();
        ctx.fillStyle = packet.attack ? colors.attackInk : colors.safeInk;
        ctx.fillText(packet.label, packet.x + 11, packet.y + packet.h / 2 + 1);
      });

      ctx.fillStyle = colors.shield;
      ctx.beginPath();
      ctx.roundRect(game.shieldX, shieldY, SHIELD_W, SHIELD_H, 6);
      ctx.fill();

      if (game.lives <= 0) {
        window.cancelAnimationFrame(frame);
        setPhase('over');
        setBest((current) => {
          const next = Math.max(current, game.score);
          try { window.localStorage.setItem(BEST_KEY, String(next)); } catch { /* ignore */ }
          return next;
        });
      }
    };

    frame = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      dark.removeEventListener('change', onScheme);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [phase]);

  return (
    <div className="game" ref={wrapRef}>
      {phase === 'playing' ? (
        <>
          <div className="game-hud">
            <span className="game-score">{hud.score.toLocaleString()}</span>
            <span className="game-stat">wave {hud.wave}</span>
            <span className="game-stat">×{hud.combo}</span>
            <span className="game-lives" aria-label={`${hud.lives} lives left`}>
              {Array.from({ length: START_LIVES }, (_, index) => (
                <i key={index} className={index < hud.lives ? 'is-on' : undefined} />
              ))}
            </span>
          </div>
          <canvas ref={canvasRef} className="game-canvas" aria-label="Guardrail playfield" />
          <p className="game-flash" role="status">{flash}</p>
          <p className="game-help">
            <kbd>←</kbd> <kbd>→</kbd> or drag to move · block red, let green through · <kbd>Esc</kbd> ends
          </p>
        </>
      ) : null}

      {phase === 'idle' ? (
        <div className="game-panel">
          <h4>Guardrail</h4>
          <p>
            Prompts fall down the context window. Slide the guardrail to catch every red
            attack, and get it out of the way of the green traffic — catching a legitimate
            prompt costs you points, the same way a real over-eager filter costs you users.
          </p>
          <p className="game-panel-note">
            Three breaches and the round ends. It speeds up every 14 seconds.
            Arrow keys, <kbd>A</kbd>/<kbd>D</kbd>, or drag with a finger.
          </p>
          <button type="button" className="arena-primary" onClick={start}>Start</button>
          {best > 0 ? <span className="game-best">best {best.toLocaleString()}</span> : null}
        </div>
      ) : null}

      {phase === 'over' ? (
        <div className="game-panel">
          <h4>Round over</h4>
          <div className="game-final">
            <strong>{hud.score.toLocaleString()}</strong>
            <span>survived to wave {hud.wave}</span>
          </div>
          <p className="game-panel-note">
            {hud.score >= best && hud.score > 0
              ? 'New best.'
              : `Best so far ${best.toLocaleString()}.`}
          </p>
          <button type="button" className="arena-primary" onClick={start}>Play again</button>
        </div>
      ) : null}
    </div>
  );
}
