"use client";

import { useEffect, useMemo, useState } from 'react';

const groups = [
  {
    key: 'ai',
    label: 'AI & LLM Engineering',
    title: 'Intelligent applications and AI workflows.',
    description: 'Building intelligent applications using Large Language Models, AI workflows, RAG, prompt engineering, AI agents, and modern full-stack AI technologies.',
    arch: ['Requirement', 'LLM/Prompt', 'Tools/RAG', 'Validation', 'Output'],
    details: {
      features: ['Structured prompt design', 'Workflow and dependency generation', 'Tool or retrieval simulation', 'JSON output validation'],
      challenges: ['Keeping output structured', 'Reducing hallucination risk', 'Handling vague requirements', 'Balancing speed and quality'],
      learnings: ['Clear schemas improve reliability', 'Small evaluation checks add trust', 'Prompt context should stay focused', 'Human-readable output matters'],
      future: ['Multi-model comparison', 'RAG source citations', 'Prompt test history', 'Cost and latency analytics'],
    },
  },
  {
    key: 'eng',
    label: 'Engineering & Automation',
    title: 'Scalable platforms and delivery workflows.',
    description: 'Developing scalable web apps, API integrations, developer tools, deployment workflows, observability dashboards, and automation platforms.',
    arch: ['Input', 'API/UI', 'Automation', 'Validation', 'Delivery'],
    details: {
      features: ['Reusable workflow components', 'Environment and release checks', 'API mapping and validation', 'Dashboard-style visibility'],
      challenges: ['Complex workflow dependencies', 'Release-risk visibility', 'Integration edge cases', 'Keeping UI fast on mobile'],
      learnings: ['Automate repeated decisions', 'Show status clearly', 'Design for rollback and recovery', 'Keep tools simple and usable'],
      future: ['Team workspaces', 'Saved workflow templates', 'Deeper observability', 'AI-assisted triage'],
    },
  },
  {
    key: 'web',
    label: '🖥️ Web Server & Database Projects',
    title: 'Apache, HTTPS, logs, and database-backed tools.',
    description: 'Realistic web-server and database projects covering Apache HTTPS deployment monitoring, secure reverse-proxy uploads, request-log exploration, Supabase persistence, and SQLite local/demo fallback usage.',
    arch: ['Apache/Logs', 'Next.js UI', 'Validation', 'Supabase', 'SQLite Demo'],
    details: {
      features: ['Apache VirtualHost and proxy configuration viewer', 'HTTPS enforcement and SSL/TLS certificate checks', 'Access/error log analytics with status grouping', 'Supabase-first persistence with SQLite local fallback'],
      challenges: ['Representing server configuration safely in a portfolio demo', 'Keeping Supabase as the production database while explaining SQLite fallback', 'Summarizing logs without exposing private operational data', 'Balancing detailed diagnostics with a clean UI'],
      learnings: ['Small dashboards can make infrastructure health easier to understand', 'Certificate and redirect checks are useful release-readiness signals', 'Structured log filters reduce QA and developer investigation time', 'Local SQLite fallback is useful for demos without replacing production storage'],
      future: ['Apache config import templates', 'Certificate renewal reminders', 'CSV export and saved investigations', 'Role-based operational views'],
    },
  },
];

const groupByKey = Object.fromEntries(groups.map((group) => [group.key, group]));

