'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import LLMWhiteboard from './LLMWhiteboard';
import ProjectDialog from './ProjectDialog';
import { projects, projectCategories } from './projects';
import { posts } from './posts';
import { useActiveSection, useProgress, useReveal } from './useReveal';

const GITHUB_URL = 'https://github.com/suryavanshi-cmd';
const EMAIL = 'gauravsuryvanshi06@gmail.com';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'llm-flow', label: 'LLM flows' },
  { key: 'llm-eval', label: 'LLM testing' },
  { key: 'automation', label: 'Automation' },
];

/* The reader's position indicator, and the anchor targets it tracks. */
const SECTIONS = [
  { id: 'top', label: 'Intro' },
  { id: 'summary', label: 'Summary' },
  { id: 'projects', label: 'Projects' },
  { id: 'interests', label: 'Interests' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'contact', label: 'Contact' },
];
const SECTION_IDS = SECTIONS.map((section) => section.id);

/* Things I'm interested in and writing about. `lab` opens the interactive
   explainer, `href` makes the row a link, and a row with neither is just a
   statement of interest — which is why the pattern allows all three.
   Written posts are pulled from the same source the article pages render. */
const INTERESTS = [
  {
    key: 'interactive',
    title: 'My notes on next-token prediction',
    note: 'Me working out what actually happens between a prompt and a word — tokens, embeddings, attention, logits, softmax, the pick. Notes I made while learning it, not a tutorial.',
    lab: true,
    flag: 'notes',
  },
  ...posts.map((post) => ({
    key: `${post.readingMinutes} min`,
    title: post.title,
    /* No `note`: a post row stays terse until it is opened, and the summary
       lives in the panel below rather than being shown twice. */
    post,
  })),
  {
    key: 'vision',
    title: 'Computer vision for conservation',
    note: 'The work behind my copyright registration — species analysis from survey imagery, and the class-imbalance problem that makes the rare species hardest to see.',
  },
];

const TICKER = [
  'Java 17', 'TestNG', 'Rest-Assured', 'Oracle SQL', 'Next.js', 'React', 'Node.js',
  'Playwright', 'RAG', 'Embeddings', 'Vector search', 'Guardrails', 'Evals in CI',
  'OpenTelemetry', 'GitHub Actions', 'Supabase', 'Docker',
];

/* A quiet index down the left margin on wide screens. Purely a shortcut — every
   section is reachable by scrolling, and the header nav covers narrow screens. */
function SectionIndex({ active }) {
  return (
    <nav className="index" aria-label="Page sections">
      {SECTIONS.map((section, position) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className={active === section.id ? 'is-here' : undefined}
          aria-current={active === section.id ? 'true' : undefined}
        >
          <i aria-hidden="true" />
          <span className="index-num">{String(position).padStart(2, '0')}</span>
          <span className="index-label">{section.label}</span>
        </a>
      ))}
    </nav>
  );
}

