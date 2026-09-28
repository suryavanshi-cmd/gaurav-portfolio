'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/*
  The background: a grid of dots, each tied to its home position by a damped
  spring.

  Per frame, every dot integrates three forces:
    spring   F = -k·(x − home) − c·v      Hooke's law with damping. c is under
                                          the critical value 2√k, so a pushed
                                          dot overshoots once and settles.
    pointer  F = s·(1 − d/R)² · û         Pushes dots out of a radius around
                                          the cursor or finger, strongest close in.
    wave     an outward impulse on the ring of a shockwave expanding from each
             click or tap, fading with age.
  plus a slow travelling "wind" so the field is never dead on a touch screen,
  where there is no hover to disturb it.

  A dot's brightness and size follow how far it has been displaced, and
  neighbours that are both disturbed are joined by a faint line, so a push reads
  as a ripple through a mesh rather than as dots sliding about.

  Costs: positions live in typed arrays and the loop never touches React state.
  It pauses on a hidden tab, rebuilds only on resize, and with reduced motion it
  draws the grid once and never animates.
*/

const K = 62;          // spring stiffness
const C = 8.5;         // damping (critical would be 2·√K ≈ 15.7)
const RADIUS = 150;    // pointer influence radius, px
const PUSH = 2600;     // pointer strength
const WAVE_SPEED = 820;
const WAVE_BAND = 70;
const WAVE_LIFE = 1.5;
const WIND = 150;

/* How present the field is on each kind of page. Reading pages get a whisper;
   the home hero gets all of it, fading as the reader scrolls into the content. */
function baseIntensity(pathname) {
  if (pathname === '/') return 1;
  if (pathname.startsWith('/blog')) return 0.22;
  if (pathname.startsWith('/lab')) return 0.6;
  return 0.45;
}

function readColors() {
  const style = getComputedStyle(document.documentElement);
  const ink = style.getPropertyValue('--field-ink').trim() || '29 29 31';
  const accent = style.getPropertyValue('--field-accent').trim() || '0 113 227';
  const dark = style.getPropertyValue('color-scheme').includes('dark');
  return { ink: ink.split(/\s+/).join(','), accent: accent.split(/\s+/).join(','), dark };
}