const projects = [
  { sec: 'ai', icon: '🧠', title: 'LLM Workflow Automation Studio', cat: 'AI Workflow', lvl: 'Advanced', tech: ['Next.js', 'React', 'TypeScript', 'OpenAI', 'JSON', 'Workflow Automation'], desc: 'LLM-powered workflow generator that transforms business requirements into structured execution pipelines with steps, dependencies, validations, and final outputs.', impact: 'Turns unstructured requirements into clear executable workflow plans.', steps: ['Parse business requirement', 'Extract entities and constraints', 'Generate workflow dependencies', 'Validate structured JSON plan', 'Create final execution output'], sample: { requirement: 'Create an approval workflow for API release readiness', output: 'structured workflow pipeline', environment: 'simulation' } },
  { sec: 'ai', icon: '🤖', title: 'AI Agent Deployment Console', cat: 'AI Agents', lvl: 'Advanced', tech: ['OpenAI', 'AI Agents', 'Function Calling', 'Next.js', 'TypeScript'], desc: 'Interactive console for configuring AI agents with tools, guardrails, workflow steps, and deployment readiness simulation.', impact: 'Demonstrates how AI agents can be prepared for real-world business workflows.', steps: ['Configure agent role', 'Attach tools and function calls', 'Apply guardrail rules', 'Run readiness simulation', 'Prepare deployment checklist'], sample: { agent: 'Customer workflow assistant', tools: ['search', 'validate', 'summarize'], guardrails: 'business-rule checks' } },
  { sec: 'ai', icon: '✍️', title: 'Prompt Engineering Lab', cat: 'Prompt Engineering', lvl: 'Intermediate', tech: ['Prompt Engineering', 'LLM', 'JSON Schema', 'Structured Output'], desc: 'Workspace to design, improve, compare, and evaluate prompts for structured AI applications.', impact: 'Improves prompt clarity, reliability, and output consistency.', steps: ['Load prompt variants', 'Run structured test cases', 'Validate JSON schema', 'Compare output quality', 'Select improved prompt'], sample: { prompt: 'Summarize an API issue into RCA, fix, and test cases', schema: 'rca/fix/tests' } },
  { sec: 'ai', icon: '📚', title: 'AI Knowledge Base Assistant', cat: 'RAG Assistant', lvl: 'Advanced', tech: ['RAG', 'Embeddings', 'Supabase', 'Vector Search', 'OpenAI'], desc: 'RAG-style assistant that simulates document ingestion, context retrieval, and AI-based answer generation.', impact: 'Shows how documents and FAQs can become searchable AI assistants.', steps: ['Ingest document content', 'Chunk and embed text', 'Retrieve matching context', 'Generate grounded answer', 'Return source-aware response'], sample: { question: 'How should deployment rollback be handled?', sources: 'technical documentation', mode: 'RAG simulation' } },
  { sec: 'ai', icon: '🛡️', title: 'LLM Evaluation & Guardrails Console', cat: 'AI Evaluation', lvl: 'Advanced', tech: ['LLM Evaluation', 'Guardrails', 'AI Safety', 'Scoring'], desc: 'Evaluation console for checking LLM responses against correctness, hallucination risk, format compliance, and business rules.', impact: 'Improves AI reliability before production rollout.', steps: ['Load expected criteria', 'Run response checks', 'Score hallucination risk', 'Validate formatting', 'Generate guardrail report'], sample: { response: 'Generated claim status explanation', checks: ['correctness', 'format', 'business rules'] } },
  { sec: 'ai', icon: '📄', title: 'AI Resume & Document Generator', cat: 'Document AI', lvl: 'Intermediate', tech: ['Next.js', 'OpenAI', 'Markdown', 'PDF', 'Templates'], desc: 'AI-powered document generator for resumes, proposals, reports, emails, and professional templates.', impact: 'Converts rough inputs into polished professional documents.', steps: ['Select document template', 'Collect rough input', 'Generate structured draft', 'Improve tone and formatting', 'Prepare export output'], sample: { document: 'resume summary', tone: 'professional', format: 'markdown/pdf ready' } },
  { sec: 'eng', icon: '🔗', title: 'API Integration Builder', cat: 'API Platform', lvl: 'Advanced', tech: ['REST API', 'Node.js', 'TypeScript', 'Webhooks', 'JSON'], desc: 'Visual workspace for API authentication, request mapping, response handling, chained API calls, and webhook workflows.', impact: 'Simplifies complex API integration planning and execution.', steps: ['Configure authentication', 'Map request payload', 'Chain dependent APIs', 'Handle webhook response', 'Validate integration output'], sample: { api: 'claim status integration', auth: 'bearer token', flow: 'request mapping and response handling' } },
  { sec: 'eng', icon: '🚀', title: 'Cloud Deployment Readiness Console', cat: 'Deployment Engineering', lvl: 'Advanced', tech: ['Vercel', 'GitHub', 'CI/CD', 'Environment Variables', 'Production Deployment'], desc: 'Deployment dashboard for checking build status, environment variables, preview deployment, production readiness, and rollback planning.', impact: 'Improves release confidence with a clear deployment checklist.', steps: ['Check build status', 'Validate environment variables', 'Verify preview deployment', 'Run production checklist', 'Prepare rollback plan'], sample: { deployment: 'portfolio production release', checks: ['build', 'env', 'preview', 'rollback'] } },
  { sec: 'eng', icon: '🧰', title: 'Developer Productivity Command Center', cat: 'Developer Tooling', lvl: 'Intermediate', tech: ['React', 'TypeScript', 'Automation', 'GitHub', 'CI/CD'], desc: 'Developer toolbox with reusable workflows, command generation, environment validation, and engineering utilities.', impact: 'Organizes repeated engineering tasks into guided workflows.', steps: ['Select engineering workflow', 'Validate environment', 'Generate reusable command', 'Run checklist', 'Save output for reuse'], sample: { workflow: 'generate UAT curl and validation checklist', target: 'developer productivity' } },
  { sec: 'eng', icon: '📈', title: 'Product Observability Hub', cat: 'Observability', lvl: 'Advanced', tech: ['Monitoring', 'Logs', 'Metrics', 'Analytics', 'Dashboard'], desc: 'Dashboard for monitoring API health, latency, logs, deployment status, feature usage, and system activity.', impact: 'Makes system health and product usage easy to understand.', steps: ['Collect service signals', 'Normalize logs and metrics', 'Visualize latency and health', 'Detect anomalies', 'Create action summary'], sample: { service: 'API gateway', signals: ['latency', 'errors', 'deployment status', 'usage'] } },
  { sec: 'eng', icon: '🏢', title: 'Full-Stack SaaS Operations Dashboard', cat: 'Full-Stack SaaS', lvl: 'Advanced', tech: ['Next.js', 'Supabase', 'PostgreSQL', 'React', 'TypeScript'], desc: 'Modern SaaS admin dashboard with modules, analytics cards, user roles, workflow status, and responsive layouts.', impact: 'Demonstrates full-stack product development with reusable UI patterns.', steps: ['Authenticate user role', 'Load dashboard modules', 'Query operational data', 'Render analytics cards', 'Update workflow status'], sample: { module: 'operations dashboard', roles: ['admin', 'member'], database: 'PostgreSQL' } },
  { sec: 'eng', icon: '🤝', title: 'Customer Implementation Workspace', cat: 'Forward Deployment', lvl: 'Advanced', tech: ['Solution Engineering', 'Workflow Design', 'Product Delivery', 'SaaS'], desc: 'Forward deployment workspace that converts customer requirements into tasks, dependencies, risks, milestones, and delivery plans.', impact: 'Connects business requirements with technical implementation planning.', steps: ['Capture customer requirement', 'Map technical tasks', 'Identify dependencies and risks', 'Plan delivery milestones', 'Generate implementation summary'], sample: { customerNeed: 'new workflow automation module', delivery: 'tasks, risks, milestones' } },
  { sec: 'web', icon: '🖥️', title: 'Apache HTTPS Deployment & Monitoring Console', cat: 'Web Server Monitoring', lvl: 'Intermediate', tech: ['React', 'Next.js', 'TypeScript', 'Apache HTTP Server', 'HTTPS', 'SSL/TLS', 'Supabase', 'SQLite', 'REST APIs'], desc: 'Built a web-based dashboard to manage and monitor Apache HTTP Server deployments with virtual-host health, HTTPS certificate expiry, redirects, request errors, and log summaries.', impact: 'Improves visibility into web-server health and helps identify certificate, routing, and HTTP error issues before they impact users.', steps: ['Load Apache VirtualHost inventory', 'Validate HTTP to HTTPS redirects', 'Check SSL/TLS certificate expiry', 'Analyze access and error logs', 'Save deployment health summary'], sample: { domain: 'app.example.com', virtualHost: '443_ssl_vhost', healthCheck: '/api/health', database: 'Supabase production with SQLite fallback', mode: 'monitoring simulation' } },
  { sec: 'web', icon: '🔐', title: 'Secure File Upload Portal with Apache Reverse Proxy', cat: 'Secure Upload Platform', lvl: 'Intermediate', tech: ['Next.js', 'React', 'TypeScript', 'Apache HTTP Server', 'mod_proxy', 'HTTPS', 'Supabase Auth', 'Supabase Storage', 'SQLite'], desc: 'Developed a secure internal web portal for uploading, validating, and tracking documents behind Apache reverse proxy HTTPS termination and protected routes.', impact: 'Provides a secure and traceable document-upload workflow suitable for internal operational teams.', steps: ['Authenticate role-based user', 'Validate upload metadata', 'Apply Apache proxy and security rules', 'Store file reference and audit event', 'Update document processing status'], sample: { userRole: 'operations-reviewer', file: 'claim-document.pdf', route: '/secure/upload', storage: 'Supabase Storage', fallback: 'SQLite metadata mode' } },
  { sec: 'web', icon: '📊', title: 'API Request & Error Log Explorer', cat: 'Log Analytics', lvl: 'Intermediate', tech: ['Next.js', 'React', 'TypeScript', 'Apache HTTP Server Logs', 'SQLite', 'Supabase PostgreSQL', 'REST APIs', 'Chart UI'], desc: 'Created a web application that ingests API request logs and Apache access logs, normalizes them, and provides searchable error analysis for developers and QA teams.', impact: 'Reduces time spent identifying recurring API and production issues by centralizing request, response, and error analysis.', steps: ['Import Apache/API logs', 'Normalize endpoint and status data', 'Filter errors by method and correlation ID', 'Group recurring 4xx/5xx failures', 'Export investigation summary'], sample: { logSource: 'apache-access.log', statusFilter: [400, 401, 403, 404, 500, 503], correlationId: 'REQ-2026-0716-001', database: 'Supabase PostgreSQL with SQLite local fallback' } },
];

