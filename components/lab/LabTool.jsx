'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

/* Each tool loads only on its own page, so one demo's code never ships with
   another's. The fallback holds the space so the page doesn't jump. */
const loading = () => <div className="tool" style={{ minHeight: 420 }} aria-busy="true" />;

const RateLimiter = dynamic(() => import('./RateLimiter'), { ssr: false, loading });
const CacheStampede = dynamic(() => import('./CacheStampede'), { ssr: false, loading });
const CapacityPlanner = dynamic(() => import('./CapacityPlanner'), { loading });
const ChainBuilder = dynamic(() => import('./ChainBuilder'), { loading });
const FlakySuite = dynamic(() => import('./FlakySuite'), { loading });
const EvalGate = dynamic(() => import('./EvalGate'), { loading });
const CircuitBreaker = dynamic(() => import('./CircuitBreaker'), { ssr: false, loading });
const GraphGame = dynamic(() => import('./GraphGame'), { loading });
const TraceGame = dynamic(() => import('./TraceGame'), { loading });
const BillSplitter = dynamic(() => import('./BillSplitter'), { loading });
const EmiCalculator = dynamic(() => import('./EmiCalculator'), { loading });
const SipPlanner = dynamic(() => import('./SipPlanner'), { loading });
const FocusTimer = dynamic(() => import('./FocusTimer'), { loading });
const PasswordMaker = dynamic(() => import('./PasswordMaker'), { ssr: false, loading });
const QueryLite = dynamic(() => import('./QueryLite'), { ssr: false, loading });
const RaftDemo = dynamic(() => import('./RaftDemo'), { ssr: false, loading });
const CrdtEditor = dynamic(() => import('./CrdtEditor'), { ssr: false, loading });
const GuardrailGame = dynamic(() => import('../GuardrailGame'), { ssr: false, loading });
const RedTeamArena = dynamic(() => import('../RedTeamArena'), { loading });
const LLMWhiteboard = dynamic(() => import('../LLMWhiteboard'), { ssr: false });

/* The notes open as a full-screen panel, as they always have. While open they
   own the screen: the page behind is locked and Escape closes them. */
function NotesLauncher() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="tool">
      <div className="launch">
        <div className="demo-art demo-art-notes" style={{ width: 280, margin: 0 }} aria-hidden="true">
          <span>AI</span><span>will</span><span>change</span><span>the</span>
        </div>
        <p>Eight steps, from a prompt to one new word. It plays by itself, or step through it at your own pace.</p>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)} aria-haspopup="dialog">
          Open my notes
        </button>
      </div>
      {open ? <LLMWhiteboard onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

const QUESTIONS = [
  'What does Gaurav do now?',
  'What is his tech stack?',
  'Has he built backend services?',
  'Has he done machine learning?',
  'What is his CGPA?',
  'How do I contact him?',
];

function AssistantLauncher() {
  const ask = (question) => window.dispatchEvent(new CustomEvent('assistant:open', { detail: { question } }));
  return (
    <div className="tool">
      <div className="launch">
        <div className="demo-art demo-art-chat" style={{ width: 280, margin: 0 }} aria-hidden="true"><b /><b /><b /></div>
        <p>Pick a question, or open it and ask your own. Every answer shows where on this site it came from.</p>
        <div className="chips">
          {QUESTIONS.map((q) => (
            <button key={q} type="button" className="chip-btn" onClick={() => ask(q)}>{q}</button>
          ))}
        </div>
        <button type="button" className="btn btn-primary" onClick={() => ask()}>
          Open the assistant
        </button>
      </div>
    </div>
  );
}

export default function LabTool({ slug }) {
  switch (slug) {
    case 'rate-limiter': return <RateLimiter />;
    case 'cache-stampede': return <CacheStampede />;
    case 'capacity': return <CapacityPlanner />;
    case 'json-journey': return <ChainBuilder />;
    case 'flaky-suite': return <FlakySuite />;
    case 'eval-gate': return <EvalGate />;
    case 'circuit-breaker': return <CircuitBreaker />;
    case 'langgraph': return <GraphGame />;
    case 'langfuse': return <TraceGame />;
    case 'split-bill': return <BillSplitter />;
    case 'emi': return <EmiCalculator />;
    case 'sip': return <SipPlanner />;
    case 'focus': return <FocusTimer />;
    case 'password': return <PasswordMaker />;
    case 'querylite': return <QueryLite />;
    case 'raft': return <RaftDemo />;
    case 'crdt-editor': return <CrdtEditor />;
    case 'llm-notes': return <NotesLauncher />;
    case 'assistant': return <AssistantLauncher />;
    case 'guardrail':
      return (
        <div style={{ display: 'grid', gap: 40 }}>
          <div>
            <h2 className="title-3" style={{ marginBottom: 16 }}>Arcade round</h2>
            <GuardrailGame />
          </div>
          <div>
            <h2 className="title-3" style={{ marginBottom: 16 }}>Slow round — same call, no clock</h2>
            <RedTeamArena />
          </div>
        </div>
      );
    default:
      return null;
  }
}
