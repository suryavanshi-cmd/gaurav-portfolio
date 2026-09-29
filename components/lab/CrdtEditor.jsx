'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TextCRDT } from '../../lib/crdt.mjs';

/*
  A collaborative editor with no server, on the CRDT in lib/crdt.mjs.

  Three devices share one note. Each has its own copy of the document and
  sends its edits to the others over a simulated network you control:
  delay, and an online switch per device. Take one offline, edit on all of
  them, bring it back — they merge to the same text.

  "You" is also connected to every other open tab of this page, for real,
  through BroadcastChannel: open the page in a second tab and type.
*/

const PEERS = [
  { key: 'you', name: 'You', device: 'This tab' },
  { key: 'ravi', name: 'Ravi', device: 'Phone' },
  { key: 'meera', name: 'Meera', device: 'Laptop' },
];
const START = 'Trip plan\n- Book the train to Lonavala\n- ';
const CHANNEL = 'crdt-editor-room';

/* The starter text is written by a fixed "seed" site, so every tab creates
   the same operations — which merge as one. */
function starterOps() {
  return new TextCRDT('0seed').insert(0, START);
}

const cpToUnits = (text, cp) => [...text].slice(0, cp).join('').length;
const unitsToCp = (text, units) => [...text.slice(0, units)].length;