const skills = ['OpenAI', 'LLM Workflows', 'AI Agents', 'RAG', 'Prompt Engineering', 'Next.js', 'React', 'TypeScript', 'Supabase', 'PostgreSQL', 'Node.js', 'REST APIs', 'Vercel', 'GitHub', 'CI/CD', 'Apache HTTP Server', 'HTTPS', 'SSL/TLS', 'SQLite', 'Observability', 'Automation', 'Forward Deployment'];

function BadgeList({ items }) {
  return <div className="chips">{items.map((item) => <span key={item}>{item}</span>)}</div>;
}

function DetailBox({ title, items }) {
  return <div className="box"><h4>{title}</h4><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
}

export default function Page() {
  const [theme, setTheme] = useState('dark');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [input, setInput] = useState('');
  const [states, setStates] = useState([]);
  const [output, setOutput] = useState('Ready. Edit the sample input and run the workflow.');
  const [formStatus, setFormStatus] = useState('');
  const [scroll, setScroll] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('portfolio-theme') || 'dark';
    setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('portfolio-theme', theme);
  }, [theme]);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScroll(max > 0 ? (window.scrollY / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add('show'));
    }, { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (selected) {
      setInput(JSON.stringify(selected.sample, null, 2));
      setStates(selected.steps.map(() => 'Pending'));
      setOutput('Ready. Edit the sample input and run the workflow.');
      document.body.classList.add('lock');
    } else {
      document.body.classList.remove('lock');
    }
  }, [selected]);

  const visibleProjects = useMemo(() => projects.filter((project) => filter === 'all' || project.sec === filter), [filter]);

  async function runSimulation() {
    try {
      JSON.parse(input);
    } catch {
      setOutput('FAILED · Please enter valid JSON before running.');
      setStates((current) => current.map((_, index) => index === 0 ? 'Failed' : 'Pending'));
      return;
    }
    const nextStates = selected.steps.map(() => 'Pending');
    setStates(nextStates);
    setOutput('Running workflow…');
    for (let index = 0; index < selected.steps.length; index += 1) {
      nextStates[index] = 'Running';
      setStates([...nextStates]);
      await new Promise((resolve) => setTimeout(resolve, 220));
      nextStates[index] = 'Passed';
      setStates([...nextStates]);
    }
    setOutput(JSON.stringify({
      status: 'PASSED',
      httpStatus: 200,
      responseTimeMs: Math.floor(90 + Math.random() * 120),
      project: selected.title,
      logSummary: selected.sec === 'web' ? 'Apache/API log scan completed; no blocking 5xx pattern detected.' : 'Frontend workflow simulation completed successfully.',
      databaseSave: selected.sec === 'web' ? 'Supabase primary save simulated; SQLite fallback available for local demo.' : 'Simulation output saved in browser session.',
      completedSteps: selected.steps.length,
    }, null, 2));
  }

  function submitContact(event) {
    event.preventDefault();
    setFormStatus('Thanks — please email gauravsuryvanshi06@gmail.com for the fastest reply.');
    event.currentTarget.reset();
  }

  return (
    <>
      <div className="bg"><i className="cloud c1" /><i className="cloud c2" /><i className="shoot" /></div>
      <i className="progress" style={{ '--scroll': `${scroll}%` }} />
      <nav className="nav">
        <div className="navin wrap">
          <a className="brand" href="#top">GS<b>.</b><small>LLM × Deployment</small></a>
          <div className="links"><a href="#projects">Projects</a><a href="#skills">Toolkit</a><a href="#contact">Contact</a></div>
          <div className="themes">{['dark', 'read', 'sky', 'night'].map((name) => <button className={theme === name ? 'on' : ''} key={name} onClick={() => setTheme(name)}>{name[0].toUpperCase() + name.slice(1)}</button>)}</div>
        </div>
      </nav>

      <main>
        <section id="top" className="hero wrap">
          <div className="reveal">
            <div className="eyebrow">Development Engineer · LLM Application Engineer · Forward Deployment Engineer</div>
            <h1>Building usable AI products<br /><span>from requirements to deployment.</span></h1>
            <p>I am a development engineer with 2 years of experience building full-stack web applications, LLM-powered workflow tools, API integrations, deployment dashboards, and automation-focused product interfaces.</p>
            <div className="actions"><a className="btn primary" href="#projects">Explore premium projects ↘</a><a className="btn" href="#contact">Contact →</a></div>
          </div>
          <aside className="heroCard reveal">
            <div className="terminal"><i /><i /><i /><b>PORTFOLIO SIGNAL</b></div>
            <div className="ring"><i>15+</i><small>premium project demos</small></div>
            <div className="mini"><p><b>Focus</b><span>LLM + Full-Stack</span></p><p><b>Database</b><span>Supabase + SQLite</span></p><p><b>Mode</b><span>{theme[0].toUpperCase() + theme.slice(1)}</span></p></div>
          </aside>
          <div className="metrics">
            {['15+|Interactive Projects', '2 Years|Development Experience', 'LLM & AI|Applications', 'Full-Stack|Web Development', 'Apache|HTTPS Projects', 'APIs|Integrations', 'Deploy|Engineering', 'Prod|Deployments'].map((metric) => {
              const [value, label] = metric.split('|');
              return <div className="metric reveal" key={metric}><b>{value}</b><small>{label}</small></div>;
            })}
          </div>
        </section>

        <section id="projects">
          <div className="wrap">
            <div className="head reveal"><div><div className="eyebrow">🚀 Featured Projects</div><h2>Premium project showcase for modern engineering roles.</h2></div><p>Recruiter-friendly cards with realistic two-year experience wording, live frontend simulations, detailed popups, and fast responsive interactions.</p></div>
            <div className="filters">{[['all', 'All'], ['ai', 'AI & LLM'], ['eng', 'Engineering'], ['web', 'Web Server & DB']].map(([key, label]) => <button key={key} className={`filter ${filter === key ? 'active' : ''}`} onClick={() => setFilter(key)}>{label}</button>)}</div>
            {groups.map((group) => (
              <div className="group" key={group.key}>
                <div className="sectionHead reveal"><div><div className="eyebrow">{group.label}</div><h3 className="sectionTitle">{group.title}</h3></div><p>{group.description}</p></div>
                <div className="grid">
                  {visibleProjects.filter((project) => project.sec === group.key).map((project) => (
                    <article className={`card reveal ${project.sec}`} key={project.title}>
                      <div className="thumb"><span>{project.icon}</span></div>
                      <div className="body">
                        <div className="badges"><span className="badge">{project.cat}</span><span className="badge">{project.lvl}</span></div>
                        <h4>{project.title}</h4>
                        <p className="desc">{project.desc}</p>
                        <p className="impact"><b>Impact</b> {project.impact}</p>
                        <BadgeList items={project.tech} />
                        <div className="buttons"><button className="btn primary" onClick={() => setSelected(project)}>View Project ↗</button><button className="btn" onClick={() => setSelected(project)}>View Details</button><a className="btn" href="https://github.com/suryavanshi-cmd/gaurav-portfolio" target="_blank" rel="noreferrer">GitHub</a></div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="skills"><div className="wrap"><div className="head reveal"><div><div className="eyebrow">Toolkit</div><h2>Stack aligned to AI, web-server, database, and deployment work.</h2></div><p>Practical technologies used across LLM interfaces, Apache/HTTPS workflows, integration design, dashboards, and production deployments.</p></div><div className="skills">{skills.map((skill) => <span key={skill}>{skill}</span>)}</div></div></section>
        <section id="contact"><div className="contact wrap reveal"><div><div className="eyebrow">Contact</div><h2>Have a workflow to build?</h2><p>Let’s discuss LLM applications, full-stack dashboards, Apache/HTTPS tooling, API integrations, automation tools, or forward deployment work.</p><a className="mail" href="mailto:gauravsuryvanshi06@gmail.com">gauravsuryvanshi06@gmail.com ↗</a></div><form onSubmit={submitContact}><input name="name" minLength="2" required placeholder="Your name" /><input name="email" type="email" required placeholder="Email address" /><textarea name="message" minLength="10" required placeholder="Tell me about the project" /><input className="hp" name="company" /><button className="btn primary">Prepare message →</button><small className="status">{formStatus}</small></form></div></section>
      </main>

      <footer><div className="foot wrap"><span>© 2026 Gaurav Suryavanshi</span><span><a href="#top">Back to top ↑</a> · <a href="https://github.com/suryavanshi-cmd" target="_blank" rel="noreferrer">GitHub ↗</a></span></div></footer>

      {selected && (
        <div className="overlay" onClick={(event) => event.target.className === 'overlay' && setSelected(null)}>
          <article className="modal" role="dialog" aria-modal="true">
            <button className="close" aria-label="Close" onClick={() => setSelected(null)}>×</button>
            <header className="modalHero"><div className="badges"><span className="badge">{selected.cat}</span><span className="badge">{selected.lvl}</span></div><h2>{selected.icon} {selected.title}</h2><p><b>Project overview:</b> {selected.desc}</p><p><b>Key impact:</b> {selected.impact}</p><BadgeList items={selected.tech} /><div className="actions"><a className="btn primary" href="#" onClick={(event) => event.preventDefault()}>Live Demo</a><a className="btn" href="https://github.com/suryavanshi-cmd/gaurav-portfolio" target="_blank" rel="noreferrer">GitHub</a></div></header>
            <div className="modalContent"><div><h3>Architecture / workflow diagram</h3><div className="arch">{groupByKey[selected.sec].arch.map((node) => <div className="node" key={node}>{node}</div>)}</div></div><div><h3>Project page</h3><div className="details"><DetailBox title="Feature list" items={groupByKey[selected.sec].details.features} /><DetailBox title="Challenges faced" items={groupByKey[selected.sec].details.challenges} /><DetailBox title="Key learnings" items={groupByKey[selected.sec].details.learnings} /><DetailBox title="Future enhancements" items={groupByKey[selected.sec].details.future} /></div></div><div><h3>Interactive workflow simulation</h3><div className="console"><div className="consoleTop"><i /><i /><i /><b>FRONTEND-ONLY LIVE SIMULATION</b></div><div className="editor"><textarea value={input} onChange={(event) => setInput(event.target.value)} /><div className="actions"><button className="btn primary" onClick={runSimulation}>Run Workflow</button><button className="btn" onClick={() => setSelected({ ...selected })}>Reset</button></div></div><div className="timeline">{selected.steps.map((step, index) => <div className={`step ${states[index]?.toLowerCase()}`} key={step}><i>{states[index] === 'Passed' ? '✓' : index + 1}</i><strong>{step}</strong><small>{states[index]}</small></div>)}</div><div className="out"><small>SAMPLE OUTPUT PANEL</small><code>{output}</code></div></div></div></div>
          </article>
        </div>
      )}
    </>
  );
}
