'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CountUp, TypeCycle } from '../../components/Kinetic';
import VersionSwitcher from '../../components/VersionSwitcher';

const terminalLines = [
  'running 190+ partner-integration cases in parallel…',
  'replaying HAR captures into repeatable API journeys…',
  'asserting Oracle SQL data behind every API response…',
  'validating blue-green migrations and live SSE claim flows…',
  'wiring TestNG suites into CI for faster release feedback…',
];

const pulseMetrics = [
  { value: 190, suffix: '+', label: 'Automated regression cases' },
  { value: 2, suffix: '+ yrs', label: 'Owning API automation' },
  { value: 13, suffix: '', label: 'Case studies on this site' },
  { value: 3, suffix: '', label: 'Engineering roles shipped' },
];

const themes = [
  { key: 'dark', label: 'Dark' },
  { key: 'cold', label: 'Cold' },
  { key: 'summer', label: 'Summer' },
  { key: 'rainy', label: 'Rainy' },
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
      'API journey automation, contract safety, release readiness, observability, and customer implementation workspaces.',
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
  {
    key: 'personal',
    eyebrow: 'Personal & academic projects',
    title: 'Independent tools built outside of day-to-day work.',
    description:
      'Real projects from the résumé — HAR-driven API tooling, a config-driven sequencing engine, and a computer-vision pipeline for wildlife conservation.',
    architecture: ['Capture', 'Parse', 'Build', 'Execute', 'Report'],
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
    id: 'contract-drift-detector',
    category: 'automation',
    icon: '⇌',
    title: 'API Contract Drift Detector',
    type: 'Release safety tooling',
    level: 'Advanced',
    description:
      'Diffs OpenAPI specs between environments and releases, classifies every change as breaking or safe, and gates deployment on the verdict.',
    impact: 'Catches breaking API changes before they reach downstream consumers, instead of after a partner integration fails.',
    tech: ['Node.js', 'OpenAPI', 'JSON Schema', 'Diffing', 'CI/CD'],
    steps: ['Fetch spec snapshots', 'Normalize schema shape', 'Diff against baseline', 'Classify breaking vs safe changes', 'Publish gate verdict'],
    sample: {
      baseline: 'claims-api v3.2 (production)',
      candidate: 'claims-api v3.3 (staging)',
      changes: ['removed required field: claimStatus', 'added optional field: settlementDate'],
    },
    features: ['Automated spec diffing', 'Breaking-change classification', 'CI release gate', 'Change history timeline'],
    challenges: ['Distinguishing breaking changes from additive ones', 'Handling vendor-specific spec extensions', 'Avoiding false positives from reordered fields'],
    future: ['Consumer-driven contract tracking', 'CI notification hooks', 'Auto-generated migration notes'],
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
  {
    id: 'generic-dynamic-journey-builder',
    category: 'personal',
    icon: '⬡',
    title: 'Generic Dynamic Journey Builder',
    type: 'Developer tooling',
    level: 'Personal project',
    description:
      'A HAR-file-driven framework that parses Chrome DevTools network exports and replays REST workflows, extracting dynamic variables and chaining dependencies between requests automatically.',
    impact: 'Turns a captured browser session into a repeatable, assertion-backed API test suite without hand-writing request chains.',
    tech: ['Java', 'Node.js', 'HAR parsing', 'Dependency chaining', 'Rest Assured'],
    steps: ['Import HAR export', 'Parse request/response pairs', 'Detect variable dependencies', 'Generate chained requests', 'Run assertions'],
    sample: {
      source: 'checkout-flow.har',
      discovery: 'response.orderId → next request body.orderId',
      overrideMode: 'auto-detected with manual override',
    },
    features: ['HAR import and parsing', 'Automatic dependency chaining', 'Assertion generation', 'Reusable request templates'],
    challenges: ['Distinguishing real dependencies from coincidental matching values', 'Handling large capture files', 'Keeping generated chains readable'],
    future: ['Visual dependency graph', 'CI integration', 'Support for GraphQL captures'],
  },
  {
    id: 'json-api-sequencing-engine',
    category: 'personal',
    icon: '⟁',
    title: 'JSON-Driven API Sequencing Engine',
    type: 'Automation tooling',
    level: 'Personal project',
    description:
      'A config-driven engine that orchestrates chained API calls from a JSON definition, with retry and polling support, SSE streaming, and a visual builder UI for composing test sequences.',
    impact: 'Lets a test sequence be defined and edited as data instead of code, so a new API flow can be composed without touching the framework.',
    tech: ['Node.js', 'Express', 'SSE', 'JSON Schema', 'React'],
    steps: ['Define sequence as JSON', 'Resolve step order', 'Execute chained calls', 'Poll or retry on demand', 'Stream progress via SSE'],
    sample: {
      sequence: 'login → create-order → poll-status → fetch-receipt',
      retry: { maxAttempts: 5, backoffMs: 500 },
      streaming: true,
    },
    features: ['JSON-defined sequences', 'Retry and polling steps', 'Live progress via SSE', 'Visual sequence builder UI'],
    challenges: ['Modeling conditional branches in a declarative format', 'Keeping SSE connections stable across retries', 'Validating user-authored JSON safely'],
    future: ['Branching and conditional steps', 'Saved sequence library', 'Team sharing'],
  },
  {
    id: 'wildlife-conservation-analysis',
    category: 'personal',
    icon: '❖',
    title: 'Wildlife Conservation Analysis',
    type: 'Computer vision — Honors',
    level: 'Academic project',
    description:
      'A computer-vision pipeline that counts wildlife populations from images and video, and classifies detected species against IUCN Red List criteria.',
    impact: 'Automates a manual counting and classification task for conservation research. Copyright-registered.',
    tech: ['Python', 'YOLOv5', 'Inception V3', 'OpenCV', 'IUCN Red List data'],
    steps: ['Ingest image or video', 'Detect animals with YOLOv5', 'Classify species with Inception V3', 'Cross-reference IUCN status', 'Report population counts'],
    sample: {
      source: 'reserve-camera-trap-04.mp4',
      detections: 128,
      species: ['Bengal tiger', 'Chital', 'Indian peafowl'],
    },
    features: ['Object detection with YOLOv5', 'Species classification with Inception V3', 'IUCN Red List cross-referencing', 'Population count reporting'],
    challenges: ['Distinguishing similar species at low resolution', 'Occlusion in dense habitats', 'Balancing precision and recall for rare species'],
    future: ['Real-time camera-trap inference', 'Larger labeled dataset', 'Migration pattern tracking'],
  },
];

const resume = {
  name: 'Gaurav Suryavanshi',
  role: 'Software Development Engineer in Test (SDET)',
  location: 'Pune, India',
  phone: '+91 9075259103',
  email: 'gauravsuryvanshi06@gmail.com',
  summary: [
    'SDET with 2+ years building and owning API test-automation frameworks for large-scale health-insurance claims systems.',
    'Strong in Java 17 + TestNG + Rest-Assured, Oracle SQL/PLSQL data validation, and Spring Boot / Node.js service testing.',
    'Comfortable designing test strategy from scratch, driving partner-integration coverage, and wiring suites into CI.',
  ],
  experience: [
    {
      title: 'Software Development Engineer in Test (SDET)',
      company: 'Vidal Health TPA — Pune',
      period: '2024 – Present',
      points: [
        'Own and extend a Java 17 + TestNG + Rest-Assured API automation framework for health-insurance claims processing, covering end-to-end claim, enrollment and partner-integration flows.',
        'Designed and automated a partner-integration regression suite of 190+ test cases across multiple REST APIs, with request/response schema validation and database-level assertions.',
        'Built and tuned TestNG suites for parallel execution, reducing regression run time and stabilising CI feedback across release cycles.',
        'Authored functional and data-validation test scenarios backed by Oracle SQL assertions for bulk data-upload and partner MIS reporting workflows.',
        'Designed test coverage for database migration and blue-green deployment patterns, and validated real-time (SSE) claim-processing workflows.',
        'Partnered with developers to reproduce, triage and close backend defects, improving release quality and QA-to-engineering turnaround.',
      ],
    },
    {
      title: 'Backend Automation Test Intern',
      company: 'Bajaj Finserv Health',
      period: '2024',
      points: [
        'Built a microservice to automate API testing by generating and executing curl commands from HTTPS response logs pulled off the ELK stack.',
        'Migrated the service from Node.js to NestJS for better performance and scalability.',
      ],
    },
    {
      title: 'Backend Developer Intern',
      company: 'Esenceweb IT Solutions',
      period: '2024',
      points: [
        'Developed backend services in Node.js/Express with MongoDB, JWT auth and real-time messaging via Socket.io; integrated a Dialogflow chatbot for automated responses.',
      ],
    },
  ],
  resumeProjects: [
    {
      title: 'Generic Dynamic Journey Builder',
      stack: 'Java · Node.js · HAR parsing',
      detail:
        'HAR-file-driven framework that parses Chrome DevTools exports and replays REST workflows with dynamic variable extraction, dependency chaining and assertions — turning captured user journeys into repeatable automated API tests.',
    },
    {
      title: 'JSON-Driven API Sequencing Engine',
      stack: 'Node.js · Express · SSE',
      detail:
        'Config-driven engine that orchestrates chained API calls with retry/polling, SSE streaming and a visual builder UI for composing and running test sequences.',
    },
    {
      title: 'Wildlife Conservation Analysis (Honors)',
      stack: 'Python · YOLOv5 · Inception V3',
      detail:
        'Computer-vision pipeline to count wildlife populations from images/video and classify species against IUCN Red List criteria. Copyright-registered.',
    },
  ],
  skillGroups: [
    {
      label: 'Test automation',
      items: 'Rest-Assured, TestNG, JUnit, Selenium, Postman, Bruno, API contract & regression suites, data-driven & parallel execution',
    },
    { label: 'Languages', items: 'Java 17, JavaScript/TypeScript, Python, SQL/PLSQL, C++' },
    { label: 'Backend / services', items: 'Spring Boot, Node.js, Express, NestJS, REST APIs, SSE, JWT auth, microservices' },
    { label: 'Databases', items: 'Oracle SQL/PLSQL, MongoDB, SQLite — query-level assertions, EBR / blue-green validation' },
    { label: 'Tooling & CI', items: 'Git, GitHub, Docker, Maven, CI/CD pipelines, ELK, JSON/HAR-driven test tooling' },
  ],
  education: {
    degree: 'Bachelor of Engineering — CSE',
    school: 'PCCOER, Pune',
    period: 'Aug 2020 – May 2024',
    detail: 'CGPA: 8.96 / 10',
  },
  certifications: [
    'Introduction to Generative AI — Udemy',
    'Introduction to Machine Learning — Coursera',
    'Java — Udemy',
    'Copyright: Wildlife Conservation and Analysis Using Machine Learning',
  ],
};

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
    <div className="theme-switcher" role="group" aria-label="Choose site theme">
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

function ProjectCard({ project, onOpen, index }) {
  return (
    <article
      className={`project-card category-${project.category}`}
      data-tilt
      data-reveal="zoom"
      data-reveal-delay={String((index % 4) + 1)}
    >
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

const MODAL_EXIT_MS = 200;
const EASE_SMOOTH = 'cubic-bezier(0.16, 1, 0.3, 1)';

function ProjectModal({ project, input, setInput, runSteps, runOutput, running, onRun, onClose }) {
  // Renders the last non-null project a beat longer than `project` itself
  // stays truthy, so closing plays an exit transition instead of the modal
  // vanishing the instant `project` becomes null.
  const [renderedProject, setRenderedProject] = useState(project);
  const [closing, setClosing] = useState(false);
  const backdropRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (project) {
      setRenderedProject(project);
      setClosing(false);
      return undefined;
    }
    if (!renderedProject) return undefined;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRenderedProject(null);
      return undefined;
    }

    // Driven via the Web Animations API rather than a CSS class + @keyframes:
    // .animate() starts deterministically the moment it's called, with no
    // dependency on a CSS class-change being detected by the engine on the
    // next style pass — which is what a plain class toggle relies on.
    setClosing(true);
    const timing = { duration: MODAL_EXIT_MS, easing: EASE_SMOOTH, fill: 'forwards' };
    const animations = [
      backdropRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], timing),
      modalRef.current?.animate(
        [
          { opacity: 1, transform: 'translateY(0) scale(1)' },
          { opacity: 0, transform: 'translateY(10px) scale(0.98)' },
        ],
        timing,
      ),
    ].filter(Boolean);

    let cancelled = false;
    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      setRenderedProject(null);
      setClosing(false);
    };

    Promise.all(animations.map((animation) => animation.finished.catch(() => {}))).then(finish);
    // Safety net: if `.finished` is ever slow to settle (backgrounded tab,
    // an unusually congested main thread), don't leave the modal stuck open.
    const fallback = window.setTimeout(finish, MODAL_EXIT_MS + 400);

    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
      animations.forEach((animation) => animation.cancel());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  if (!renderedProject) return null;
  const category = categories.find((item) => item.key === renderedProject.category);

  // Portaled to <body>: <main> is an isolated stacking context, so a modal
  // rendered inside it could never stack above the body-level effect overlays.
  return createPortal(
    <div ref={backdropRef} className={`modal-backdrop${closing ? ' is-closing' : ''}`} role="presentation" onMouseDown={onClose}>
      <article ref={modalRef} className={`project-modal${closing ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="project-title" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close project details">×</button>
        <header className="modal-header">
          <div className="modal-kicker"><span>{renderedProject.icon}</span>{renderedProject.type} · {renderedProject.level}</div>
          <h2 id="project-title">{renderedProject.title}</h2>
          <p>{renderedProject.description}</p>
          <div className="tag-list large">
            {renderedProject.tech.map((item) => <span key={item}>{item}</span>)}
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
            <div className="detail-card"><h4>Key features</h4><ul>{renderedProject.features.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div className="detail-card"><h4>Engineering challenges</h4><ul>{renderedProject.challenges.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div className="detail-card full"><h4>Next iteration</h4><ul className="inline-list">{renderedProject.future.map((item) => <li key={item}>{item}</li>)}</ul></div>
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
    </div>,
    document.body,
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
  const [overdrive, setOverdrive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const runIdRef = useRef(0);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    const handleResize = () => {
      if (window.innerWidth > 1040) setMenuOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleResize);
    };
  }, [menuOpen]);

  useEffect(() => {
    // Namespaced per version: V1's themes (dark/cold/summer/rainy) and V2's
    // (light/dark) barely overlap, so a shared key would have each version
    // overwrite the other's choice with its own fallback on every hop.
    const savedTheme = window.localStorage.getItem('portfolio-theme-v1');
    setTheme(themes.some((item) => item.key === savedTheme) ? savedTheme : 'dark');
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('portfolio-theme-v1', theme);
  }, [theme]);

  useEffect(() => {
    const enable = () => setOverdrive(true);
    window.addEventListener('portfolio:overdrive', enable);
    return () => window.removeEventListener('portfolio:overdrive', enable);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('overdrive', overdrive);
    return () => document.body.classList.remove('overdrive');
  }, [overdrive]);

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
      if (runIdRef.current !== currentRunId) return;
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
            <div><strong>Gaurav Suryavanshi</strong><small>SDET · API Automation</small></div>
          </a>
          <nav aria-label="Primary navigation" id="primary-nav" className={menuOpen ? 'is-open' : ''}>
            <a href="#work" onClick={closeMenu}>Work</a>
            <a href="#resume" onClick={closeMenu}>Résumé</a>
            <a href="#capabilities" onClick={closeMenu}>Capabilities</a>
            <a href="#contact" onClick={closeMenu}>Contact</a>
          </nav>
          <div className="nav-controls">
            <VersionSwitcher current="v1" />
            <ThemeSwitcher theme={theme} onChange={setTheme} />
            <button
              type="button"
              className="nav-toggle"
              aria-expanded={menuOpen}
              aria-controls="primary-nav"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((value) => !value)}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="availability" data-reveal><i /> Open to SDET, automation, and LLM engineering roles</div>
            <h1>
              <span className="kinetic-line"><span>I turn complex workflows</span></span>
              <span className="kinetic-line open">
                <span className="charged">into reliable products.</span>
              </span>
            </h1>
            <p className="hero-description" data-reveal data-reveal-delay="1">
              SDET with 2+ years owning API automation for large-scale health-insurance claims systems — Java 17, TestNG, Rest-Assured, Oracle SQL, and CI that catches regressions before release.
            </p>
            <ul className="hero-highlights" data-reveal data-reveal-delay="2">
              <li>Own and extend a production API automation framework used to ship every release</li>
              <li>Designed and automated a 190+ case partner-integration regression suite</li>
              <li>Work directly with engineering to reproduce, triage, and close backend defects</li>
            </ul>
            <div className="hero-terminal" role="status" aria-live="off">
              <b>▹ now</b>
              <TypeCycle className="type-line" phrases={terminalLines} />
            </div>
            <div className="hero-actions">
              <a className="primary-button" href="#resume">Read the résumé</a>
              <a className="secondary-button" href="#work">Explore the work</a>
              <a className="ghost-button" href="#contact">Get in touch ↓</a>
            </div>
          </div>

          <div className="hero-console" role="group" aria-label="Current engineering focus" data-tilt data-reveal="right">
            <div className="console-bar"><div><i /><i /><i /></div><span>delivery-console</span></div>
            <div className="hero-console-content">
              <div className="signal-ring"><div><strong>READY</strong><small>production mindset</small></div></div>
              <div className="signal-list">
                <div><span>API test automation</span><b>ACTIVE</b></div>
                <div><span>Regression suite ownership</span><b>ACTIVE</b></div>
                <div><span>Defect triage &amp; fixes</span><b>ACTIVE</b></div>
                <div><span>CI/CD &amp; release readiness</span><b>ACTIVE</b></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="work-section" id="work">
        <div className="container">
          <div className="pulse-strip" role="group" aria-label="Portfolio at a glance">
            {pulseMetrics.map((metric, index) => (
              <article key={metric.label} data-reveal="zoom" data-reveal-delay={String(index + 1)}>
                <strong><CountUp value={metric.value} suffix={metric.suffix} /></strong>
                <small>{metric.label}</small>
              </article>
            ))}
          </div>

          <div className="section-heading" data-reveal>
            <div>
              <p className="eyebrow">Selected engineering work</p>
              <h2>Projects designed around <span>real delivery problems.</span></h2>
            </div>
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
                <div className="group-heading" data-reveal="left">
                  <div><p className="eyebrow">{category.eyebrow}</p><h3>{category.title}</h3></div>
                  <p>{category.description}</p>
                </div>
                <div className="project-grid">
                  {categoryProjects.map((project, index) => (
                    <ProjectCard key={project.id} project={project} onOpen={openProject} index={index} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="resume-section" id="resume">
        <div className="container">
          <div className="section-heading" data-reveal>
            <div>
              <p className="eyebrow">Résumé</p>
              <h2>The full <span>track record.</span></h2>
            </div>
            <p>Every role, project, skill group, and credential — the same content as the PDF, laid out to be read on a screen.</p>
          </div>

          <div className="resume-card" data-reveal="zoom" data-tilt>
            <header className="resume-identity">
              <div>
                <h3>{resume.name}</h3>
                <p>{resume.role}</p>
              </div>
              <ul className="resume-contact">
                <li>{resume.location}</li>
                <li><a href={`tel:${resume.phone.replace(/\s/g, '')}`}>{resume.phone}</a></li>
                <li><a href={`mailto:${resume.email}`}>{resume.email}</a></li>
              </ul>
              <a
                className="primary-button"
                href="/Gaurav-Suryavanshi-Resume.pdf"
                download
              >
                Download PDF <span aria-hidden="true">↓</span>
              </a>
            </header>

            <div className="resume-summary">
              {resume.summary.map((line) => <p key={line}>{line}</p>)}
            </div>
          </div>

          <div className="resume-grid">
            <div className="resume-main">
              <section className="resume-block" data-reveal="left" aria-labelledby="resume-experience">
                <h3 id="resume-experience" className="resume-block-title">Professional experience</h3>
                {resume.experience.map((role, index) => (
                  <article className="resume-role" key={role.title + role.company} data-reveal data-reveal-delay={String(index + 1)}>
                    <div className="resume-role-head">
                      <div>
                        <h4>{role.title}</h4>
                        <p>{role.company}</p>
                      </div>
                      <span>{role.period}</span>
                    </div>
                    <ul>
                      {role.points.map((point) => <li key={point}>{point}</li>)}
                    </ul>
                  </article>
                ))}
              </section>

              <section className="resume-block" data-reveal="left" aria-labelledby="resume-projects">
                <h3 id="resume-projects" className="resume-block-title">Projects</h3>
                <div className="resume-project-grid">
                  {resume.resumeProjects.map((project, index) => (
                    <article key={project.title} data-tilt data-reveal="zoom" data-reveal-delay={String(index + 1)}>
                      <h4>{project.title}</h4>
                      <span>{project.stack}</span>
                      <p>{project.detail}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <aside className="resume-side">
              <section className="resume-block" data-reveal="right" aria-labelledby="resume-skills">
                <h3 id="resume-skills" className="resume-block-title">Technical skills</h3>
                <dl className="resume-skill-list">
                  {resume.skillGroups.map((group) => (
                    <div key={group.label}>
                      <dt>{group.label}</dt>
                      <dd>{group.items}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section className="resume-block" data-reveal="right" data-reveal-delay="1" aria-labelledby="resume-education">
                <h3 id="resume-education" className="resume-block-title">Education</h3>
                <div className="resume-education">
                  <h4>{resume.education.degree}</h4>
                  <p>{resume.education.school}</p>
                  <span>{resume.education.period}</span>
                  <strong>{resume.education.detail}</strong>
                </div>
              </section>

              <section className="resume-block" data-reveal="right" data-reveal-delay="2" aria-labelledby="resume-certs">
                <h3 id="resume-certs" className="resume-block-title">Certifications</h3>
                <ul className="resume-certs">
                  {resume.certifications.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </section>
            </aside>
          </div>
        </div>
      </section>

      <section className="capabilities-section" id="capabilities">
        <div className="container capabilities-grid">
          <div data-reveal="left">
            <p className="eyebrow">Engineering capabilities</p>
            <h2>Strong at the boundary between <span>customer needs and production systems.</span></h2>
            <p>My work combines hands-on development, automation quality, solution design, debugging, and release ownership.</p>
          </div>
          <div className="capability-cards">
            <article data-reveal data-reveal-delay="1" data-tilt><span>01</span><h3>Discover</h3><p>Translate unclear requirements, API traffic, logs, and workflow behavior into an implementable technical model.</p></article>
            <article data-reveal data-reveal-delay="2" data-tilt><span>02</span><h3>Build</h3><p>Create reliable Next.js applications, automation frameworks, integration utilities, and data-backed operational tools.</p></article>
            <article data-reveal data-reveal-delay="3" data-tilt><span>03</span><h3>Validate</h3><p>Use assertions, observability, guardrails, test datasets, and failure-focused diagnostics to improve release confidence.</p></article>
            <article data-reveal data-reveal-delay="4" data-tilt><span>04</span><h3>Deploy</h3><p>Connect GitHub, Vercel, Supabase, CI/CD, environment configuration, monitoring, and rollback-aware delivery.</p></article>
          </div>
        </div>
        <div className="container skill-cloud" role="group" aria-label="Technical skills" data-reveal>
          {skills.map((skill) => <span key={skill}>{skill}</span>)}
        </div>
      </section>

      <section className="contact-section" id="contact">
        <div className="container contact-grid">
          <div data-reveal="left">
            <p className="eyebrow">Let’s build something useful</p>
            <h2>Need an engineer who can <span>understand the workflow and ship it?</span></h2>
            <p>I’m open to SDET, API test automation, and LLM application engineering roles — send the role details or a problem you’re stuck on, and I’ll reply within a day or two.</p>
            <a href={`mailto:${resume.email}`} className="email-link">{resume.email} ↗</a>
            <div className="connection-status"><i /><span>Reviewed personally — no recruiter middleman, no auto-responder</span></div>
          </div>
          <form className="contact-form" onSubmit={submitContact} data-reveal="right" data-tilt>
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
          <div><strong>Gaurav Suryavanshi</strong><span>SDET · API Automation · LLM · Delivery</span></div>
          <p>Built with Next.js, deployed on Vercel, and connected to Supabase.</p>
        </div>
      </footer>

      <button
        type="button"
        className="overdrive-switch"
        aria-pressed={overdrive}
        onClick={() => setOverdrive((current) => !current)}
        title="Konami code works too: ↑ ↑ ↓ ↓ ← → ← → B A"
      >
        <i />
        {overdrive ? 'Overdrive on' : 'Overdrive'}
      </button>

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
