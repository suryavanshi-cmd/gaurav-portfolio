'use client';

import { useMemo, useState } from 'react';
import { Slider } from './controls';

/*
  Loan EMI calculator.

  EMI = P × r × (1 + r)^n / ((1 + r)^n − 1), with r the monthly rate and n the
  number of months. The schedule is then walked month by month, which also
  gives the "pay a little extra" answer: the extra goes straight to the
  principal, so the loan ends sooner and less interest is paid.
*/

const rupees = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

function short(n) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(n >= 1e8 ? 0 : 2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(n >= 1e6 ? 1 : 2)} L`;
  return rupees(n);
}

function schedule(principal, yearlyRate, months, extra) {
  const r = yearlyRate / 12 / 100;
  const emi = r === 0 ? principal / months : (principal * r * (1 + r) ** months) / ((1 + r) ** months - 1);
  let left = principal;
  let interest = 0;
  let month = 0;
  const years = [];
  while (left > 0.5 && month < months) {
    const i = left * r;
    const pay = Math.min(left + i, emi + extra);
    const p = pay - i;
    left -= p;
    interest += i;
    const y = Math.floor(month / 12);
    years[y] = years[y] || { p: 0, i: 0 };
    years[y].p += p;
    years[y].i += i;
    month += 1;
  }
  return { emi, interest, months: month, years };
}

export default function EmiCalculator() {
  const [amount, setAmount] = useState(3000000);
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);
  const [extra, setExtra] = useState(0);

  const base = useMemo(() => schedule(amount, rate, years * 12, 0), [amount, rate, years]);
  const withExtra = useMemo(() => schedule(amount, rate, years * 12, extra), [amount, rate, years, extra]);

  const total = amount + base.interest;
  const interestShare = base.interest / total;
  const saved = base.interest - withExtra.interest;
  const monthsSaved = base.months - withExtra.months;
  const maxYear = Math.max(...base.years.map((y) => y.p + y.i));
  const circumference = 2 * Math.PI * 52;

  return (
    <div className="tool">
      <div className="tool-stage money-stage">
        <div className="money-top">
          <div className="money-ring" role="img" aria-label={`Interest is ${Math.round(interestShare * 100)}% of everything you pay`}>
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" className="ring-bg" />
              <circle
                cx="60"
                cy="60"
                r="52"
                className="ring-fg"
                style={{ strokeDasharray: `${circumference * interestShare} ${circumference}` }}
              />
            </svg>
            <div><b>{Math.round(interestShare * 100)}%</b><span>is interest</span></div>
          </div>
          <div className="money-big">
            <span>Your EMI</span>
            <strong key={Math.round(base.emi)}>{rupees(base.emi)}</strong>
            <em>a month, for {years} {years === 1 ? 'year' : 'years'}</em>
          </div>
        </div>

        <div className="money-years" role="img" aria-label="What each year’s payments go to: loan versus interest">
          {base.years.map((y, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} className="money-year" title={`Year ${i + 1}: ${short(y.p)} loan, ${short(y.i)} interest`}>
              <b className="is-i" style={{ height: `${(y.i / maxYear) * 100}%` }} />
              <b className="is-p" style={{ height: `${(y.p / maxYear) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="money-axis"><span>Year 1</span><span>Early years are mostly interest</span><span>Year {years}</span></div>
      </div>

      <div className="tool-body">
        <div className="tool-controls">
          <Slider label="Loan amount" value={amount} min={50000} max={20000000} log onChange={setAmount} format={short} />
          <Slider label="Interest rate (yearly)" value={rate} min={5} max={20} step={0.1} onChange={(v) => setRate(Math.round(v * 10) / 10)} format={(v) => `${v.toFixed(1)}%`} />
          <Slider label="Years" value={years} min={1} max={30} onChange={setYears} format={(v) => `${v}`} />
          <Slider label="Pay extra every month" value={extra} min={0} max={Math.max(1000, Math.round(base.emi / 1000) * 1000)} step={500} onChange={setExtra} format={(v) => (v ? rupees(v) : 'nothing')} />
        </div>

        <div className="readouts">
          <div className="readout"><span>Total interest</span><strong className="is-warn">{short(base.interest)}</strong></div>
          <div className="readout"><span>Total you pay</span><strong>{short(total)}</strong></div>
          <div className="readout"><span>Interest saved</span><strong className={saved > 0 ? 'is-ok' : ''}>{saved > 0 ? short(saved) : '—'}</strong></div>
          <div className="readout"><span>Loan ends</span><strong className={monthsSaved > 0 ? 'is-ok' : ''}>{monthsSaved > 0 ? `${Math.floor(monthsSaved / 12)}y ${monthsSaved % 12}m sooner` : 'on time'}</strong></div>
        </div>

        <p className={`verdict ${extra ? 'is-ok' : 'is-info'}`}>
          <span className="verdict-icon" aria-hidden="true">{extra ? '✓' : 'ℹ︎'}</span>
          <span>
            {extra
              ? <><b>{rupees(extra)} extra a month saves {short(saved)}</b> and ends the loan {Math.floor(monthsSaved / 12)} years {monthsSaved % 12} months early — because every extra rupee cuts the loan itself, not the interest.</>
              : <><b>You pay {short(base.interest)} in interest</b> on a {short(amount)} loan. Try “pay extra every month” to see how much a small top-up saves.</>}
          </span>
        </p>
        <p className="legend">
          <span><i style={{ background: 'var(--accent)' }} />goes to the loan</span>
          <span><i style={{ background: 'var(--warn)' }} />goes to interest</span>
          <span>Maths only — your bank’s exact figures may differ slightly.</span>
        </p>
      </div>
    </div>
  );
}
