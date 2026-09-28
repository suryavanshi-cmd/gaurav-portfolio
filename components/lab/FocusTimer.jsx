'use client';

import { useEffect, useRef, useState } from 'react';

/*
  A focus timer (Pomodoro): work for a set time, take a short break, repeat.

  The clock keeps the moment the phase ends rather than counting ticks, so it
  stays right when the tab is in the background and the browser slows timers
  down. The tab title shows the time left, a soft chime plays at the end of
  each phase, and today's finished sessions are kept in this browser.
*/

const PRESETS = [
  { id: 'classic', label: '25 / 5', focus: 25, rest: 5 },
  { id: 'deep', label: '50 / 10', focus: 50, rest: 10 },
  { id: 'quick', label: '15 / 3', focus: 15, rest: 3 },
];
const STORE = 'focus-timer';
const today = () => new Date().toISOString().slice(0, 10);

function chime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const at = ctx.currentTime + i * 0.22;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.18, at + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 1);
    });
    setTimeout(() => ctx.close(), 1600);
  } catch { /* no sound available */ }
}

const clock = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export default function FocusTimer() {
  const [preset, setPreset] = useState(PRESETS[0]);
  const [phase, setPhase] = useState('focus');
  const [left, setLeft] = useState(PRESETS[0].focus * 60000);
  const [endAt, setEndAt] = useState(null);
  const [done, setDone] = useState(0);
  const [task, setTask] = useState('');
  const [sound, setSound] = useState(true);
  const title = useRef('');

  const length = (phase === 'focus' ? preset.focus : preset.rest) * 60000;
  const running = endAt !== null;

  useEffect(() => {
    title.current = document.title;
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORE));
      if (saved?.day === today()) setDone(saved.done || 0);
    } catch { /* fresh day */ }
    return () => { document.title = title.current; };
  }, []);

  useEffect(() => {
    if (!running) return undefined;
    const tick = () => {
      const ms = endAt - Date.now();
      setLeft(ms);
      document.title = `${clock(ms)} · ${phase === 'focus' ? 'Focus' : 'Break'}`;
      if (ms <= 0) {
        if (sound) chime();
        if (phase === 'focus') {
          setDone((d) => {
            const n = d + 1;
            try { window.localStorage.setItem(STORE, JSON.stringify({ day: today(), done: n })); } catch { /* not saved */ }
            return n;
          });
        }
        const next = phase === 'focus' ? 'rest' : 'focus';
        const nextLen = (next === 'focus' ? preset.focus : preset.rest) * 60000;
        setPhase(next);
        setLeft(nextLen);
        setEndAt(Date.now() + nextLen);
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [running, endAt, phase, preset, sound]);

  useEffect(() => { if (!running) document.title = title.current || document.title; }, [running]);

  const start = () => setEndAt(Date.now() + left);
  const pause = () => { setLeft(endAt - Date.now()); setEndAt(null); };
  const reset = () => { setEndAt(null); setPhase('focus'); setLeft(preset.focus * 60000); };
  const skip = () => {
    const next = phase === 'focus' ? 'rest' : 'focus';
    const nextLen = (next === 'focus' ? preset.focus : preset.rest) * 60000;
    setPhase(next);
    setLeft(nextLen);
    if (running) setEndAt(Date.now() + nextLen);
  };
  const choose = (p) => { setPreset(p); setEndAt(null); setPhase('focus'); setLeft(p.focus * 60000); };

  const progress = 1 - Math.max(0, left) / length;
  const R = 108;
  const C = 2 * Math.PI * R;

  return (
    <div className="tool">
      <div className={`tool-stage focus-stage is-${phase} ${running ? 'is-running' : ''}`}>
        <div className="focus-presets" role="group" aria-label="Focus and break length, in minutes">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className={p.id === preset.id ? 'is-on' : ''} onClick={() => choose(p)} aria-pressed={p.id === preset.id}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="focus-ring" role="timer" aria-label={`${phase === 'focus' ? 'Focus' : 'Break'}: ${clock(left)} left`}>
          <svg viewBox="0 0 240 240" aria-hidden="true">
            <circle cx="120" cy="120" r={R} className="focus-bg" />
            <circle cx="120" cy="120" r={R} className="focus-fg" style={{ strokeDasharray: C, strokeDashoffset: C * (1 - progress) }} />
          </svg>
          <div className="focus-center">
            <span className="focus-phase">{phase === 'focus' ? 'Focus' : 'Break'}</span>
            <strong>{clock(left)}</strong>
            <span className="focus-task">{phase === 'focus' ? (task || 'One thing at a time') : 'Stand up. Look away from the screen.'}</span>
          </div>
        </div>

        <div className="focus-actions">
          {running
            ? <button type="button" className="btn btn-primary focus-main" onClick={pause}>Pause</button>
            : <button type="button" className="btn btn-primary focus-main" onClick={start}>{left < length ? 'Resume' : 'Start'}</button>}
          <button type="button" className="btn btn-ghost" onClick={skip}>Skip</button>
          <button type="button" className="btn btn-ghost" onClick={reset}>Reset</button>
        </div>
      </div>

      <div className="tool-body">
        <div className="focus-row">
          <input className="focus-input" value={task} onChange={(e) => setTask(e.target.value.slice(0, 60))} placeholder="What are you working on?" aria-label="What are you working on?" />
          <label className="switch">
            <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} />
            <i aria-hidden="true" />
            <span>Chime</span>
          </label>
        </div>
        <div className="focus-today" aria-label={`${done} focus sessions finished today`}>
          <span>Today</span>
          <div className="focus-dots">
            {Array.from({ length: Math.max(8, done) }, (_, i) => <i key={i} className={i < done ? 'is-on' : ''} />)}
          </div>
          <b>{done} {done === 1 ? 'session' : 'sessions'}</b>
        </div>
        <p className="legend"><span>Keeps time in the background. Your count is saved in this browser only.</span></p>
      </div>
    </div>
  );
}