export default function PhysicsField() {
  const canvasRef = useRef(null);
  const pathname = usePathname();
  const pathRef = useRef(pathname);

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let count = 0;
    let hx; let hy; let px; let py; let vx; let vy;
    let colors = readColors();

    const pointer = { x: -9999, y: -9999, active: false };
    const waves = [];
    let frame = 0;
    let last = performance.now();
    let clock = 0;
    let running = false;

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      /* Coarser on small screens: fewer dots, and each one reads larger. */
      const gap = width < 640 ? 34 : 30;
      cols = Math.ceil(width / gap) + 1;
      rows = Math.ceil(height / gap) + 1;
      count = cols * rows;
      const offX = (width - (cols - 1) * gap) / 2;
      const offY = (height - (rows - 1) * gap) / 2;

      hx = new Float32Array(count);
      hy = new Float32Array(count);
      px = new Float32Array(count);
      py = new Float32Array(count);
      vx = new Float32Array(count);
      vy = new Float32Array(count);

      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const i = r * cols + c;
          hx[i] = offX + c * gap;
          hy[i] = offY + r * gap;
          px[i] = hx[i];
          py[i] = hy[i];
        }
      }
    };

    const step = (dt) => {
      clock += dt;
      const now = clock;

      for (let w = waves.length - 1; w >= 0; w -= 1) {
        if (now - waves[w].t > WAVE_LIFE) waves.splice(w, 1);
      }

      const pActive = pointer.active;
      const R2 = RADIUS * RADIUS;

      for (let i = 0; i < count; i += 1) {
        let fx = -K * (px[i] - hx[i]) - C * vx[i];
        let fy = -K * (py[i] - hy[i]) - C * vy[i];

        /* Wind: a slow diagonal swell travelling across the grid. */
        const phase = hx[i] * 0.011 + hy[i] * 0.007 - now * 0.9;
        fx += WIND * Math.sin(phase) * 0.6;
        fy += WIND * Math.cos(phase * 0.8) * 0.4;

        if (pActive) {
          const dx = px[i] - pointer.x;
          const dy = py[i] - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = PUSH * (1 - d / RADIUS) ** 2;
            fx += (dx / d) * f;
            fy += (dy / d) * f;
          }
        }

        for (let w = 0; w < waves.length; w += 1) {
          const wave = waves[w];
          const age = now - wave.t;
          const ring = age * WAVE_SPEED;
          const dx = hx[i] - wave.x;
          const dy = hy[i] - wave.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const off = Math.abs(d - ring);
          if (off < WAVE_BAND) {
            const f = 5200 * (1 - off / WAVE_BAND) * (1 - age / WAVE_LIFE);
            fx += (dx / d) * f;
            fy += (dy / d) * f;
          }
        }

        vx[i] += fx * dt;
        vy[i] += fy * dt;
        px[i] += vx[i] * dt;
        py[i] += vy[i] * dt;
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const calmAlpha = colors.dark ? 0.2 : 0.16;

      /* Mesh lines between neighbours that are both disturbed. */
      ctx.beginPath();
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const i = r * cols + c;
          const di = Math.abs(px[i] - hx[i]) + Math.abs(py[i] - hy[i]);
          if (di < 3) continue;
          if (c + 1 < cols) {
            const j = i + 1;
            if (Math.abs(px[j] - hx[j]) + Math.abs(py[j] - hy[j]) > 3) {
              ctx.moveTo(px[i], py[i]);
              ctx.lineTo(px[j], py[j]);
            }
          }
          if (r + 1 < rows) {
            const j = i + cols;
            if (Math.abs(px[j] - hx[j]) + Math.abs(py[j] - hy[j]) > 3) {
              ctx.moveTo(px[i], py[i]);
              ctx.lineTo(px[j], py[j]);
            }
          }
        }
      }
      ctx.strokeStyle = `rgba(${colors.accent},${colors.dark ? 0.22 : 0.16})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      /* Calm dots in one path; disturbed dots bucketed by how far they moved,
         so the whole frame is five fills rather than one per dot. */
      const buckets = [[], [], [], []];
      ctx.beginPath();
      for (let i = 0; i < count; i += 1) {
        const d = Math.hypot(px[i] - hx[i], py[i] - hy[i]);
        if (d < 2.5) {
          ctx.moveTo(px[i] + 1.1, py[i]);
          ctx.arc(px[i], py[i], 1.1, 0, Math.PI * 2);
        } else {
          buckets[Math.min(3, Math.floor(d / 7))].push(i);
        }
      }
      ctx.fillStyle = `rgba(${colors.ink},${calmAlpha})`;
      ctx.fill();

      for (let b = 0; b < buckets.length; b += 1) {
        const list = buckets[b];
        if (!list.length) continue;
        const radius = 1.4 + b * 0.45;
        ctx.beginPath();
        for (let n = 0; n < list.length; n += 1) {
          const i = list[n];
          ctx.moveTo(px[i] + radius, py[i]);
          ctx.arc(px[i], py[i], radius, 0, Math.PI * 2);
        }
        ctx.fillStyle = `rgba(${colors.accent},${0.35 + b * 0.18})`;
        ctx.fill();
      }
    };

    /* Visibility: route sets the ceiling; on the home page, scrolling past the
       hero fades the field down to that of an inner page. Written straight to
       the element, so scrolling never re-renders anything. */
    const applyOpacity = () => {
      const path = pathRef.current;
      let o = baseIntensity(path);
      if (path === '/') {
        const t = Math.min(1, window.scrollY / 700);
        o = 1 - t * 0.6;
      }
      canvas.style.opacity = String(o);
    };

    const loop = (nowMs) => {
      frame = window.requestAnimationFrame(loop);
      const dt = Math.min((nowMs - last) / 1000, 1 / 30);
      last = nowMs;
      /* Two half steps: the spring is stiff enough that one full step at 30 fps
         would visibly overshoot on a slow frame. */
      step(dt / 2);
      step(dt / 2);
      draw();
    };

    const start = () => {
      if (running || reduced) return;
      running = true;
      last = performance.now();
      frame = window.requestAnimationFrame(loop);
    };

    const stop = () => {
      running = false;
      window.cancelAnimationFrame(frame);
    };

    const onMove = (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
    };
    const onLeave = () => { pointer.active = false; };
    const onDown = (event) => {
      waves.push({ x: event.clientX, y: event.clientY, t: clock });
      if (waves.length > 5) waves.shift();
    };

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        build();
        draw();
      }, 120);
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    const onScroll = () => applyOpacity();

    /* Re-read the palette when the theme flips — by attribute or by the OS. */
    const refreshColors = () => {
      colors = readColors();
      if (reduced) draw();
    };
    const observer = new MutationObserver(refreshColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    scheme.addEventListener('change', refreshColors);

    build();
    applyOpacity();
    draw();

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    if (!reduced) {
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerdown', onDown, { passive: true });
      document.addEventListener('pointerleave', onLeave);
      window.addEventListener('blur', onLeave);
      document.addEventListener('visibilitychange', onVisibility);
      start();
    }

    return () => {
      stop();
      observer.disconnect();
      scheme.removeEventListener('change', refreshColors);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  /* Route changes only move the opacity ceiling. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let o = baseIntensity(pathname);
    if (pathname === '/') o = 1 - Math.min(1, window.scrollY / 700) * 0.6;
    canvas.style.opacity = String(o);
  }, [pathname]);

  return <canvas ref={canvasRef} className="field" aria-hidden="true" />;
}
