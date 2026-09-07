'use client';

import { useEffect, useRef } from 'react';

/* A field with wind moving through it.
 *
 * Drawn on a canvas rather than as animated SVG or CSS: three hundred blades,
 * each with its own phase, is three hundred elements the compositor would have
 * to keep — on a mid-range phone that is the difference between a background
 * and a stutter. One canvas, one requestAnimationFrame loop, and the whole
 * thing costs about a millisecond a frame.
 *
 * The wind is two things added together: a steady sway, so the field is never
 * still, and a gust that travels across it left to right. The gust is what
 * makes it read as air moving rather than grass wobbling — you can watch it
 * arrive.
 *
 * It stops when it cannot be seen (tab hidden, scrolled past) and never starts
 * when the visitor asked for reduced motion, in which case a single still frame
 * is drawn instead.
 */

interface Blade {
  x: number;
  /* 0 = far band, 1 = middle, 2 = near */
  band: number;
  height: number;
  lean: number;
  phase: number;
  width: number;
  shade: number;
}

interface Mote {
  x: number;
  y: number;
  drift: number;
  size: number;
  phase: number;
}

const BANDS = {
  light: [
    { base: '#c2ddad', blade: '#79ad63', y: 0.6 },
    { base: '#93c274', blade: '#4c8a45', y: 0.73 },
    { base: '#5d9a4c', blade: '#245c31', y: 0.86 },
  ],
  dark: [
    { base: '#20372c', blade: '#3d6b4d', y: 0.68 },
    { base: '#172a22', blade: '#2c5a3f', y: 0.79 },
    { base: '#0e1c17', blade: '#1d4130', y: 0.9 },
  ],
};

