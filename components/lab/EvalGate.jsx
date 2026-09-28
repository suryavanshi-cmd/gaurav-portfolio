'use client';

import { useMemo, useState } from 'react';
import { Slider, Switch } from './controls';
import { Segmented } from '../ui';
import { CASES, DECISIONS, POLICY } from './evalCases';

/*
  The CI gate from the post, run over eight hand-written cases.

  Structure and facts are real checks — they run on whatever is in the answer
  box, so editing an answer re-checks it as you type. Meaning needs a judge
  model, which this page does not have: the labels shown are the ones written
  with the cases, and an edited answer is marked "not re-judged" rather than
  given a label nobody produced.
*/

function checkStructure(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return text.includes('{')
      ? { ok: false, why: 'Extra text around the JSON — it does not parse.' }
      : { ok: false, why: 'Not JSON.' };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, why: 'Not a JSON object.' };
  for (const field of ['decision', 'clause', 'reason']) {
    if (typeof data[field] !== 'string' || !data[field].trim()) return { ok: false, why: `Missing field “${field}”.` };
  }
  if (!DECISIONS.includes(data.decision)) {
    return { ok: false, why: `decision “${data.decision}” is not one of ${DECISIONS.join(', ')}.` };
  }
  return { ok: true, why: 'Valid JSON with every field, and an allowed decision.' };
}

function checkFacts(text, c) {
  const hay = text.toLowerCase();
  const missing = c.must.filter((m) => !hay.includes(m.toLowerCase()));
  if (missing.length) return { ok: false, why: `Missing “${missing.join('”, “')}”.` };
  const banned = c.never.filter((m) => hay.includes(m.toLowerCase()));
  if (banned.length) return { ok: false, why: `Says “${banned.join('”, “')}”, which this answer must never say.` };
  return { ok: true, why: 'Has everything it must, and nothing it must not.' };
}

const Mark = ({ r }) => {
  if (!r) return <span className="eval-mark is-off" aria-label="not run">—</span>;
  if (r.skip) return <span className="eval-mark is-off" aria-label="skipped">·</span>;
  return r.ok
    ? <span className="eval-mark is-ok" aria-label="pass">✓</span>
    : <span className="eval-mark is-bad" aria-label="fail">✗</span>;
};