function Ticker() {
  /* Duplicated once so the translation can loop seamlessly; the copy is hidden
     from assistive tech so the list is not announced twice. */
  return (
    <div className="ticker" aria-label="Technologies I work in">
      <div className="ticker-move">
        <span className="ticker-run">
          {TICKER.map((item) => <b key={item}>{item}</b>)}
        </span>
        <span className="ticker-run" aria-hidden="true">
          {TICKER.map((item) => <b key={`${item}-copy`}>{item}</b>)}
        </span>
      </div>
    </div>
  );
}

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
  const [openPost, setOpenPost] = useState(null);

  /* A single-use token saying "this article was reached from the list", so the
     article's back control can return you to the exact spot you left instead of
     pushing a fresh /#interests entry. The article clears it on read, so a
     later deep link or refresh falls back to a plain link. */
  const rememberReturn = () => {
    try {
      window.sessionStorage.setItem('return-to-list', '1');
    } catch {
      /* Private mode or blocked storage — the article just uses its fallback. */
    }
  };
  const [openProject, setOpenProject] = useState(null);
  const [filter, setFilter] = useState('all');

  const visibleProjects = useMemo(
    () => (filter === 'all' ? projects : projects.filter((project) => project.key === filter)),
    [filter],
  );

  const progressRef = useProgress();
  const activeSection = useActiveSection(SECTION_IDS);
  // Re-scan after filtering so newly mounted rows are observed too.
  useReveal([filter]);

  /* While the lab is open it owns the screen: lock the page behind it and let
     Escape close it. Restores the previous overflow rather than clearing it.
     The project dialog manages its own lock, so only one is ever open. */
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
    <div className="shell" id="top">
      <div className="grain" aria-hidden="true" />
      <SectionIndex active={activeSection} />

      <header className="head">
        <span className="head-name">Gaurav Suryavanshi</span>
        <HeadMeta />
        <nav className="head-nav" aria-label="Sections">
          <a href="#projects">projects</a>
          <a href="#interests">interests</a>
          <a href="#timeline">timeline</a>
          <a href={`mailto:${EMAIL}`}>contact</a>
        </nav>
        <span className="head-progress" aria-hidden="true"><i ref={progressRef} /></span>
      </header>

      <div className="intro">
        <p data-rise>
          Hello! I’m Gaurav and you’ve found my tiny corner of the internet. I test and
          build the backend systems behind health insurance — the kind where a bug
          doesn’t just look wrong, it reaches somebody’s claim.
        </p>
        <span className="avatar" aria-hidden="true" data-rise style={{ '--rise': 1 }}>GS</span>
      </div>

      <Ticker />

      <section className="section" id="summary">
        <h2 className="section-label" data-rise><span aria-hidden="true">01</span>Summary</h2>
        <ul className="bullets stagger" data-rise>
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
          <li>
            Most of what I build now is <strong>LLM automation flows</strong> — agentic pipelines,
            document extraction, a routing gateway — and the <strong>LLM testing</strong> that keeps
            them honest: evals in CI, grounding checks, and red-teaming
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

        <div className="icon-row" data-rise>
          <a href={`mailto:${EMAIL}`} aria-label="Email"><MailIcon /></a>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer noopener" aria-label="GitHub"><GitHubIcon /></a>
          <a href="/Gaurav-Suryavanshi-Resume.pdf" download aria-label="Résumé PDF"><FileIcon /></a>
        </div>
      </section>

      <section className="section" id="projects">
        <h2 className="section-label" data-rise><span aria-hidden="true">02</span>Projects</h2>

        <div className="filters" role="group" aria-label="Filter projects" data-rise>
          {FILTERS.map((entry) => (
            <button
              type="button"
              key={entry.key}
              className={filter === entry.key ? 'is-on' : undefined}
              aria-pressed={filter === entry.key}
              onClick={() => setFilter(entry.key)}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <ul className="list stagger" data-rise key={filter}>
          {visibleProjects.map((project) => (
            <li key={project.title}>
              <button type="button" className="row row-open" onClick={() => setOpenProject(project)}>
                <span className="row-key">{project.key}</span>
                <span>
                  <span className="row-title">
                    {project.title}
                    {project.game ? <span className="row-flag">playable</span> : null}
                  </span>
                  <span className="row-note">{project.note}</span>
                </span>
                <span className="row-go" aria-hidden="true">→</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="list-hint" data-rise>
          {visibleProjects.length} {visibleProjects.length === 1 ? 'project' : 'projects'} — open any
          one for the problem, the flow, and what made it hard.
        </p>
      </section>

      <section className="section" id="interests">
        <h2 className="section-label" data-rise><span aria-hidden="true">03</span>Interests &amp; writing</h2>
        <ul className="list stagger" data-rise>
          {INTERESTS.map((entry) => {
            const inner = (
              <>
                <span className="row-key">{entry.key}</span>
                <span>
                  <span className="row-title">
                    {entry.title}
                    {entry.flag ? <span className="row-flag">{entry.flag}</span> : null}
                  </span>
                  <span className="row-note">{entry.note}</span>
                </span>
              </>
            );

            if (entry.lab) {
              return (
                <li key={entry.title}>
                  <button
                    type="button"
                    className="row row-open"
                    onClick={() => setLabOpen(true)}
                    aria-haspopup="dialog"
                    aria-expanded={labOpen}
                  >
                    {inner}
                    <span className="row-go" aria-hidden="true">→</span>
                  </button>
                </li>
              );
            }

            /* Two stages: the row opens a summary, and only "Read more"
               leaves the page. Clicking a title used to jump straight into the
               article with no chance to see what it was about. */
            if (entry.post) {
              const isOpen = openPost === entry.post.slug;
              return (
                <li key={entry.title}>
                  <button
                    type="button"
                    className={`row row-open row-peek ${isOpen ? 'is-open' : ''}`}
                    aria-expanded={isOpen}
                    aria-controls={`peek-${entry.post.slug}`}
                    onClick={() => setOpenPost(isOpen ? null : entry.post.slug)}
                  >
                    {inner}
                    <span className="row-go row-caret" aria-hidden="true">›</span>
                  </button>

                  <div
                    id={`peek-${entry.post.slug}`}
                    className={`peek ${isOpen ? 'is-open' : ''}`}
                    inert={!isOpen}
                  >
                    <div>
                      <div className="peek-inner">
                        <p>{entry.post.summary}</p>
                        <ul className="peek-tags">
                          {entry.post.tags.map((tag) => <li key={tag}>{tag}</li>)}
                        </ul>
                        <Link
                          className="peek-more"
                          href={`/blog/${entry.post.slug}`}
                          onClick={rememberReturn}
                        >
                          Read more <span aria-hidden="true">→</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              );
            }

            return (
              <li key={entry.title}>
                <div className="row">{inner}</div>
              </li>
            );
          })}
        </ul>
        <p className="list-hint" data-rise>
          The first one is playable — it animates a single next-token prediction end to end.
        </p>
      </section>

      <section className="section" id="timeline">
        <h2 className="section-label" data-rise><span aria-hidden="true">04</span>Timeline</h2>
        <ul className="list stagger" data-rise>
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

      <section className="section" id="contact">
        <h2 className="section-label" data-rise><span aria-hidden="true">05</span>Say hello</h2>
        <ul className="bullets stagger" data-rise>
          <li>
            I’m open to LLM application engineering, AI evaluation and testing, and SDET / API
            automation roles
          </li>
          <li>
            Send me the role or a problem you’re stuck on at{' '}
            <Chip mark="@" tip="Replies within a day or two" href={`mailto:${EMAIL}`}>{EMAIL}</Chip>
            {' '}— it reaches me directly
          </li>
        </ul>
      </section>

      <footer className="foot" data-rise>Gaurav Suryavanshi — SDET · API automation · Pune</footer>

      {labOpen ? <LLMWhiteboard onClose={() => setLabOpen(false)} /> : null}
      {openProject ? (
        <ProjectDialog project={openProject} onClose={() => setOpenProject(null)} />
      ) : null}
    </div>
  );
}
