'use client';

import { useEffect, useState } from 'react';
import VersionSwitcher from '../VersionSwitcher';

const GITHUB_URL = 'https://github.com/suryavanshi-cmd';
const EMAIL = 'gauravsuryvanshi06@gmail.com';

/* Every chip below is a fact from the résumé. `tip` is the expansion shown on
   hover; `mark` is the two-character stand-in that sits where the reference
   site puts a company logo. */
function Chip({ mark, children, tip, href }) {
  const Tag = href ? 'a' : 'span';
  const linkProps = href
    ? { href, ...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer noopener' } : {}) }
    : {};
  return (
    <Tag className="v3-chip" tabIndex={href ? undefined : 0} {...linkProps}>
      {mark ? <span className="v3-chip-mark" aria-hidden="true">{mark}</span> : null}
      {children}
      {tip ? <span className="v3-chip-tip" role="tooltip">{tip}</span> : null}
    </Tag>
  );
}

const projects = [
  { key: 'automation', title: 'Generic Dynamic Journey Builder', note: 'Parses Chrome DevTools HAR exports and replays them as repeatable REST journeys, with variable extraction and dependency chaining.' },
  { key: 'automation', title: 'JSON-Driven API Sequencing Engine', note: 'Config-driven orchestration of chained API calls, with retry/polling, SSE streaming, and a visual builder for composing runs.' },
  { key: 'release', title: 'API Contract Drift Detector', note: 'Diffs OpenAPI specs between environments, classifies each change as breaking or safe, and gates the deploy on the verdict.' },
  { key: 'llm', title: 'LLM Evaluation & Guardrails Console', note: 'Scores generated answers for correctness, business-rule compliance, and hallucination risk before a feature ships.' },
  { key: 'llm', title: 'Grounded Knowledge Assistant', note: 'Retrieval-backed assistant over runbooks and API specs that keeps every answer attached to its source.' },
  { key: 'ml', title: 'Wildlife Conservation Analysis', note: 'Computer-vision pipeline for species analysis — the work behind my copyright registration.' },
];

const timeline = [
  { when: '2024 — now', title: 'SDET · Vidal Health TPA, Pune', note: 'Own the Java 17 + TestNG + Rest-Assured API automation framework for health-insurance claims processing.' },
  { when: '2024', title: 'Backend Automation Test Intern · Bajaj Finserv Health', note: 'Built a microservice that generated and ran curl commands from HTTPS response logs pulled off the ELK stack.' },
  { when: '2020 — 2024', title: 'B.E. Computer Science · PCCOER, Pune', note: 'CGPA 8.96 / 10.' },
  { when: 'Cert', title: 'Introduction to Generative AI · Udemy' },
  { when: 'Cert', title: 'Introduction to Machine Learning · Coursera' },
  { when: 'Cert', title: 'Java · Udemy' },
  { when: 'Copyright', title: 'Wildlife Conservation and Analysis Using Machine Learning' },
];

/* Pune local time. Rendered empty on the server and filled in after mount —
   the server has no way to know the viewer's clock, and guessing would
   guarantee a hydration mismatch. */
function PuneClock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const format = () =>
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date());

    setTime(format());
    const id = window.setInterval(() => setTime(format()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className="v3-clock">
      {time ? `Pune · ${time}` : 'Pune, IN'}
    </span>
  );
}

