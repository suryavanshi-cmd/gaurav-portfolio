'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const themes = [
  { key: 'dark', label: 'Dark' },
  { key: 'read', label: 'Read' },
  { key: 'sky', label: 'Sky' },
  { key: 'night', label: 'Night' },
];

const categories = [
  {
    key: 'llm',
    eyebrow: 'LLM & AI systems',
    title: 'Intelligent products with measurable guardrails.',
    description:
      'Production-minded LLM workflows that combine retrieval, structured outputs, evaluation, and human-readable execution traces.',
    architecture: ['Input', 'Context', 'LLM tools', 'Guardrails', 'Output'],
  },
  {
    key: 'automation',
    eyebrow: 'Automation & delivery',
    title: 'Complex workflows made visible and repeatable.',
    description:
      'API journey automation, dependency discovery, release readiness, observability, and customer implementation workspaces.',
    architecture: ['Capture', 'Map', 'Execute', 'Assert', 'Report'],
  },
  {
    key: 'platform',
    eyebrow: 'Web server & data',
    title: 'Secure infrastructure-facing developer tools.',
    description:
      'Apache HTTPS operations, reverse-proxy workflows, request-log analysis, Supabase persistence, and SQLite-friendly demos.',
    architecture: ['Apache', 'Next.js', 'API route', 'Supabase', 'Insight'],
  },
];

