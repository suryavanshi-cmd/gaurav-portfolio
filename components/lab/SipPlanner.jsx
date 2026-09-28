'use client';

import { useMemo, useState } from 'react';
import { Slider } from './controls';
import { Segmented } from '../ui';

/*
  SIP planner: how a monthly investment grows, or how much a goal needs.

  Month by month: add this month's amount, then grow the whole pot by the
  monthly rate. A yearly step-up raises the monthly amount once a year. The
  goal mode searches for the monthly amount that reaches the target (the
  growth is monotonic in the amount, so a binary search is exact enough).

  Also shows the final pot in today's money at 6% inflation, because ₹1 crore
  in 20 years does not buy what ₹1 crore buys now.
*/

const INFLATION = 6;
const rupees = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

function short(n) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  return rupees(n);
}

function grow(monthly, rate, years, stepUp) {
  const r = rate / 12 / 100;
  let pot = 0;
  let invested = 0;
  let amount = monthly;
  const byYear = [];
  for (let m = 0; m < years * 12; m += 1) {
    if (m > 0 && m % 12 === 0) amount *= 1 + stepUp / 100;
    pot = (pot + amount) * (1 + r);
    invested += amount;
    if (m % 12 === 11) byYear.push({ pot, invested });
  }
  return { pot, invested, byYear };
}

function needed(goal, rate, years, stepUp) {
  let lo = 0;
  let hi = goal;
  for (let i = 0; i < 50; i += 1) {
    const mid = (lo + hi) / 2;
    if (grow(mid, rate, years, stepUp).pot < goal) lo = mid; else hi = mid;
  }
  return Math.ceil(hi / 100) * 100;
}

export default function SipPlanner() {
  const [mode, setMode] = useState('grow');
  const [monthly, setMonthly] = useState(10000);
  const [goal, setGoal] = useState(10000000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(20);
  const [stepUp, setStepUp] = useState(0);

  const perMonth = useMemo(
    () => (mode === 'goal' ? needed(goal, rate, years, stepUp) : monthly),
    [mode, goal, monthly, rate, years, stepUp],
  );
  const result = useMemo(() => grow(perMonth, rate, years, stepUp), [perMonth, rate, years, stepUp]);
  const gains = result.pot - result.invested;
  const today = result.pot / (1 + INFLATION / 100) ** years;
  const max = Math.max(...result.byYear.map((y) => y.pot));

  return (
    <div className="tool">
      <div className="tool-stage money-stage">
        <Segmented
          label="What do you want to know?"
          value={mode}
          onChange={setMode}
          options={[{ value: 'grow', label: 'I can invest…' }, { value: 'goal', label: 'I want to reach…' }]}
        />

        <div className="money-big" style={{ marginTop: 18 }}>
          {mode === 'grow' ? (
            <>
              <span>In {years} years you could have</span>
              <strong key={Math.round(result.pot)}>{short(result.pot)}</strong>
              <em>from {rupees(perMonth)} a month{stepUp ? `, going up ${stepUp}% a year` : ''}</em>
            </>
          ) : (
            <>
              <span>To reach {short(goal)} in {years} years, invest</span>
              <strong key={perMonth}>{rupees(perMonth)}</strong>
              <em>a month{stepUp ? `, going up ${stepUp}% a year` : ''}</em>
            </>
          )}
        </div>

        <div className="money-years" role="img" aria-label="Your money by year: what you put in, and what it earned">
          {result.byYear.map((y, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} className="money-year" title={`Year ${i + 1}: ${short(y.pot)} (${short(y.invested)} put in)`}>
              <b className="is-gain" style={{ height: `${((y.pot - y.invested) / max) * 100}%` }} />
              <b className="is-p" style={{ height: `${(y.invested / max) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="money-axis"><span>Year 1</span><span>Growth speeds up at the end</span><span>Year {years}</span></div>
      </div>

      <div className="tool-body">
        <div className="tool-controls">
          {mode === 'grow'
            ? <Slider label="Every month" value={monthly} min={500} max={200000} log onChange={setMonthly} format={rupees} />
            : <Slider label="Goal" value={goal} min={100000} max={100000000} log onChange={setGoal} format={short} />}
          <Slider label="Expected return (yearly)" value={rate} min={4} max={18} step={0.5} onChange={setRate} format={(v) => `${v}%`} />
          <Slider label="Years" value={years} min={1} max={40} onChange={setYears} format={(v) => `${v}`} />
          <Slider label="Raise the amount every year by" value={stepUp} min={0} max={20} onChange={setStepUp} format={(v) => (v ? `${v}%` : 'no step-up')} />
        </div>

        <div className="readouts">
          <div className="readout"><span>You put in</span><strong>{short(result.invested)}</strong></div>
          <div className="readout"><span>It earns</span><strong className="is-ok">{short(gains)}</strong></div>
          <div className="readout"><span>Final amount</span><strong>{short(result.pot)}</strong></div>
          <div className="readout"><span>In today’s money</span><strong className="is-warn">{short(today)}</strong></div>
        </div>

        <p className="verdict is-info">
          <span className="verdict-icon" aria-hidden="true">ℹ︎</span>
          <span>
            <b>{Math.round((gains / result.pot) * 100)}% of the final amount is growth,</b> not money you put in — and most of it arrives in the last few years. Starting 5 years earlier matters more than a bigger amount later.
          </span>
        </p>
        <p className="legend">
          <span><i style={{ background: 'var(--accent)' }} />money you put in</span>
          <span><i style={{ background: 'var(--ok)' }} />growth</span>
          <span>Assumes a steady return and {INFLATION}% inflation. Real returns go up and down — this is maths, not advice.</span>
        </p>
      </div>
    </div>
  );
}