export default function PortfolioV3() {
  return (
    <div className="v3-shell">
      <header className="v3-head">
        <span className="v3-head-name">Gaurav Suryavanshi</span>
        <div className="v3-head-right">
          <nav className="v3-nav" aria-label="Sections">
            <a href="#projects">projects</a>
            <a href="#timeline">timeline</a>
            <a href={`mailto:${EMAIL}`}>contact</a>
          </nav>
          <PuneClock />
          <VersionSwitcher current="v3" />
        </div>
      </header>

      <p className="v3-intro">
        Hello! I’m Gaurav, and you’ve found the quiet corner of the internet where I keep my work.
        I test and build backend systems for a living — mostly the kind where a bug doesn’t just
        look wrong, it reaches somebody’s insurance claim.
      </p>

      <section className="v3-section v3-summary">
        <h2 className="v3-section-label">Summary</h2>
        <p>
          Right now I’m an SDET at{' '}
          <Chip mark="VH" tip="Health-insurance TPA · Pune">Vidal Health TPA</Chip>, where I own the
          API automation framework behind claims processing. I work mostly in{' '}
          <Chip mark="JA" tip="Java 17">Java</Chip>,{' '}
          <Chip mark="TN" tip="Test orchestration and parallel suites">TestNG</Chip>,{' '}
          <Chip mark="RA" tip="REST API testing">Rest-Assured</Chip> and{' '}
          <Chip mark="SQ" tip="Database-level assertions">Oracle SQL</Chip>.
        </p>
        <p>
          Before that I was a backend automation intern at{' '}
          <Chip mark="BF" tip="Bajaj Finserv Health">Bajaj Finserv</Chip>, turning ELK response logs
          into runnable curl suites. I studied computer science at{' '}
          <Chip mark="PC" tip="B.E. CSE · CGPA 8.96">PCCOER, Pune</Chip>.
        </p>
        <p>
          Outside the day job I build — an{' '}
          <Chip mark="HA" tip="HAR-driven API journey replay" href="#projects">HAR journey replayer</Chip>, a{' '}
          <Chip mark="DR" tip="Breaking-change detection for OpenAPI" href="#projects">contract drift detector</Chip>, and a few{' '}
          <Chip mark="AI" tip="Evaluation, guardrails, retrieval" href="#projects">LLM tools</Chip>{' '}
          with actual guardrails on them. Code lives on{' '}
          <Chip mark="GH" tip="github.com/suryavanshi-cmd" href={GITHUB_URL}>GitHub</Chip>.
        </p>
      </section>

      <section className="v3-section">
        <h2 className="v3-section-label">A few facts</h2>
        <ul className="v3-facts">
          <li><b>2+</b> years into test automation, based in Pune.</li>
          <li>Automated a <b>190+</b> case partner-integration regression suite across multiple REST APIs.</li>
          <li>Tuned TestNG for parallel execution to cut regression time and steady CI feedback.</li>
          <li>Hold a <b>copyright</b> for a machine-learning wildlife conservation system.</li>
          <li>Graduated with a <b>8.96</b> / 10 CGPA in computer engineering.</li>
        </ul>
      </section>

      <section className="v3-section" id="projects">
        <h2 className="v3-section-label">Projects</h2>
        <ul className="v3-list">
          {projects.map((project) => (
            <li key={project.title}>
              <div className="v3-row">
                <span className="v3-row-key">{project.key}</span>
                <span>
                  <span className="v3-row-title">{project.title}</span>
                  <span className="v3-row-note">{project.note}</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="v3-section" id="timeline">
        <h2 className="v3-section-label">Timeline</h2>
        <ul className="v3-list">
          {timeline.map((entry) => (
            <li key={entry.title}>
              <div className="v3-row">
                <span className="v3-row-key">{entry.when}</span>
                <span>
                  <span className="v3-row-title">{entry.title}</span>
                  {entry.note ? <span className="v3-row-note">{entry.note}</span> : null}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="v3-section">
        <h2 className="v3-section-label">Say hello</h2>
        <p className="v3-summary">
          <span>
            I’m open to SDET, API test automation, and LLM application engineering roles. Send me the
            role or a problem you’re stuck on at{' '}
            <Chip mark="@" tip="Replies within a day or two" href={`mailto:${EMAIL}`}>{EMAIL}</Chip>{' '}
            — it reaches me directly.
          </span>
        </p>
      </section>

      <footer className="v3-foot">
        <span>Gaurav Suryavanshi — SDET</span>
        <span className="v3-foot-links">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer noopener">GitHub</a>
          <a href={`mailto:${EMAIL}`}>Email</a>
          <a href="/Gaurav-Suryavanshi-Resume.pdf" download>Résumé</a>
          <a href="/versions">All versions</a>
        </span>
      </footer>
    </div>
  );
}