const projects = [
  {
    id: 'llm-workflow-studio',
    category: 'llm',
    icon: '◈',
    title: 'LLM Workflow Automation Studio',
    type: 'AI orchestration',
    level: 'Advanced',
    description:
      'Transforms business requirements into structured execution plans with dependencies, validations, fallback paths, and traceable outputs.',
    impact: 'Reduces manual solution design and makes generated workflows reviewable before implementation.',
    tech: ['Next.js', 'LLM', 'Structured output', 'Tool calling', 'JSON Schema'],
    steps: ['Parse requirement', 'Extract constraints', 'Generate dependency graph', 'Run schema checks', 'Prepare execution plan'],
    sample: {
      requirement: 'Design an API release approval workflow with rollback checks',
      environment: 'uat',
      outputFormat: 'dependency-aware JSON plan',
    },
    features: ['Dependency-aware step generation', 'Schema validation', 'Editable runtime input', 'Execution trace simulation'],
    challenges: ['Avoiding vague generated steps', 'Keeping outputs deterministic', 'Representing fallback paths clearly'],
    future: ['Saved workflow templates', 'Multi-model evaluation', 'Real tool execution through approved connectors'],
  },
  {
    id: 'rag-knowledge-assistant',
    category: 'llm',
    icon: '⌁',
    title: 'Grounded Knowledge Assistant',
    type: 'RAG application',
    level: 'Advanced',
    description:
      'A source-aware assistant for engineering runbooks, API specifications, incident notes, and customer implementation documentation.',
    impact: 'Shortens investigation time while keeping answers connected to retrieved operational context.',
    tech: ['RAG', 'Embeddings', 'Supabase', 'Vector search', 'Evaluation'],
    steps: ['Ingest documents', 'Chunk and index', 'Retrieve context', 'Generate grounded answer', 'Score citation coverage'],
    sample: {
      question: 'Why did the deployment readiness check fail?',
      sources: ['runbook', 'release log', 'API health report'],
      responseMode: 'answer with evidence',
    },
    features: ['Document ingestion pipeline', 'Hybrid retrieval concept', 'Source-aware responses', 'Answer quality scoring'],
    challenges: ['Noisy enterprise documents', 'Context-window limits', 'Separating evidence from inference'],
    future: ['Role-based collections', 'Feedback-driven reranking', 'Automated freshness checks'],
  },
  {
    id: 'llm-evaluation-console',
    category: 'llm',
    icon: '◎',
    title: 'LLM Evaluation & Guardrails Console',
    type: 'AI quality engineering',
    level: 'Advanced',
    description:
      'Evaluates generated responses for correctness, business-rule compliance, format accuracy, hallucination risk, and unsafe disclosure.',
    impact: 'Adds testable acceptance criteria before LLM features are released to users.',
    tech: ['LLM evaluation', 'Guardrails', 'Golden datasets', 'Scoring', 'Observability'],
    steps: ['Load test case', 'Run model response', 'Apply deterministic checks', 'Score semantic quality', 'Generate release verdict'],
    sample: {
      testCase: 'Explain a failed claim-status API response',
      checks: ['required fields', 'business rules', 'unsupported claims', 'tone'],
      threshold: 0.85,
    },
    features: ['Deterministic and semantic checks', 'Pass/warn/fail verdicts', 'Regression-ready datasets', 'Readable failure reasons'],
    challenges: ['Balancing strictness and usefulness', 'Measuring hallucination consistently', 'Keeping evaluators independent'],
    future: ['Cost and latency scorecards', 'Model comparison', 'Production feedback replay'],
  },
  {
    id: 'dynamic-api-journey',
    category: 'automation',
    icon: '↯',
    title: 'Dynamic API Journey Automation',
    type: 'API automation platform',
    level: 'Advanced',
    description:
      'Builds and executes multi-step API journeys where response values are extracted, mapped, transformed, and reused in later requests.',
    impact: 'Makes complex API sequencing reusable across QA, development, and implementation teams.',
    tech: ['Java', 'Rest Assured', 'TestNG', 'JSONPath', 'CI/CD'],
    steps: ['Load journey definition', 'Resolve variables', 'Execute API request', 'Extract response values', 'Assert and publish report'],
    sample: {
      journey: 'register claim → view details → save tariff → settlement validation',
      environment: 'uat',
      assertions: ['HTTP status', 'business status', 'schema', 'dependent values'],
    },
    features: ['Scoped value store', 'Nested-to-flat field mapping', 'Reusable assertions', 'Environment-aware execution'],
    challenges: ['Different field names across APIs', 'Multipart dependency mapping', 'Preventing false-positive matches'],
    future: ['Team-managed mappings', 'Parallel journey execution', 'Contract-drift alerts'],
  },
  {
    id: 'har-dependency-discovery',
    category: 'automation',
    icon: '⌘',
    title: 'HAR Replay & Dependency Discovery',
    type: 'Developer tooling',
    level: 'Advanced',
    description:
      'Converts browser HAR traffic into replayable API flows and discovers likely request dependencies from earlier responses.',
    impact: 'Accelerates automation onboarding for complex applications with limited API documentation.',
    tech: ['Node.js', 'HAR', 'Playwright', 'Dependency graph', 'Streaming UI'],
    steps: ['Parse HAR traffic', 'Remove noise and secrets', 'Detect value producers', 'Build request templates', 'Replay with live status'],
    sample: {
      source: 'claims-processing.har',
      discovery: 'response.result.claimSeqID → later request body.ClaimSeqID',
      overrideMode: 'user mappings take priority',
    },
    features: ['Secret redaction', 'Confidence-ranked mappings', 'User override mappings', 'Step-level request and response diagnostics'],
    challenges: ['Repeated IDs with different meanings', 'Large payloads', 'Authentication refresh during replay'],
    future: ['Visual graph editing', 'AI-assisted mapping explanations', 'Distributed runners'],
  },
  {
    id: 'release-observability-console',
    category: 'automation',
    icon: '△',
    title: 'Release & API Observability Console',
    type: 'Deployment engineering',
    level: 'Advanced',
    description:
      'Combines build checks, deployment state, API health, latency, error trends, environment readiness, and rollback guidance.',
    impact: 'Provides one decision surface for release confidence instead of scattered logs and dashboards.',
    tech: ['Next.js', 'Vercel', 'GitHub', 'KQL', 'OpenTelemetry'],
    steps: ['Collect deployment state', 'Validate environment', 'Probe critical APIs', 'Summarize errors', 'Produce go/no-go verdict'],
    sample: {
      release: 'claims-v4-uat',
      checks: ['build', 'deployment', 'health endpoints', '5xx trend', 'rollback candidate'],
      decision: 'release readiness',
    },
    features: ['Readiness scorecard', 'Error clustering', 'Rollback context', 'Environment comparison'],
    challenges: ['Normalizing signals from many tools', 'Avoiding alert noise', 'Showing enough context without overload'],
    future: ['Automated release gates', 'Incident timeline generation', 'SLO-aware recommendations'],
  },
  {
    id: 'customer-implementation-workspace',
    category: 'automation',
    icon: '◇',
    title: 'Customer Implementation Workspace',
    type: 'Forward deployment',
    level: 'Advanced',
    description:
      'Turns customer requirements into technical workstreams, owners, risks, milestones, API mappings, and implementation status.',
    impact: 'Connects customer outcomes with clear engineering execution and delivery accountability.',
    tech: ['Next.js', 'Supabase', 'Workflow design', 'API integration', 'Delivery analytics'],
    steps: ['Capture requirement', 'Map solution components', 'Identify dependencies', 'Track milestones', 'Publish implementation summary'],
    sample: {
      customerNeed: 'Integrate insurer claim-status updates',
      constraints: ['existing API gateway', 'UAT approval', 'no downtime'],
      deliverable: 'implementation plan and progress board',
    },
    features: ['Requirement-to-task traceability', 'Risk and dependency tracking', 'Implementation notes', 'Executive-ready status'],
    challenges: ['Ambiguous requirements', 'Cross-team ownership', 'Changing external API constraints'],
    future: ['Customer portal views', 'Automated meeting summaries', 'Connector-based status sync'],
  },
  {
    id: 'apache-monitoring-console',
    category: 'platform',
    icon: '▦',
    title: 'Apache HTTPS Deployment & Monitoring Console',
    type: 'Web server operations',
    level: 'Intermediate',
    description:
      'Monitors Apache virtual hosts, HTTPS redirects, certificate expiry, upstream health, and access or error log patterns.',
    impact: 'Surfaces configuration and certificate risks before they become user-facing incidents.',
    tech: ['Apache HTTP Server', 'HTTPS', 'Next.js', 'Supabase', 'REST APIs'],
    steps: ['Load virtual hosts', 'Validate redirect chain', 'Check certificate dates', 'Probe upstream health', 'Store health snapshot'],
    sample: {
      domain: 'app.example.com',
      virtualHost: '443_ssl_vhost',
      checks: ['HTTPS redirect', 'certificate expiry', 'proxy health', '5xx trend'],
    },
    features: ['Virtual-host inventory', 'TLS readiness checks', 'Redirect validation', 'Operational health snapshots'],
    challenges: ['Representing server configuration safely', 'Separating demo data from real infrastructure', 'Summarizing noisy logs'],
    future: ['Certificate reminders', 'Configuration import', 'Role-based operations views'],
  },
  {
    id: 'secure-upload-proxy',
    category: 'platform',
    icon: '▣',
    title: 'Secure Upload Portal with Apache Reverse Proxy',
    type: 'Secure internal platform',
    level: 'Intermediate',
    description:
      'A protected document workflow behind Apache HTTPS termination with upload validation, metadata tracking, and audit-friendly status.',
    impact: 'Creates a traceable internal upload experience without exposing backend services directly.',
    tech: ['Apache mod_proxy', 'Next.js', 'Supabase Storage', 'RLS', 'Audit trail'],
    steps: ['Authenticate user', 'Validate metadata', 'Enforce upload rules', 'Store document reference', 'Track processing status'],
    sample: {
      userRole: 'operations-reviewer',
      route: '/secure/upload',
      file: 'claim-document.pdf',
      controls: ['type', 'size', 'ownership', 'audit event'],
    },
    features: ['Reverse-proxy architecture', 'Upload validation', 'RLS-aware metadata', 'Operational audit trail'],
    challenges: ['Large file handling', 'Secure access boundaries', 'Reliable status transitions'],
    future: ['Malware scanning integration', 'Signed access links', 'Retention-policy automation'],
  },
  {
    id: 'api-log-explorer',
    category: 'platform',
    icon: '▤',
    title: 'API Request & Error Log Explorer',
    type: 'Log analytics',
    level: 'Intermediate',
    description:
      'Normalizes Apache and API logs into searchable incidents grouped by route, status, correlation ID, release, and recurring error signature.',
    impact: 'Reduces the time required to identify repeated 4xx and 5xx failures across environments.',
    tech: ['Apache logs', 'Next.js', 'PostgreSQL', 'SQLite', 'Analytics UI'],
    steps: ['Import logs', 'Normalize fields', 'Group recurring failures', 'Trace correlation IDs', 'Export investigation summary'],
    sample: {
      source: 'apache-access.log',
      filters: ['POST', '500', 'REQ-2026-0716-001'],
      grouping: 'endpoint + status + normalized error',
    },
    features: ['Fast filters', 'Recurring-error grouping', 'Correlation tracing', 'Shareable investigation summary'],
    challenges: ['Protecting sensitive log fields', 'Handling inconsistent formats', 'Keeping large datasets responsive'],
    future: ['Streaming ingestion', 'Anomaly detection', 'Saved investigations'],
  },
];

