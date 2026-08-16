'use client';

import { useEffect, useState } from 'react';
import LLMWhiteboard from './LLMWhiteboard';

const GITHUB_URL = 'https://github.com/suryavanshi-cmd';
const EMAIL = 'gauravsuryvanshi06@gmail.com';

/* A fact kept inside the sentence. `mark` is the two-character stand-in that
   sits where a logo would go; `tip` is the detail revealed on hover. */
function Chip({ mark, children, tip, href }) {
  const external = href?.startsWith('http');
  const Tag = href ? 'a' : 'span';
  return (
    <Tag
      className="chip"
      tabIndex={href ? undefined : 0}
      {...(href ? { href } : {})}
      {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
    >
      {mark ? <span className="chip-mark" aria-hidden="true">{mark}</span> : null}
      {children}
      {external ? <span className="chip-arrow" aria-hidden="true">↗</span> : null}
      {tip ? <span className="chip-tip" role="tooltip">{tip}</span> : null}
    </Tag>
  );
}

/* Overlapping discs, the way the reference stacks company logos. Decorative —
   the same names are spelled out in the sentence and in the résumé below. */
function Stack({ items }) {
  return (
    <span className="stack" aria-hidden="true">
      {items.map((item) => <span key={item}>{item}</span>)}
    </span>
  );
}

const projects = [
  { key: 'automation', title: 'Generic Dynamic Journey Builder', note: 'Parses Chrome DevTools HAR exports and replays them as repeatable REST journeys, with variable extraction and dependency chaining.' },
  { key: 'automation', title: 'JSON-Driven API Sequencing Engine', note: 'Config-driven orchestration of chained API calls, with retry/polling, SSE streaming, and a visual builder for composing runs.' },
  { key: 'release', title: 'API Contract Drift Detector', note: 'Diffs OpenAPI specs between environments, classifies every change as breaking or safe, and gates the deploy on the verdict.' },
  { key: 'llm', title: 'LLM Evaluation & Guardrails Console', note: 'Scores generated answers for correctness, business-rule compliance, and hallucination risk before a feature ships.' },
  { key: 'llm', title: 'Grounded Knowledge Assistant', note: 'Retrieval-backed assistant over runbooks and API specs that keeps every answer attached to its source.' },
  { key: 'ml', title: 'Wildlife Conservation Analysis', note: 'Computer-vision pipeline for species analysis — the work behind my copyright registration.' },
];

const timeline = [
  { when: '2024 — now', title: 'SDET · Vidal Health TPA, Pune', note: 'Own the Java 17 + TestNG + Rest-Assured API automation framework behind health-insurance claims processing.' },
  { when: '2024', title: 'Backend Automation Test Intern · Bajaj Finserv Health', note: 'Built a microservice that generated and ran curl commands from HTTPS response logs pulled off the ELK stack.' },
  { when: '2020 — 2024', title: 'B.E. Computer Science · PCCOER, Pune', note: 'CGPA 8.96 / 10.' },
  { when: 'Certificate', title: 'Introduction to Generative AI · Udemy' },
  { when: 'Certificate', title: 'Introduction to Machine Learning · Coursera' },
  { when: 'Certificate', title: 'Java · Udemy' },
  { when: 'Copyright', title: 'Wildlife Conservation and Analysis Using Machine Learning' },
];

/* Pune time, plus the current temperature from Open-Meteo (no API key, no
   account). Both render empty on the server: the clock would guarantee a
   hydration mismatch, and the weather is a network call. If the fetch fails or
   is slow the temperature simply never appears — nothing else is affected. */
function HeadMeta() {
  const [time, setTime] = useState('');
  const [temp, setTemp] = useState(null);

  useEffect(() => {
    const format = () =>
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
      }).format(new Date());
    setTime(format());
    const id = window.setInterval(() => setTime(format()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    const timer = window.setTimeout(() => abort.abort(), 6000);
    fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=18.5204&longitude=73.8567&current=temperature_2m&timezone=Asia%2FKolkata',
      { signal: abort.signal },
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const value = d?.current?.temperature_2m;
        if (typeof value === 'number') setTemp(Math.round(value));
      })
      .catch(() => {})
      .finally(() => window.clearTimeout(timer));
    return () => {
      window.clearTimeout(timer);
      abort.abort();
    };
  }, []);

  return (
    <div className="head-meta">
      {time ? <span className="head-time">{time}</span> : null}
      <span className="head-place">
        Pune
        {temp !== null ? <span className="head-temp">{temp}°C</span> : null}
      </span>
    </div>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.5 0-.24-.01-.89-.01-1.75-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.05 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.92-2.34 4.78-4.57 5.04.36.32.68.94.68 1.9 0 1.37-.01 2.480-.01 2.82 0 .28.18.6.69.5A10.03 10.03 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M14 2.5H7A2.5 2.5 0 0 0 4.5 5v14A2.5 2.5 0 0 0 7 21.5h10a2.5 2.5 0 0 0 2.5-2.5V8Z" />
      <path d="M14 2.5V8h5.5" />
    </svg>
  );
}

