'use client';

import { useEffect, useRef } from 'react';

/*
  Full-page lightning + spark canvas.
  - Ambient bolts strike on a randomised cadence.
  - Clicks and taps trigger a bolt to the pointer plus a spark burst.
  - Fully disabled for reduced-motion users and paused when the tab is hidden.
*/

const ACCENT_FALLBACK = '#b9f65c';

function readAccent(variable, fallback) {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || fallback;
}

function buildBolt(x1, y1, x2, y2, displacement, detail) {
  let points = [{ x: x1, y: y1 }, { x: x2, y: y2 }];
  let offset = displacement;

  for (let pass = 0; pass < detail; pass += 1) {
    const next = [];
    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      const normalX = -(end.y - start.y);
      const normalY = end.x - start.x;
      const length = Math.hypot(normalX, normalY) || 1;
      const shift = (Math.random() - 0.5) * offset;
      next.push(start, {
        x: midX + (normalX / length) * shift,
        y: midY + (normalY / length) * shift,
      });
    }
    next.push(points[points.length - 1]);
    points = next;
    offset *= 0.55;
  }

  return points;
}

export default function LightningField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotion.matches) return undefined;

    const context = canvas.getContext('2d');
    if (!context) return undefined;

    let width = 0;
    let height = 0;
    let ratio = 1;
    let frame = 0;
    let loopActive = false;
    let strikeTimer = 0;
    let last = performance.now();
    let running = true;

    const bolts = [];
    const sparks = [];
    let accent = readAccent('--accent', ACCENT_FALLBACK);
    let accentAlt = readAccent('--accent-2', ACCENT_FALLBACK);

    function resize() {
      // Half-res on coarse pointers: phones pay the blend-mode compositing cost
      // twice as hard and never see pointer-follow detail up close.
      const cap = window.matchMedia('(pointer: coarse)').matches ? 1.25 : 2;
      ratio = Math.min(window.devicePixelRatio || 1, cap);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function spawnBolt(targetX, targetY, power = 1) {
      const originX = targetX + (Math.random() - 0.5) * width * 0.5;
      const points = buildBolt(originX, -40, targetX, targetY, 130 * power, 6);
      bolts.push({
        points,
        life: 1,
        decay: 0.045 + Math.random() * 0.03,
        width: (1.1 + Math.random() * 1.6) * power,
        hue: Math.random() > 0.5 ? accent : accentAlt,
        branches: Array.from({ length: 2 + Math.floor(Math.random() * 3) }, () => {
          const anchor = points[Math.floor(Math.random() * (points.length - 2)) + 1];
          return buildBolt(
            anchor.x,
            anchor.y,
            anchor.x + (Math.random() - 0.5) * 260,
            anchor.y + Math.random() * 200,
            50,
            4,
          );
        }),
      });
    }

    function spawnSparks(x, y, count = 22) {
      for (let index = 0; index < count; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.6 + Math.random() * 6.4;
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2,
          life: 1,
          decay: 0.014 + Math.random() * 0.024,
          size: 0.8 + Math.random() * 2.2,
          hue: Math.random() > 0.5 ? accent : accentAlt,
        });
      }
    }

    function drawPath(points, alpha, lineWidth, color) {
      context.beginPath();
      context.moveTo(points[0].x, points[0].y);
      for (let index = 1; index < points.length; index += 1) {
        context.lineTo(points[index].x, points[index].y);
      }
      context.strokeStyle = color;
      context.globalAlpha = alpha;
      context.lineWidth = lineWidth;
      context.stroke();
    }

    function ensureLoop() {
      if (loopActive) return;
      loopActive = true;
      last = performance.now();
      frame = window.requestAnimationFrame(render);
    }

    function scheduleAmbientStrike() {
      window.clearTimeout(strikeTimer);
      strikeTimer = window.setTimeout(() => {
        if (!document.hidden && !reduceMotion.matches) {
          spawnBolt(Math.random() * width, height * (0.35 + Math.random() * 0.5), 0.75 + Math.random() * 0.5);
          ensureLoop();
        }
        scheduleAmbientStrike();
      }, 2600 + Math.random() * 5200);
    }

    function render(now) {
      const delta = Math.min(now - last, 60);
      last = now;

      // Nothing left to draw: clear once and park the loop until the next
      // spawn — an empty full-viewport canvas should cost nothing per frame.
      if (bolts.length === 0 && sparks.length === 0) {
        context.clearRect(0, 0, width, height);
        loopActive = false;
        return;
      }

      frame = window.requestAnimationFrame(render);
      if (!running || reduceMotion.matches) return;

      context.clearRect(0, 0, width, height);
      context.lineCap = 'round';
      context.lineJoin = 'round';

      for (let index = bolts.length - 1; index >= 0; index -= 1) {
        const bolt = bolts[index];
        bolt.life -= bolt.decay * (delta / 16.7);
        if (bolt.life <= 0) {
          bolts.splice(index, 1);
          continue;
        }
        const alpha = Math.max(bolt.life, 0) ** 0.7;
        context.shadowBlur = 26;
        context.shadowColor = bolt.hue;
        drawPath(bolt.points, alpha * 0.28, bolt.width * 6, bolt.hue);
        drawPath(bolt.points, alpha * 0.85, bolt.width * 1.7, bolt.hue);
        context.shadowBlur = 0;
        drawPath(bolt.points, alpha, Math.max(bolt.width * 0.55, 0.7), '#ffffff');
        bolt.branches.forEach((branch) => drawPath(branch, alpha * 0.4, bolt.width * 0.8, bolt.hue));
      }

      for (let index = sparks.length - 1; index >= 0; index -= 1) {
        const spark = sparks[index];
        spark.life -= spark.decay * (delta / 16.7);
        if (spark.life <= 0) {
          sparks.splice(index, 1);
          continue;
        }
        spark.x += spark.vx * (delta / 16.7);
        spark.y += spark.vy * (delta / 16.7);
        spark.vy += 0.16 * (delta / 16.7);
        spark.vx *= 0.985;
        context.globalAlpha = Math.max(spark.life, 0);
        context.fillStyle = spark.hue;
        context.shadowBlur = 12;
        context.shadowColor = spark.hue;
        context.beginPath();
        context.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
      }

      context.globalAlpha = 1;
    }

    function handlePointer(event) {
      if (event.target instanceof Element && event.target.closest('input, textarea')) return;
      spawnSparks(event.clientX, event.clientY, 18);
      if (Math.random() > 0.45) spawnBolt(event.clientX, event.clientY, 0.8);
      ensureLoop();
    }

    function handleStrike(event) {
      const detail = event.detail || {};
      const x = typeof detail.x === 'number' ? detail.x : Math.random() * width;
      const y = typeof detail.y === 'number' ? detail.y : height * 0.4;
      spawnBolt(x, y, detail.power || 1.15);
      spawnSparks(x, y, detail.sparks || 26);
      ensureLoop();
    }

    function handleVisibility() {
      running = !document.hidden;
      last = performance.now();
    }

    function handleThemeChange() {
      accent = readAccent('--accent', ACCENT_FALLBACK);
      accentAlt = readAccent('--accent-2', ACCENT_FALLBACK);
    }

    resize();
    scheduleAmbientStrike();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointerdown', handlePointer, { passive: true });
    window.addEventListener('portfolio:strike', handleStrike);
    window.addEventListener('portfolio:theme', handleThemeChange);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(strikeTimer);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerdown', handlePointer);
      window.removeEventListener('portfolio:strike', handleStrike);
      window.removeEventListener('portfolio:theme', handleThemeChange);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="lightning-field" aria-hidden="true" />;
}