const skills = [
  'Java',
  'JavaScript',
  'Next.js',
  'React',
  'Node.js',
  'LLM workflows',
  'RAG',
  'AI evaluation',
  'REST APIs',
  'TestNG',
  'Rest Assured',
  'Playwright',
  'Supabase',
  'PostgreSQL',
  'SQLite',
  'Vercel',
  'GitHub',
  'CI/CD',
  'Apache HTTP Server',
  'Observability',
];

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function ThemeSwitcher({ theme, onChange }) {
  return (
    <div className="theme-switcher" aria-label="Choose site theme">
      {themes.map((item) => (
        <button
          key={item.key}
          type="button"
          className={theme === item.key ? 'active' : ''}
          onClick={() => onChange(item.key)}
          aria-pressed={theme === item.key}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function ProjectCard({ project, onOpen }) {
  return (
    <article className={`project-card category-${project.category}`}>
      <div className="project-visual" aria-hidden="true">
        <span>{project.icon}</span>
        <div className="visual-lines" />
      </div>
      <div className="project-body">
        <div className="project-meta">
          <span>{project.type}</span>
          <span>{project.level}</span>
        </div>
        <h3>{project.title}</h3>
        <p>{project.description}</p>
        <div className="impact"><strong>Impact</strong>{project.impact}</div>
        <div className="tag-list">
          {project.tech.slice(0, 5).map((item) => <span key={item}>{item}</span>)}
        </div>
        <button type="button" className="card-action" onClick={() => onOpen(project)}>
          Open interactive case study <span aria-hidden="true">↗</span>
        </button>
      </div>
    </article>
  );
}

function ProjectModal({ project, input, setInput, runSteps, runOutput, running, onRun, onClose }) {
  if (!project) return null;
  const category = categories.find((item) => item.key === project.category);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <article className="project-modal" role="dialog" aria-modal="true" aria-labelledby="project-title" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close project details">×</button>
        <header className="modal-header">
          <div className="modal-kicker"><span>{project.icon}</span>{project.type} · {project.level}</div>
          <h2 id="project-title">{project.title}</h2>
          <p>{project.description}</p>
          <div className="tag-list large">
            {project.tech.map((item) => <span key={item}>{item}</span>)}
          </div>
        </header>

        <div className="modal-content">
          <section className="architecture-panel" aria-label="Project architecture">
            <div className="section-label">Architecture</div>
            <div className="architecture-flow">
              {category.architecture.map((item, index) => (
                <div className="architecture-node" key={item}>
                  <small>0{index + 1}</small>
                  <strong>{item}</strong>
                </div>
              ))}
            </div>
          </section>

          <div className="detail-grid">
            <div className="detail-card"><h4>Key features</h4><ul>{project.features.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div className="detail-card"><h4>Engineering challenges</h4><ul>{project.challenges.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div className="detail-card full"><h4>Next iteration</h4><ul className="inline-list">{project.future.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </div>

          <section className="workflow-console" aria-label="Interactive workflow simulation">
            <div className="console-bar"><div><i /><i /><i /></div><span>workflow-simulation.json</span></div>
            <div className="console-grid">
              <div className="editor-panel">
                <label htmlFor="workflow-input">Editable sample input</label>
                <textarea id="workflow-input" value={input} onChange={(event) => setInput(event.target.value)} spellCheck="false" />
                <button type="button" className="primary-button" onClick={onRun} disabled={running}>
                  {running ? 'Running workflow…' : 'Run workflow simulation'}
                </button>
              </div>
              <div className="execution-panel">
                <div className="step-list">
                  {runSteps.map((step, index) => (
                    <div className={`run-step ${step.status}`} key={`${step.name}-${index}`}>
                      <span>{step.status === 'passed' ? '✓' : step.status === 'running' ? '•' : index + 1}</span>
                      <strong>{step.name}</strong>
                      <small>{step.status}</small>
                    </div>
                  ))}
                </div>
                <div className="output-panel">
                  <small>SIMULATED OUTPUT</small>
                  <pre>{runOutput}</pre>
                </div>
              </div>
            </div>
          </section>
        </div>
      </article>
    </div>
  );
}

export default function Page() {
  const [theme, setTheme] = useState('dark');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProject, setSelectedProject] = useState(null);
  const [workflowInput, setWorkflowInput] = useState('');
  const [runSteps, setRunSteps] = useState([]);
  const [runOutput, setRunOutput] = useState('Ready. Edit the input and run the workflow.');
  const [running, setRunning] = useState(false);
  const [contactState, setContactState] = useState({ status: 'idle', message: '' });
  const runIdRef = useRef(0);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('portfolio-theme');
    setTheme(themes.some((item) => item.key === savedTheme) ? savedTheme : 'dark');
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('portfolio-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') setSelectedProject(null);
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = selectedProject ? 'hidden' : '';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [selectedProject]);

  const visibleProjects = useMemo(
    () => activeCategory === 'all' ? projects : projects.filter((project) => project.category === activeCategory),
    [activeCategory],
  );

  function openProject(project) {
    runIdRef.current += 1;
    setSelectedProject(project);
    setWorkflowInput(JSON.stringify(project.sample, null, 2));
    setRunSteps(project.steps.map((name) => ({ name, status: 'waiting' })));
    setRunOutput('Ready. Edit the input and run the workflow.');
    setRunning(false);
  }

  function closeProject() {
    runIdRef.current += 1;
    setSelectedProject(null);
    setRunning(false);
  }

  async function runWorkflow() {
    if (!selectedProject || running) return;
    let parsedInput;
    try {
      parsedInput = JSON.parse(workflowInput);
    } catch {
      setRunOutput('Input validation failed: provide valid JSON before running the workflow.');
      return;
    }

    const currentRunId = runIdRef.current + 1;
    runIdRef.current = currentRunId;
    setRunning(true);
    setRunOutput('Execution started…');
    setRunSteps(selectedProject.steps.map((name) => ({ name, status: 'waiting' })));

    for (let index = 0; index < selectedProject.steps.length; index += 1) {
      if (runIdRef.current !== currentRunId) return;
      setRunSteps((current) => current.map((step, stepIndex) => ({
        ...step,
        status: stepIndex < index ? 'passed' : stepIndex === index ? 'running' : 'waiting',
      })));
      await wait(430);
      setRunSteps((current) => current.map((step, stepIndex) => ({
        ...step,
        status: stepIndex <= index ? 'passed' : 'waiting',
      })));
    }

    if (runIdRef.current !== currentRunId) return;
    setRunOutput(JSON.stringify({
      status: 'SUCCESS',
      project: selectedProject.title,
      executedSteps: selectedProject.steps.length,
      validation: 'PASSED',
      input: parsedInput,
      message: 'Simulation completed. The production implementation would execute approved APIs, tools, and persistence operations.',
    }, null, 2));
    setRunning(false);
  }

  async function submitContact(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get('name') || '').trim(),
      email: String(data.get('email') || '').trim(),
      message: String(data.get('message') || '').trim(),
      company: String(data.get('company') || '').trim(),
    };

    setContactState({ status: 'loading', message: 'Sending your message…' });
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Unable to send your message.');
      form.reset();
      setContactState({ status: 'success', message: 'Message received. Thank you — I will get back to you soon.' });
    } catch (error) {
      setContactState({ status: 'error', message: error.message || 'Unable to send your message.' });
    }
  }

  return (
    <main>
      <div className="ambient-background" aria-hidden="true"><div /><div /><div /></div>

      <header className="site-header">
        <div className="container nav-row">
          <a href="#top" className="brand" aria-label="Gaurav Suryavanshi home">
            <span>GS</span>
            <div><strong>Gaurav Suryavanshi</strong><small>Forward Deployment Engineer</small></div>
          </a>
          <nav aria-label="Primary navigation">
            <a href="#work">Work</a>
            <a href="#capabilities">Capabilities</a>
            <a href="#contact">Contact</a>
          </nav>
          <ThemeSwitcher theme={theme} onChange={setTheme} />
        </div>
      </header>

      <section className="hero" id="top">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="availability"><i /> Open to development and forward-deployment opportunities</div>
            <p className="eyebrow">LLM applications · API automation · production delivery</p>
            <h1>I turn complex workflows into <span>reliable products.</span></h1>
            <p className="hero-description">
              Software engineer with two years of experience building API automation, developer tools, LLM-enabled workflows, observability dashboards, and customer-focused implementation systems.
            </p>
            <div className="hero-actions">
              <a className="primary-button" href="#work">Explore selected work</a>
              <a className="secondary-button" href="#contact">Start a conversation</a>
            </div>
            <div className="hero-stats">
              <div><strong>2+</strong><span>years building and shipping</span></div>
              <div><strong>API-first</strong><span>automation and integration</span></div>
              <div><strong>End-to-end</strong><span>from requirement to release</span></div>
            </div>
          </div>

          <div className="hero-console" aria-label="Current engineering focus">
            <div className="console-bar"><div><i /><i /><i /></div><span>delivery-console</span></div>
            <div className="hero-console-content">
              <div className="signal-ring"><div><strong>READY</strong><small>production mindset</small></div></div>
              <div className="signal-list">
                <div><span>LLM workflow engineering</span><b>ACTIVE</b></div>
                <div><span>Complex API automation</span><b>ACTIVE</b></div>
                <div><span>Forward deployment</span><b>ACTIVE</b></div>
                <div><span>Release observability</span><b>ACTIVE</b></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="work-section" id="work">
        <div className="container">
          <div className="section-heading">
            <div><p className="eyebrow">Selected engineering work</p><h2>Projects designed around real delivery problems.</h2></div>
            <p>Each case study includes the problem, architecture, technical decisions, and an editable workflow simulation.</p>
          </div>

          <div className="project-filters" role="group" aria-label="Filter projects">
            <button type="button" className={activeCategory === 'all' ? 'active' : ''} onClick={() => setActiveCategory('all')}>All projects</button>
            {categories.map((category) => (
              <button type="button" key={category.key} className={activeCategory === category.key ? 'active' : ''} onClick={() => setActiveCategory(category.key)}>
                {category.eyebrow}
              </button>
            ))}
          </div>

          {categories.map((category) => {
            const categoryProjects = visibleProjects.filter((project) => project.category === category.key);
            if (!categoryProjects.length) return null;
            return (
              <div className="project-group" key={category.key}>
                <div className="group-heading">
                  <div><p className="eyebrow">{category.eyebrow}</p><h3>{category.title}</h3></div>
                  <p>{category.description}</p>
                </div>
                <div className="project-grid">
                  {categoryProjects.map((project) => <ProjectCard key={project.id} project={project} onOpen={openProject} />)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="capabilities-section" id="capabilities">
        <div className="container capabilities-grid">
          <div>
            <p className="eyebrow">Engineering capabilities</p>
            <h2>Strong at the boundary between customer needs and production systems.</h2>
            <p>My work combines hands-on development, automation quality, solution design, debugging, and release ownership.</p>
          </div>
          <div className="capability-cards">
            <article><span>01</span><h3>Discover</h3><p>Translate unclear requirements, API traffic, logs, and workflow behavior into an implementable technical model.</p></article>
            <article><span>02</span><h3>Build</h3><p>Create reliable Next.js applications, automation frameworks, integration utilities, and data-backed operational tools.</p></article>
            <article><span>03</span><h3>Validate</h3><p>Use assertions, observability, guardrails, test datasets, and failure-focused diagnostics to improve release confidence.</p></article>
            <article><span>04</span><h3>Deploy</h3><p>Connect GitHub, Vercel, Supabase, CI/CD, environment configuration, monitoring, and rollback-aware delivery.</p></article>
          </div>
        </div>
        <div className="container skill-cloud" aria-label="Technical skills">
          {skills.map((skill) => <span key={skill}>{skill}</span>)}
        </div>
      </section>

      <section className="contact-section" id="contact">
        <div className="container contact-grid">
          <div>
            <p className="eyebrow">Let’s build something useful</p>
            <h2>Need an engineer who can understand the workflow and ship the implementation?</h2>
            <p>I am interested in software engineering, LLM application engineering, automation platforms, and forward-deployment roles.</p>
            <a href="mailto:gaurav.suryavanshi@bfhl.in" className="email-link">gaurav.suryavanshi@bfhl.in ↗</a>
            <div className="connection-status"><i /><span>Supabase-backed contact workflow</span></div>
          </div>
          <form className="contact-form" onSubmit={submitContact}>
            <label>Name<input name="name" type="text" minLength="2" maxLength="120" autoComplete="name" required placeholder="Your name" /></label>
            <label>Email<input name="email" type="email" maxLength="254" autoComplete="email" required placeholder="you@company.com" /></label>
            <label>Message<textarea name="message" minLength="10" maxLength="4000" required placeholder="Tell me about the role, project, or problem." /></label>
            <label className="honeypot" aria-hidden="true">Company<input name="company" type="text" tabIndex="-1" autoComplete="off" /></label>
            <button className="primary-button" type="submit" disabled={contactState.status === 'loading'}>
              {contactState.status === 'loading' ? 'Sending…' : 'Send message'}
            </button>
            <p className={`form-status ${contactState.status}`} role="status">{contactState.message}</p>
          </form>
        </div>
      </section>

      <footer>
        <div className="container footer-row">
          <div><strong>Gaurav Suryavanshi</strong><span>Development · LLM · Automation · Forward Deployment</span></div>
          <p>Built with Next.js, deployed on Vercel, and connected to Supabase.</p>
        </div>
      </footer>

      <ProjectModal
        project={selectedProject}
        input={workflowInput}
        setInput={setWorkflowInput}
        runSteps={runSteps}
        runOutput={runOutput}
        running={running}
        onRun={runWorkflow}
        onClose={closeProject}
      />
    </main>
  );
}