export default function Portfolio() {
  const [labOpen, setLabOpen] = useState(false);

  /* While the lab is open it owns the screen: lock the page behind it and let
     Escape close it. Restores the previous overflow rather than clearing it. */
  useEffect(() => {
    if (!labOpen) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setLabOpen(false); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [labOpen]);

  return (
    <div className="shell">
      <header className="head">
        <span className="head-name">Gaurav Suryavanshi</span>
        <HeadMeta />
        <nav className="head-nav" aria-label="Sections">
          <a href="#projects">projects</a>
          <a href="#timeline">timeline</a>
          <a href={`mailto:${EMAIL}`}>contact</a>
        </nav>
      </header>

      <div className="intro">
        <p>
          Hello! I’m Gaurav and you’ve found my tiny corner of the internet. I test and
          build the backend systems behind health insurance — the kind where a bug
          doesn’t just look wrong, it reaches somebody’s claim.
        </p>
        <span className="avatar" aria-hidden="true">GS</span>
      </div>

      <section className="section">
        <h2 className="section-label">Summary</h2>
        <ul className="bullets">
          <li>
            Currently I’m an SDET at{' '}
            <Chip mark="VH" tip="Health-insurance TPA · Pune">Vidal Health TPA</Chip>, owning the
            API automation behind claims processing
          </li>
          <li>
            Previously I was automating at{' '}
            <Chip mark="BF" tip="Backend automation test intern, 2024">Bajaj Finserv Health</Chip>
          </li>
          <li>
            I work in Java 17, TestNG, Rest-Assured and Oracle SQL
            <Stack items={['J', 'T', 'R', 'S']} />
          </li>
          <li>2+ years into test automation, based in Pune</li>
          <li>
            I automated a <strong>190+</strong> case partner-integration regression suite across
            multiple REST APIs
          </li>
          <li>
            I hold a <Chip mark="©" tip="Wildlife conservation using machine learning">copyright</Chip>{' '}
            for a machine-learning conservation system
          </li>
          <li>
            Outside work I build API tooling and LLM apps, all on{' '}
            <Chip mark="GH" tip="github.com/suryavanshi-cmd" href={GITHUB_URL}>GitHub</Chip>
          </li>
        </ul>

        <div className="icon-row">
          <a href={`mailto:${EMAIL}`} aria-label="Email"><MailIcon /></a>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer noopener" aria-label="GitHub"><GitHubIcon /></a>
          <a href="/Gaurav-Suryavanshi-Resume.pdf" download aria-label="Résumé PDF"><FileIcon /></a>
          <span className="icon-row-divider" aria-hidden="true" />
          <button type="button" onClick={() => setLabOpen(true)} aria-haspopup="dialog" aria-expanded={labOpen}>
            ✦ How an LLM actually works
          </button>
        </div>
      </section>

      <section className="section" id="projects">
        <h2 className="section-label">Projects</h2>
        <ul className="list">
          {projects.map((project) => (
            <li key={project.title}>
              <div className="row">
                <span className="row-key">{project.key}</span>
                <span>
                  <span className="row-title">{project.title}</span>
                  <span className="row-note">{project.note}</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" id="timeline">
        <h2 className="section-label">Timeline</h2>
        <ul className="list">
          {timeline.map((entry) => (
            <li key={entry.title}>
              <div className="row">
                <span className="row-key">{entry.when}</span>
                <span>
                  <span className="row-title">{entry.title}</span>
                  {entry.note ? <span className="row-note">{entry.note}</span> : null}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h2 className="section-label">Say hello</h2>
        <ul className="bullets">
          <li>
            I’m open to SDET, API test automation, and LLM application engineering roles
          </li>
          <li>
            Send me the role or a problem you’re stuck on at{' '}
            <Chip mark="@" tip="Replies within a day or two" href={`mailto:${EMAIL}`}>{EMAIL}</Chip>
            {' '}— it reaches me directly
          </li>
        </ul>
      </section>

      <footer className="foot">Gaurav Suryavanshi — SDET · API automation · Pune</footer>

      {labOpen ? <LLMWhiteboard onClose={() => setLabOpen(false)} /> : null}
    </div>
  );
}
