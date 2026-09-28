'use client';

import { useEffect, useMemo, useState } from 'react';

/*
  Split the bill: add people, add who paid for what, and get the fewest
  payments that settle everyone up.

  Each expense is split equally among the people ticked for it. A person's
  balance is what they paid minus their share. Settling is greedy — the
  person owed the most is paid by the person who owes the most, repeated — which
  never needs more than (people − 1) payments.

  Everything is kept in this browser only (localStorage), so a trip's list
  survives a reload and is never sent anywhere.
*/

const STORE = 'split-bill';
const rupees = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const SAMPLE = {
  people: ['Asha', 'Ravi', 'Meera'],
  items: [
    { id: 1, what: 'Hotel', amount: 6000, payer: 'Asha', among: ['Asha', 'Ravi', 'Meera'] },
    { id: 2, what: 'Dinner', amount: 1800, payer: 'Ravi', among: ['Asha', 'Ravi', 'Meera'] },
    { id: 3, what: 'Cab', amount: 900, payer: 'Meera', among: ['Ravi', 'Meera'] },
  ],
};

export function settle(people, items) {
  const bal = Object.fromEntries(people.map((p) => [p, 0]));
  items.forEach((it) => {
    const among = it.among.filter((p) => p in bal);
    if (!among.length || !(it.payer in bal) || !(it.amount > 0)) return;
    bal[it.payer] += it.amount;
    const share = it.amount / among.length;
    among.forEach((p) => { bal[p] -= share; });
  });
  const owe = people.filter((p) => bal[p] < -0.5).map((p) => ({ p, v: -bal[p] })).sort((a, b) => b.v - a.v);
  const get = people.filter((p) => bal[p] > 0.5).map((p) => ({ p, v: bal[p] })).sort((a, b) => b.v - a.v);
  const pays = [];
  while (owe.length && get.length) {
    const amount = Math.min(owe[0].v, get[0].v);
    pays.push({ from: owe[0].p, to: get[0].p, amount });
    owe[0].v -= amount;
    get[0].v -= amount;
    if (owe[0].v < 0.5) owe.shift();
    if (get[0].v < 0.5) get.shift();
    owe.sort((a, b) => b.v - a.v);
    get.sort((a, b) => b.v - a.v);
  }
  return { bal, pays };
}