export default function EvalGate() {
  const [version, setVersion] = useState('v1');
  const [layers, setLayers] = useState({ structure: true, facts: true, meaning: true });
  const [exact, setExact] = useState(false);
  const [threshold, setThreshold] = useState(85);
  const [strict, setStrict] = useState(true);
  const [selected, setSelected] = useState('cosmetic');
  const [edits, setEdits] = useState({});

  const outputOf = (c) => edits[`${version}:${c.id}`] ?? c[version].out;

  const rows = useMemo(() => CASES.map((c) => {
    const text = edits[`${version}:${c.id}`] ?? c[version].out;
    const edited = `${version}:${c.id}` in edits;

    if (exact) {
      const same = text.trim() === c.last.trim();
      const r = { ok: same, why: same ? 'Identical to last week’s answer.' : 'Different wording from last week’s answer.' };
      return { c, exact: r, pass: same, structureFail: false };
    }

    const structure = layers.structure ? checkStructure(text) : null;
    const blocked = structure && !structure.ok;
    const facts = layers.facts ? (blocked ? { skip: true, why: 'Skipped — the JSON did not parse.' } : checkFacts(text, c)) : null;
    let meaning = null;
    if (layers.meaning) {
      if (blocked) meaning = { skip: true, why: 'Skipped — the JSON did not parse.' };
      else if (edited) meaning = { skip: true, why: 'Not re-judged — that needs a model call. Structure and facts above did re-run.' };
      else {
        const [label, why] = c[version].judge;
        meaning = { ok: label === 'SUPPORTED', label, why };
      }
    }
    const results = [structure, facts, meaning].filter(Boolean);
    const pass = results.every((r) => r.skip || r.ok) && !blocked;
    return { c, structure, facts, meaning, pass, structureFail: Boolean(blocked) };
  }), [version, layers, exact, edits]);

  const passed = rows.filter((r) => r.pass).length;
  const pct = Math.round((passed / rows.length) * 100);
  const noChecks = !exact && !layers.structure && !layers.facts && !layers.meaning;

  const reasons = [];
  if (pct < threshold) reasons.push(`${pct}% passed — the gate needs ${threshold}%.`);
  if (strict && rows.some((r) => r.structureFail)) reasons.push('A structure check failed — those must always pass.');
  if (strict && rows.some((r) => r.c.critical && !r.pass)) reasons.push('A critical case failed — those must always pass.');
  const open = reasons.length === 0;

  const row = rows.find((r) => r.c.id === selected) || rows[0];
  const edited = `${version}:${row.c.id}` in edits;

  /* While exact match is on the layer switches read as off; turning one on
     leaves exact-match mode. */
  const toggle = (key) => (value) => {
    if (exact) {
      setExact(false);
      setLayers((l) => ({ ...l, [key]: true }));
    } else {
      setLayers((l) => ({ ...l, [key]: value }));
    }
  };

  return (
    <div className="tool">
      <div className="tool-stage eval-stage">
        <div className="eval-top">
          <Segmented
            label="Prompt version"
            value={version}
            onChange={setVersion}
            options={[{ value: 'v1', label: 'Prompt v1 · live' }, { value: 'v2', label: 'Prompt v2 · new' }]}
          />
          <div className={`gate ${open ? 'is-open' : 'is-shut'}`} aria-live="polite">
            <b>{open ? 'Ship it' : 'Blocked'}</b>
            <span>{passed}/{rows.length} cases · {pct}%</span>
          </div>
        </div>

        <div className="eval-table" role="group" aria-label="Test cases — pick one to see why">
          <div className="eval-row eval-head" aria-hidden="true">
            <span>Case</span>
            {exact
              ? <span className="eval-wide">Exact match</span>
              : <><span>Structure</span><span>Facts</span><span>Meaning</span></>}
          </div>
          {rows.map((r) => (
            <button
              key={r.c.id}
              type="button"
             
              className={`eval-row ${r.c.id === selected ? 'is-on' : ''} ${r.pass ? '' : 'is-fail'}`}
              onClick={() => setSelected(r.c.id)}
              aria-pressed={r.c.id === selected}
            >
              <span className="eval-name">
                {r.c.name}
                {r.c.critical ? <em>critical</em> : null}
                {`${version}:${r.c.id}` in edits ? <em className="is-edited">edited</em> : null}
              </span>
              {exact
                ? <span className="eval-wide"><Mark r={r.exact} /></span>
                : <>
                  <span><Mark r={r.structure} /></span>
                  <span><Mark r={r.facts} /></span>
                  <span><Mark r={r.meaning} /></span>
                </>}
            </button>
          ))}
        </div>
      </div>

      <div className="eval-detail">
        <div>
          <h3>{row.c.name}</h3>
          <p className="eval-input">{row.c.input}</p>
          <p className="eval-rules">
            {row.c.must.length ? <span>Must say: {row.c.must.map((m) => <code key={m}>{m}</code>)}</span> : null}
            {row.c.never.length ? <span>Never: {row.c.never.map((m) => <code key={m}>{m}</code>)}</span> : null}
          </p>
          <ul className="eval-why">
            {exact
              ? <li className={row.exact.ok ? 'is-ok' : 'is-bad'}><b>Exact match</b>{row.exact.why}</li>
              : [['Structure', row.structure], ['Facts', row.facts], ['Meaning', row.meaning]].map(([name, r]) => (r ? (
                <li key={name} className={r.skip ? 'is-off' : r.ok ? 'is-ok' : 'is-bad'}>
                  <b>{name}{r.label ? ` · ${r.label}` : ''}</b>{r.why}
                </li>
              ) : null))}
          </ul>
        </div>
        <div>
          <label className="eval-label" htmlFor="eval-answer">
            <span>Answer ({version === 'v1' ? 'prompt v1' : 'prompt v2'}) — edit it</span>
            {edited ? (
              <button type="button" onClick={() => setEdits((e) => {
                const next = { ...e };
                delete next[`${version}:${row.c.id}`];
                return next;
              })}
              >
                Undo edits
              </button>
            ) : null}
          </label>
          <textarea
            id="eval-answer"
            className={`code-input ${!exact && row.structureFail ? 'is-bad' : ''}`}
            value={outputOf(row.c)}
            onChange={(event) => setEdits((e) => ({ ...e, [`${version}:${row.c.id}`]: event.target.value }))}
            spellCheck={false}
          />
          <details className="eval-policy">
            <summary>The made-up policy</summary>
            <dl>{POLICY.map(([n, t]) => <div key={n}><dt>{n}</dt><dd>{t}</dd></div>)}</dl>
          </details>
        </div>
      </div>

      <div className="tool-body">
        <div className="tool-controls">
          <Switch label="1 · Structure (JSON, fields, allowed values)" checked={layers.structure && !exact} onChange={toggle('structure')} />
          <Switch label="2 · Facts (must / never say)" checked={layers.facts && !exact} onChange={toggle('facts')} />
          <Switch label="3 · Meaning (judge label)" checked={layers.meaning && !exact} onChange={toggle('meaning')} />
          <Switch label="Instead: exact match to last week’s answer" checked={exact} onChange={setExact} />
          <Slider label="Pass the build at" value={threshold} min={50} max={100} step={5} onChange={setThreshold} format={(x) => `${x}%`} />
          <Switch label="Structure and critical cases must always pass" checked={strict} onChange={setStrict} />
        </div>

        <p className={`verdict ${noChecks ? 'is-warn' : open ? 'is-ok' : 'is-bad'}`}>
          <span className="verdict-icon" aria-hidden="true">{noChecks ? '!' : open ? '✓' : '✗'}</span>
          <span>
            {noChecks && <><b>No checks, so everything passes.</b> This is how many LLM features ship today.</>}
            {!noChecks && exact && <><b>Exact match fails almost everything.</b> The wording changes on every run even when the answer is right — so teams switch these tests off. Check structure, facts and meaning instead.</>}
            {!noChecks && !exact && open && <><b>The gate is open.</b> {version === 'v2' ? 'Prompt v2 would ship with the checks you have on — try turning them all back on.' : 'Prompt v1 passes. Switch to v2, the shorter prompt, and see what it breaks.'}</>}
            {!noChecks && !exact && !open && <><b>The build is blocked.</b> {reasons.join(' ')}</>}
          </span>
        </p>
        <p className="legend">
          <span>Every case, clause and answer here is made up by hand — none of it is real model output.</span>
        </p>
      </div>
    </div>
  );
}
