'use client';

import { useState } from 'react';
import { TRACE_ROUNDS } from './traceRounds';

/*
  Trace detective: a Langfuse-style trace, a user complaint, and one question —
  which step caused it? Tap a step to open it, then blame it.

  Three lives. A right answer on the first try scores 100 plus a streak bonus;
  after a miss it scores 50. Picking a step that shows the symptom but not the
  cause (`close`) costs nothing and gives a nudge.
*/

const TYPE = {
  span: 'Span',
  generation: 'Model',
  retriever: 'Search',
  tool: 'Tool',
};

const LIVES = 3;

const seconds = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`);

export default function TraceGame() {
  const [round, setRound] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [missed, setMissed] = useState(false);
  const [open, setOpen] = useState(null);
  const [feedback, setFeedback] = useState(null);   // { kind: 'ok' | 'bad' | 'close', text }
  const [solved, setSolved] = useState(false);
  const [learned, setLearned] = useState([]);

  const over = lives === 0;
  const finished = round >= TRACE_ROUNDS.length;
  const r = TRACE_ROUNDS[Math.min(round, TRACE_ROUNDS.length - 1)];

  const blame = (id) => {
    if (solved || over) return;
    const right = id === r.culprit || r.accept?.includes(id);
    if (right) {
      const gained = missed ? 50 : 100 + streak * 25;
      setScore((s) => s + gained);
      setStreak((s) => (missed ? 0 : s + 1));
      setSolved(true);
      setLearned((l) => [...l, r.lesson]);
      setFeedback({ kind: 'ok', text: `Found it! +${gained}` });
    } else if (r.close.includes(id)) {
      setFeedback({ kind: 'close', text: `Close — this step shows the problem, but didn’t cause it. ${r.hint}` });
    } else {
      setMissed(true);
      setStreak(0);
      setLives((l) => l - 1);
      setFeedback({ kind: 'bad', text: lives - 1 > 0 ? `Not this one. ${r.hint}` : 'Out of lives.' });
    }
  };

  const next = () => {
    setRound((n) => n + 1);
    setMissed(false);
    setOpen(null);
    setFeedback(null);
    setSolved(false);
  };

  const restart = () => {
    setRound(0);
    setLives(LIVES);
    setScore(0);
    setStreak(0);
    setMissed(false);
    setOpen(null);
    setFeedback(null);
    setSolved(false);
    setLearned([]);
  };

  const hud = (
    <div className="td-hud">
      <span className="td-round">Case {Math.min(round + 1, TRACE_ROUNDS.length)} / {TRACE_ROUNDS.length}</span>
      <span className="td-lives" aria-label={`${lives} lives left`}>
        {Array.from({ length: LIVES }, (_, i) => <i key={i} className={i < lives ? 'is-on' : ''}>♥</i>)}
      </span>
      <span className="td-score" aria-live="polite"><b key={score}>{score}</b> pts{streak > 1 ? <em> · {streak} in a row</em> : null}</span>
    </div>
  );

  if (finished || over) {
    return (
      <div className="tool td">
        {hud}
        <div className="td-end">
          <p className="td-end-emoji" aria-hidden="true">{over ? '🕵️' : '🏆'}</p>
          <h3>{over ? 'Case closed early.' : 'Every case solved.'}</h3>
          <p className="td-end-score">{score} points</p>
          {learned.length ? (
            <>
              <p className="td-end-sub">What the traces taught you:</p>
              <ol className="td-learned">{learned.map((l) => <li key={l}>{l}</li>)}</ol>
            </>
          ) : null}
          <button type="button" className="btn btn-primary" onClick={restart}>Play again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="tool td">
      {hud}

      <div className="td-ticket" key={r.id}>
        <span className="td-who" aria-hidden="true">{r.who}</span>
        <div>
          <p className="td-quote">“{r.complaint}”</p>
          <p className="td-ask">Tap a step to look inside it. Then blame the one that caused this.</p>
        </div>
      </div>

      <div className="td-trace" key={`${r.id}-trace`}>
        <div className="td-trace-head">
          <span>Trace · support-chat</span>
          <span>{seconds(r.total)}</span>
        </div>
        <ul className="td-rows">
          {r.spans.map((s, i) => {
            const isOpen = open === s.id;
            const isCulprit = solved && (s.id === r.culprit || r.accept?.includes(s.id));
            return (
              <li key={s.id} className={`td-row ${isOpen ? 'is-open' : ''} ${s.level === 'error' ? 'is-error' : ''} ${isCulprit ? 'is-culprit' : ''}`} style={{ '--i': i }}>
                <button type="button" className="td-row-btn" onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen}>
                  <span className="td-row-top" style={{ paddingLeft: s.depth * 18 }}>
                    <span className={`td-type is-${s.type}`}>{TYPE[s.type]}</span>
                    <span className="td-name">{s.name}</span>
                    <span className="td-dur">{seconds(s.dur)}</span>
                  </span>
                  <span className="td-bar-track" aria-hidden="true">
                    <span className="td-bar" style={{ left: `${(s.start / r.total) * 100}%`, width: `max(3px, ${(s.dur / r.total) * 100}%)` }} />
                  </span>
                </button>
                {isOpen ? (
                  <div className="td-detail">
                    <dl>{s.info.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
                    {!solved ? (
                      <button type="button" className="btn btn-primary td-blame" onClick={() => blame(s.id)}>Blame this step</button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      {feedback ? (
        <div className={`td-feedback is-${feedback.kind}`} key={`${feedback.text}-${lives}`} role="status">
          <p><b>{feedback.kind === 'ok' ? '✓ ' : feedback.kind === 'bad' ? '✗ ' : '≈ '}{feedback.text}</b></p>
          {solved ? (
            <>
              <p>{r.explain}</p>
              <p className="td-lesson"><span>Lesson</span>{r.lesson}</p>
              <button type="button" className="btn btn-primary" onClick={next}>
                {round === TRACE_ROUNDS.length - 1 ? 'See your score' : 'Next case ›'}
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <p className="td-foot">Made-up traces, drawn the way Langfuse shows them: nested steps on a timeline, with model calls, tools, tokens, cost, prompt versions and scores.</p>
    </div>
  );
}