export default function BillSplitter() {
  const [people, setPeople] = useState(SAMPLE.people);
  const [items, setItems] = useState(SAMPLE.items);
  const [name, setName] = useState('');
  const [draft, setDraft] = useState({ what: '', amount: '', payer: SAMPLE.people[0] });
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORE));
      if (saved?.people?.length) {
        setPeople(saved.people);
        setItems(saved.items || []);
        setDraft((d) => ({ ...d, payer: saved.people[0] }));
      }
    } catch { /* start with the sample */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { window.localStorage.setItem(STORE, JSON.stringify({ people, items })); } catch { /* not saved */ }
  }, [people, items, loaded]);

  const { bal, pays } = useMemo(() => settle(people, items), [people, items]);
  const total = items.reduce((s, it) => s + (it.amount || 0), 0);
  const biggest = Math.max(1, ...people.map((p) => Math.abs(bal[p] || 0)));

  const addPerson = (event) => {
    event.preventDefault();
    const n = name.trim().slice(0, 20);
    if (!n || people.includes(n)) return;
    /* A newcomer joins only the expenses everyone shared — not the cab two
       people took before they were added. */
    setItems((list) => list.map((it) => (people.every((p) => it.among.includes(p)) ? { ...it, among: [...it.among, n] } : it)));
    setPeople((list) => [...list, n]);
    setName('');
  };

  const removePerson = (p) => {
    if (people.length <= 2) return;
    const left = people.filter((x) => x !== p);
    setPeople(left);
    setItems((list) => list.filter((it) => it.payer !== p).map((it) => ({ ...it, among: it.among.filter((x) => x !== p) })));
    if (draft.payer === p) setDraft((d) => ({ ...d, payer: left[0] }));
  };

  const addItem = (event) => {
    event.preventDefault();
    const amount = Number(String(draft.amount).replace(/[^\d.]/g, ''));
    if (!(amount > 0)) return;
    setItems((list) => [...list, { id: Date.now(), what: draft.what.trim() || 'Expense', amount, payer: draft.payer, among: [...people] }]);
    setDraft((d) => ({ ...d, what: '', amount: '' }));
  };

  const toggleAmong = (id, p) => setItems((list) => list.map((it) => {
    if (it.id !== id) return it;
    const among = it.among.includes(p) ? it.among.filter((x) => x !== p) : [...it.among, p];
    return among.length ? { ...it, among } : it;
  }));

  const summary = [
    `Trip total: ${rupees(total)}`,
    ...(pays.length ? pays.map((x) => `${x.from} pays ${x.to} ${rupees(x.amount)}`) : ['Everyone is settled up.']),
  ].join('\n');

  const copy = () => {
    navigator.clipboard?.writeText(summary).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  };

  const clear = () => {
    setItems([]);
  };

  return (
    <div className="tool">
      <div className="split">
        <section className="split-col">
          <h3 className="split-h">1 · Who’s in?</h3>
          <div className="split-people">
            {people.map((p) => (
              <span key={p} className="split-person">
                <i aria-hidden="true">{p.slice(0, 1).toUpperCase()}</i>{p}
                {people.length > 2 ? <button type="button" onClick={() => removePerson(p)} aria-label={`Remove ${p}`}>×</button> : null}
              </span>
            ))}
          </div>
          <form className="split-form" onSubmit={addPerson}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add a name" aria-label="Name" maxLength={20} />
            <button type="submit" className="btn btn-ghost">Add</button>
          </form>

          <h3 className="split-h">2 · What was paid?</h3>
          <form className="split-form split-expense" onSubmit={addItem}>
            <input value={draft.what} onChange={(e) => setDraft((d) => ({ ...d, what: e.target.value }))} placeholder="For what (e.g. Lunch)" aria-label="What was it for" maxLength={30} />
            <input value={draft.amount} onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))} placeholder="₹ Amount" inputMode="decimal" aria-label="Amount in rupees" />
            <select value={draft.payer} onChange={(e) => setDraft((d) => ({ ...d, payer: e.target.value }))} aria-label="Who paid">
              {people.map((p) => <option key={p} value={p}>{p} paid</option>)}
            </select>
            <button type="submit" className="btn btn-primary">Add</button>
          </form>

          <ul className="split-items">
            {items.map((it) => (
              <li key={it.id}>
                <div className="split-item-top">
                  <b>{it.what}</b>
                  <span>{rupees(it.amount)} · paid by {it.payer}</span>
                  <button type="button" onClick={() => setItems((l) => l.filter((x) => x.id !== it.id))} aria-label={`Delete ${it.what}`}>×</button>
                </div>
                <div className="split-among" role="group" aria-label={`Split ${it.what} between`}>
                  {people.map((p) => (
                    <button key={p} type="button" className={it.among.includes(p) ? 'is-on' : ''} onClick={() => toggleAmong(it.id, p)} aria-pressed={it.among.includes(p)}>
                      {p}
                    </button>
                  ))}
                </div>
              </li>
            ))}
            {!items.length ? <li className="split-empty">No expenses yet. Add one above.</li> : null}
          </ul>
          {items.length ? <button type="button" className="split-clear" onClick={clear}>Clear all expenses</button> : null}
        </section>

        <section className="split-col split-result" aria-live="polite">
          <h3 className="split-h">3 · Settle up</h3>
          <p className="split-total"><span>Total</span><b>{rupees(total)}</b></p>

          <ul className="split-bal">
            {people.map((p) => {
              const v = bal[p] || 0;
              const w = `${(Math.abs(v) / biggest) * 50}%`;
              return (
                <li key={p}>
                  <span className="split-bal-name">{p}</span>
                  <span className="split-bal-track">
                    <i className={v >= 0 ? 'is-plus' : 'is-minus'} style={{ width: w }} />
                  </span>
                  <span className={`split-bal-v ${v > 0.5 ? 'is-plus' : v < -0.5 ? 'is-minus' : ''}`}>
                    {v > 0.5 ? `gets ${rupees(v)}` : v < -0.5 ? `owes ${rupees(-v)}` : 'even'}
                  </span>
                </li>
              );
            })}
          </ul>

          <ol className="split-pays">
            {pays.map((x) => (
              <li key={`${x.from}-${x.to}`}>
                <b>{x.from}</b><span className="split-arrow" aria-hidden="true">→</span><b>{x.to}</b>
                <strong>{rupees(x.amount)}</strong>
              </li>
            ))}
            {!pays.length ? <li className="split-empty">Everyone is even. 🎉</li> : null}
          </ol>
          {pays.length ? <p className="split-note">{pays.length} {pays.length === 1 ? 'payment settles' : 'payments settle'} everything.</p> : null}

          <button type="button" className="btn btn-primary" onClick={copy}>{copied ? 'Copied ✓' : 'Copy for WhatsApp'}</button>
        </section>
      </div>
    </div>
  );
}