export default function CrdtEditor() {
  const tab = useRef(null);
  const docs = useRef(null);
  const queues = useRef({});
  const channel = useRef(null);
  const areas = useRef([]);
  const carets = useRef({});
  const timers = useRef([]);
  const [online, setOnline] = useState([true, true, true]);
  const onlineRef = useRef(online);
  onlineRef.current = online;
  const [delay, setDelay] = useState(300);
  const delayRef = useRef(delay);
  delayRef.current = delay;
  const [, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);
  const [tabs, setTabs] = useState(0);
  const [inside, setInside] = useState(false);

  if (!docs.current) {
    tab.current = Math.random().toString(36).slice(2, 7);
    docs.current = PEERS.map((p) => {
      const d = new TextCRDT(`${tab.current}-${p.key}`);
      d.applyAll(starterOps());
      return d;
    });
  }

  /* Apply operations to one device, keeping its caret where it was. */
  const receive = useCallback((i, ops) => {
    const doc = docs.current[i];
    const el = areas.current[i];
    let sel = null;
    if (el && document.activeElement === el) {
      const text = doc.text();
      sel = [doc.anchor(unitsToCp(text, el.selectionStart)), doc.anchor(unitsToCp(text, el.selectionEnd))];
    }
    const changed = doc.applyAll(ops);
    if (changed && sel) carets.current[i] = sel;
    return changed;
  }, []);

  /* Send from device i to the others: now if both ends are online (after the
     delay), otherwise into a queue until they are. Device 0 also talks to
     other tabs. */
  const send = useCallback((i, ops, { toTabs = true } = {}) => {
    if (!ops.length) return;
    PEERS.forEach((_, j) => {
      if (j === i) return;
      if (onlineRef.current[i] && onlineRef.current[j]) {
        timers.current.push(setTimeout(() => {
          if (!onlineRef.current[j]) { (queues.current[`${i}>${j}`] ||= []).push(...ops); bump(); return; }
          const changed = receive(j, ops);
          if (changed && j === 0) channel.current?.postMessage({ type: 'ops', from: tab.current, ops });
          bump();
        }, delayRef.current));
      } else {
        (queues.current[`${i}>${j}`] ||= []).push(...ops);
      }
    });
    if (i === 0 && toTabs && onlineRef.current[0]) channel.current?.postMessage({ type: 'ops', from: tab.current, ops });
    bump();
  }, [receive]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined;
    const ch = new BroadcastChannel(CHANNEL);
    channel.current = ch;
    const seen = new Map();
    ch.onmessage = ({ data }) => {
      if (!data || data.from === tab.current) return;
      seen.set(data.from, Date.now());
      if (data.type === 'hello') ch.postMessage({ type: 'sync', from: tab.current, ops: docs.current[0].log });
      if ((data.type === 'ops' || data.type === 'sync') && onlineRef.current[0]) {
        const changed = receive(0, data.ops);
        if (changed) send(0, data.ops, { toTabs: false });
        bump();
      }
    };
    ch.postMessage({ type: 'hello', from: tab.current });
    const beat = setInterval(() => {
      ch.postMessage({ type: 'here', from: tab.current });
      const now = Date.now();
      for (const [k, t] of seen) if (now - t > 5000) seen.delete(k);
      setTabs(seen.size);
    }, 1500);
    return () => {
      clearInterval(beat);
      ch.close();
      channel.current = null;
      timers.current.forEach(clearTimeout);
    };
  }, [receive, send]);

  useLayoutEffect(() => {
    for (const [i, sel] of Object.entries(carets.current)) {
      const el = areas.current[i];
      const doc = docs.current[i];
      if (!el || !sel) continue;
      const text = doc.text();
      el.setSelectionRange(cpToUnits(text, doc.resolve(sel[0])), cpToUnits(text, doc.resolve(sel[1])));
    }
    carets.current = {};
  });

  const type = (i, value) => {
    const ops = docs.current[i].edit(value);
    send(i, ops);
  };

  const setPeerOnline = (i, on) => {
    const next = onlineRef.current.slice();
    next[i] = on;
    onlineRef.current = next;
    setOnline(next);
    if (!on) return;
    /* Flush everything that waited for this device, both ways. */
    for (const [k, ops] of Object.entries(queues.current)) {
      const [a, b] = k.split('>').map(Number);
      if (!ops.length || !next[a] || !next[b]) continue;
      queues.current[k] = [];
      timers.current.push(setTimeout(() => {
        const changed = receive(b, ops);
        if (changed && b === 0) channel.current?.postMessage({ type: 'ops', from: tab.current, ops });
        bump();
      }, delayRef.current));
    }
    if (i === 0 && channel.current) {
      channel.current.postMessage({ type: 'sync', from: tab.current, ops: docs.current[0].log });
      channel.current.postMessage({ type: 'hello', from: tab.current });
    }
    bump();
  };

  /* One tap: everyone goes offline, all three type at the same spot, then
     they reconnect one by one. */
  const conflict = () => {
    [0, 1, 2].forEach((i) => setPeerOnline(i, false));
    const words = ['pack snacks', 'buy tickets', 'check weather'];
    docs.current.forEach((d, i) => {
      const text = d.text();
      const at = [...text].length;
      send(i, d.edit(`${text}${at && !text.endsWith(' ') && !text.endsWith('\n') ? ' ' : ''}${words[i]}\n- `));
    });
    bump();
    [0, 1, 2].forEach((i) => timers.current.push(setTimeout(() => setPeerOnline(i, true), 900 + i * 700)));
  };

  const reset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    queues.current = {};
    docs.current = PEERS.map((p) => {
      const d = new TextCRDT(`${tab.current}-${p.key}-${Date.now().toString(36)}`);
      d.applyAll(starterOps());
      return d;
    });
    onlineRef.current = [true, true, true];
    setOnline([true, true, true]);
    bump();
  };

  const texts = docs.current.map((d) => d.text());
  const waiting = Object.values(queues.current).reduce((s, q) => s + q.length, 0);
  const inSync = new Set(texts).size === 1 && waiting === 0;
  const you = docs.current[0];
  const whose = (site) => {
    if (site === '0seed') return 'start';
    if (!site.startsWith(`${tab.current}-`)) return 'tab';
    return site.split('-')[1];
  };

  return (
    <div className="tool crdt">
      <div className="crdt-top" aria-live="polite">
        <span className={`raft-pill ${inSync ? 'is-ok' : 'is-warn'}`}>
          {inSync ? 'All devices show the same text ✓' : waiting ? `${waiting} ${waiting === 1 ? 'edit' : 'edits'} waiting for a connection` : 'Syncing…'}
        </span>
        <span className="raft-pill">{tabs ? `Live with ${tabs} other ${tabs === 1 ? 'tab' : 'tabs'}` : 'No other tabs open'}</span>
        <span className="crdt-spacer" />
        <button type="button" className="btn btn-primary" onClick={conflict}>Try a conflict</button>
        <a className="btn btn-ghost" href="" target="_blank" rel="noopener" onClick={(e) => { e.preventDefault(); window.open(window.location.href, '_blank', 'noopener'); }}>Open another tab ↗</a>
      </div>

      <div className="crdt-peers">
        {PEERS.map((p, i) => (
          <div key={p.key} className={`crdt-peer ${online[i] ? '' : 'is-offline'}`}>
            <div className="crdt-peer-head">
              <span className="crdt-avatar" aria-hidden="true">{p.name[0]}</span>
              <span><b>{p.name}</b><small>{p.device}</small></span>
              <label className="switch">
                <input type="checkbox" checked={online[i]} onChange={(e) => setPeerOnline(i, e.target.checked)} />
                <i aria-hidden="true" />
                <span>{online[i] ? 'Online' : 'Offline'}</span>
              </label>
            </div>
            <textarea
              ref={(el) => { areas.current[i] = el; }}
              className="crdt-area"
              value={texts[i]}
              onChange={(e) => type(i, e.target.value)}
              spellCheck={false}
              aria-label={`${p.name}'s copy of the note`}
            />
          </div>
        ))}
      </div>

      <div className="tool-body">
        <label className="raft-speed">
          <span>Network delay</span>
          <input type="range" className="range" min="0" max="2000" step="50" value={delay} onChange={(e) => setDelay(Number(e.target.value))} style={{ '--fill': `${(delay / 2000) * 100}%` }} />
          <output>{delay} ms</output>
        </label>
        <div className="tool-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setInside((v) => !v)} aria-expanded={inside}>{inside ? 'Hide' : 'Show'} how it’s stored</button>
          <button type="button" className="btn btn-ghost" onClick={reset}>Reset</button>
        </div>
        {inside ? (
          <div className="crdt-inside">
            <p>Your copy, character by character. Each has an id <code>counter·device</code>; deleted ones stay as tombstones so late edits still find their place. {you.stats().chars} characters, {you.stats().tombstones} tombstones, clock at {you.stats().clock}.</p>
            <div className="crdt-chips">
              {you.elems.slice(-90).map((e) => (
                <span key={e.key} className={e.deleted ? 'is-dead' : ''} title={`${e.key}${e.deleted ? ' (deleted)' : ''}`}>
                  <b>{e.ch === '\n' ? '↵' : e.ch === ' ' ? '·' : e.ch}</b>
                  <small>{e.id[0]}·{whose(e.id[1])}</small>
                </span>
              ))}
            </div>
          </div>
        ) : null}
        <p className="legend">
          <span>No server: each device keeps its own copy and they swap edits. Merges are automatic and always end the same way.</span>
        </p>
      </div>
    </div>
  );
}
