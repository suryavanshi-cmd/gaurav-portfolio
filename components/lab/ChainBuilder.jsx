'use client';

import { useMemo, useState } from 'react';
import { query, resolveTemplate, stringify } from './jsonpath';

/*
  Chain two API calls: take values out of one response with JSONPath and fill
  them into the next request. Everything updates as you type.

  A missing value stops the chain with its name, instead of sending the next
  request with "undefined" in it — the same rule the post argues for.
*/

const SAMPLE_JSON = `{
  "status": "OK",
  "result": {
    "claimSeqID": "CLM-2291",
    "amount": 12500,
    "member": { "id": 88213, "name": "A. Patil" },
    "documents": [
      { "type": "bill", "id": "DOC-17" },
      { "type": "discharge", "id": "DOC-18" }
    ]
  }
}`;

const SAMPLE_RULES = [
  { name: 'claimId', path: '$.result.claimSeqID' },
  { name: 'memberId', path: '$.result.member.id' },
  { name: 'firstDoc', path: '$.result.documents[0].id' },
  { name: 'docTypes', path: '$.result.documents[*].type' },
];

const SAMPLE_TEMPLATE = `POST /claims/\${claimId}/settlement
Content-Type: application/json

{
  "memberId": \${memberId},
  "documents": ["\${firstDoc}"],
  "note": "Received: \${docTypes}"
}`;

let nextId = 1;
const withIds = (rules) => rules.map((rule) => ({ ...rule, id: nextId++ }));

/* JSON.parse's messages differ by browser; turn a position into a line. */
function parseJson(text) {
  try {
    return { data: JSON.parse(text) };
  } catch (error) {
    const at = /position (\d+)/.exec(error.message);
    const line = at ? text.slice(0, Number(at[1])).split('\n').length : null;
    return { error: line ? `Not valid JSON — check line ${line}.` : 'Not valid JSON.' };
  }
}

export default function ChainBuilder() {
  const [json, setJson] = useState(SAMPLE_JSON);
  const [rules, setRules] = useState(() => withIds(SAMPLE_RULES));
  const [template, setTemplate] = useState(SAMPLE_TEMPLATE);

  const parsed = useMemo(() => parseJson(json), [json]);

  const results = useMemo(() => rules.map((rule) => {
    if (!rule.name.trim()) return { ...rule, status: 'empty' };
    if (parsed.error) return { ...rule, status: 'blocked' };
    try {
      const hit = query(parsed.data, rule.path);
      return hit.found ? { ...rule, status: 'ok', value: hit.value } : { ...rule, status: 'missing' };
    } catch (error) {
      return { ...rule, status: 'error', message: error.message };
    }
  }), [rules, parsed]);

  const values = useMemo(() => {
    const out = {};
    results.forEach((r) => { if (r.status === 'ok') out[r.name.trim()] = r.value; });
    return out;
  }, [results]);

  const resolved = useMemo(() => resolveTemplate(template, values), [template, values]);

  const update = (id, key, value) => setRules((list) => list.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  const remove = (id) => setRules((list) => list.filter((r) => r.id !== id));
  const add = () => setRules((list) => [...list, { id: nextId++, name: `value${list.length + 1}`, path: '$.status' }]);
  const reset = () => { setJson(SAMPLE_JSON); setRules(withIds(SAMPLE_RULES)); setTemplate(SAMPLE_TEMPLATE); };

  const ready = !parsed.error && resolved.missing.length === 0;

  return (
    <div className="tool">
      <div className="chain">
        <div className="chain-col">
          <h3><small>1</small>Response from the first call</h3>
          <textarea
            className={`code-input ${parsed.error ? 'is-bad' : ''}`}
            value={json}
            onChange={(event) => setJson(event.target.value)}
            spellCheck={false}
            aria-label="JSON response"
            aria-invalid={Boolean(parsed.error)}
          />
          {parsed.error ? <p className="chain-error" role="alert">{parsed.error}</p> : null}
        </div>

        <div className="chain-col">
          <h3><small>2</small>Values to take out (JSONPath)</h3>
          <div className="rules">
            {results.map((rule) => (
              <div key={rule.id} className="rule">
                <input
                  value={rule.name}
                  onChange={(event) => update(rule.id, 'name', event.target.value.replace(/[^A-Za-z0-9_]/g, ''))}
                  aria-label="Value name"
                  spellCheck={false}
                />
                <input
                  value={rule.path}
                  onChange={(event) => update(rule.id, 'path', event.target.value)}
                  aria-label={`JSONPath for ${rule.name}`}
                  spellCheck={false}
                />
                <button type="button" onClick={() => remove(rule.id)} aria-label={`Remove ${rule.name}`}>×</button>
                <p className={`rule-value ${rule.status === 'ok' ? 'is-ok' : 'is-bad'}`}>
                  {rule.status === 'ok' && `✓ ${stringify(rule.value)}`}
                  {rule.status === 'missing' && '✗ Nothing at this path'}
                  {rule.status === 'error' && `✗ ${rule.message}`}
                  {rule.status === 'blocked' && '— Fix the JSON first'}
                  {rule.status === 'empty' && '✗ Give it a name'}
                </p>
              </div>
            ))}
          </div>
          <button type="button" className="add-rule" onClick={add}>+ Add a value</button>
        </div>

        <div className="chain-col">
          <h3><small>3</small>Next request</h3>
          <textarea
            className="code-input"
            style={{ minHeight: 150 }}
            value={template}
            onChange={(event) => setTemplate(event.target.value)}
            spellCheck={false}
            aria-label="Next request template. Use ${name} for values."
          />
          <pre className="resolved" aria-label="Filled-in request">
            {resolved.parts.map((part, i) => {
              if (part.kind === 'text') return part.text;
              return (
                // eslint-disable-next-line react/no-array-index-key
                <mark key={i} className={part.kind === 'missing' ? 'is-bad' : ''} title={part.name}>{part.text}</mark>
              );
            })}
          </pre>
        </div>
      </div>

      <div className="tool-body">
        {ready ? (
          <p className="verdict is-ok" style={{ marginTop: 0 }}>
            <span className="verdict-icon" aria-hidden="true">✓</span>
            <span><b>Ready to send.</b> Every <code>{'${value}'}</code> in the next request was found in the response.</span>
          </p>
        ) : (
          <p className="verdict is-bad" style={{ marginTop: 0 }} role="status">
            <span className="verdict-icon" aria-hidden="true">!</span>
            <span>
              {parsed.error
                ? <><b>Stopped.</b> The response is not valid JSON.</>
                : <><b>Stopped before sending.</b> {resolved.missing.map((m) => <code key={m}>{m}</code>).reduce((acc, el) => (acc.length ? [...acc, ', ', el] : [el]), [])} {resolved.missing.length === 1 ? 'was' : 'were'} never taken out of the response. A real run would fail here, with this name — not two steps later with a confusing error.</>}
            </span>
          </p>
        )}
        <div className="tool-actions">
          <button type="button" className="btn btn-ghost" onClick={reset}>Reset the example</button>
        </div>
        <p className="legend">
          <span>Try: <code>$.result.documents[-1].id</code></span>
          <span>or break it — rename <code>claimId</code> above.</span>
        </p>
      </div>
    </div>
  );
}