export function FieldBackdrop({ className, density = 1 }: { className?: string; density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return undefined;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let blades: Blade[] = [];
    let motes: Mote[] = [];
    let frame = 0;
    let running = true;

    const theme = () =>
      (document.documentElement.dataset.theme === 'dark' ? BANDS.dark : BANDS.light);

    /* Deterministic per-blade jitter, so a resize does not reshuffle the field
       into a different field. */
    let seed = 1;
    const rand = () => {
      seed = (Math.imul(seed, 48271) + 11) >>> 0;
      return seed / 4294967296;
    };

    function build() {
      seed = 1;
      const count = Math.round(Math.min(width * 0.8, 620) * density);
      blades = Array.from({ length: count }, () => {
        const band = rand() < 0.34 ? 0 : rand() < 0.55 ? 1 : 2;
        return {
          x: rand() * (width + 80) - 40,
          band,
          height: (0.035 + rand() * 0.055) * height * (0.7 + band * 0.3),
          lean: (rand() - 0.5) * 0.5,
          phase: rand() * Math.PI * 2,
          width: 1 + band * 0.7 + rand() * 0.9,
          shade: 0.75 + rand() * 0.35,
        };
      });
      motes = Array.from({ length: Math.round(26 * density) }, () => ({
        x: rand() * width,
        y: rand() * height * 0.7,
        drift: 0.25 + rand() * 0.5,
        size: 0.8 + rand() * 1.8,
        phase: rand() * Math.PI * 2,
      }));
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(rect.width, 1);
      height = Math.max(rect.height, 1);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function draw(time: number) {
      const bands = theme();
      ctx!.clearRect(0, 0, width, height);

      // The ground each band of grass stands in.
      bands.forEach((band) => {
        const top = height * band.y;
        // The fade starts well above the horizon so the band dissolves into
        // whatever is behind it instead of drawing a green rectangle.
        const gradient = ctx!.createLinearGradient(0, top - height * 0.22, 0, height);
        gradient.addColorStop(0, `${band.base}00`);
        gradient.addColorStop(0.35, `${band.base}cc`);
        gradient.addColorStop(1, band.base);
        ctx!.fillStyle = gradient;
        ctx!.beginPath();
        ctx!.moveTo(0, top);
        // A soft, uneven horizon rather than a ruled line.
        const horizon = (x: number) => top + Math.sin(x * 0.008 + band.y * 9) * height * 0.012;
        for (let x = 0; x <= width; x += 24) {
          ctx!.lineTo(x, horizon(x));
        }
        // The loop lands short of the right edge whenever the width is not a
        // multiple of the step, which left a diagonal cutting across the corner.
        ctx!.lineTo(width, horizon(width));
        ctx!.lineTo(width, height);
        ctx!.lineTo(0, height);
        ctx!.closePath();
        ctx!.fill();
      });

      const t = time * 0.001;
      // The gust: a narrow band of extra bend travelling across the field.
      const gustCentre = ((t * 0.34) % 1.6 - 0.3) * width;

      blades.forEach((blade) => {
        const band = bands[blade.band];
        const ground = height * band.y + Math.sin(blade.x * 0.008 + band.y * 9) * height * 0.012;
        const sway = Math.sin(t * 1.1 + blade.phase + blade.x * 0.01) * 0.16;
        const gust = Math.exp(-((blade.x - gustCentre) ** 2) / (2 * (width * 0.16) ** 2)) * 0.55;
        const bend = (blade.lean + sway + gust) * blade.height * (0.5 + blade.band * 0.22);

        const tipX = blade.x + bend;
        const tipY = ground - blade.height;

        ctx!.beginPath();
        ctx!.moveTo(blade.x, ground);
        ctx!.quadraticCurveTo(blade.x + bend * 0.32, ground - blade.height * 0.6, tipX, tipY);
        ctx!.strokeStyle = band.blade;
        ctx!.globalAlpha = (0.55 + blade.band * 0.16) * blade.shade;
        ctx!.lineWidth = blade.width;
        ctx!.lineCap = 'round';
        ctx!.stroke();
      });

      // Seed heads carried on the same wind, so the air above the field is not
      // empty while the grass moves.
      ctx!.globalAlpha = 0.5;
      motes.forEach((mote) => {
        const gust = Math.exp(-((mote.x - gustCentre) ** 2) / (2 * (width * 0.2) ** 2));
        const x = (mote.x + t * mote.drift * 34 + gust * 40) % (width + 60) - 30;
        const y = mote.y + Math.sin(t * 0.7 + mote.phase) * 12;
        ctx!.beginPath();
        ctx!.arc(x, y, mote.size, 0, Math.PI * 2);
        ctx!.fillStyle = document.documentElement.dataset.theme === 'dark' ? '#cfe8d6' : '#ffffff';
        ctx!.fill();
      });
      ctx!.globalAlpha = 1;
    }

    resize();

    if (reduced) {
      draw(0);
    } else {
      const loop = (time: number) => {
        if (!running) return;
        draw(time);
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    }

    const observer = new ResizeObserver(() => {
      resize();
      if (reduced) draw(0);
    });
    observer.observe(canvas);

    // Off-screen or in a hidden tab, stop entirely — a background animation
    // should never be why a phone gets warm.
    const visibility = new IntersectionObserver((entries) => {
      const visible = entries[0]?.isIntersecting ?? true;
      if (visible && !running && !reduced) {
        running = true;
        frame = requestAnimationFrame(function loop(time) {
          if (!running) return;
          draw(time);
          frame = requestAnimationFrame(loop);
        });
      } else if (!visible) {
        running = false;
        cancelAnimationFrame(frame);
      }
    }, { threshold: 0 });
    visibility.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frame);
      } else if (!reduced && !running) {
        running = true;
        frame = requestAnimationFrame(function loop(time) {
          if (!running) return;
          draw(time);
          frame = requestAnimationFrame(loop);
        });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // The palette follows the theme control, which writes data-theme on <html>.
    const themeWatcher = new MutationObserver(() => { if (reduced) draw(0); });
    themeWatcher.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibility.disconnect();
      themeWatcher.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [density]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
