'use client';

import { useId } from 'react';

/* A labelled range input. The filled part of the track is painted from --fill,
   so the slider reads like a native control in both themes. `log` maps the
   slider linearly onto a logarithmic value, for ranges like 10 → 200,000. */
export function Slider({ label, value, min, max, step = 1, onChange, format = (v) => v, log = false }) {
  const id = useId();

  const toPos = (v) => (log ? Math.log(v / min) / Math.log(max / min) : (v - min) / (max - min));
  const fromPos = (p) => {
    if (!log) return p * (max - min) + min;
    const raw = min * (max / min) ** p;
    /* Round to two significant figures so the numbers stay readable. */
    const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(raw)) - 1);
    return Math.round(raw / magnitude) * magnitude;
  };

  const position = Math.min(1, Math.max(0, toPos(value)));

  return (
    <div className="control">
      <label htmlFor={id}>
        <span>{label}</span>
        <output htmlFor={id}>{format(value)}</output>
      </label>
      <input
        id={id}
        className="range"
        type="range"
        min={log ? 0 : min}
        max={log ? 1000 : max}
        step={log ? 1 : step}
        value={log ? Math.round(position * 1000) : value}
        style={{ '--fill': `${position * 100}%` }}
        onChange={(event) => {
          const raw = Number(event.target.value);
          onChange(log ? fromPos(raw / 1000) : raw);
        }}
      />
    </div>
  );
}

export function Switch({ label, checked, onChange }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <i aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

export const fmt = (n) => Math.round(n).toLocaleString('en-US');
