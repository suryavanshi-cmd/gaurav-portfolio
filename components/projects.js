/*
  Project catalogue.

  Each entry renders twice: as a one-line row in the Projects list, and as the
  full case study inside the dialog. `game` marks the one entry that opens a
  playable round instead of a static case study.

  Keys double as the mono label in the list, so they stay short and lowercase.
*/

export const projects = [
  {
    key: 'llm-flow',
    title: 'Agentic Claims Triage Pipeline',
    note: 'A planner–executor–critic loop that reads an incoming claim, decides which checks apply, calls the policy and member APIs itself, and refuses to answer when evidence is thin.',
    problem:
      'Claims arrive as free text plus attachments, and the first hour is spent deciding which of thirty checks actually apply. Hard-coding that decision tree meant a change request for every new product.',
    flow: ['Intake', 'Plan', 'Tool calls', 'Critic', 'Route'],
    stack: ['Next.js', 'Tool calling', 'JSON Schema', 'Oracle SQL', 'Rest-Assured'],
    challenges: [
      'Stopping the planner from inventing tools that do not exist — the registry is a hard allowlist, not a suggestion in the prompt',
      'Bounding cost and blast radius: a per-run token budget and a maximum tool-call depth, both enforced outside the model',
      'Making the critic independent enough to actually reject its own pipeline’s output rather than rubber-stamping it',
    ],
    outcome:
      'Triage decisions carry a written trace — which checks fired, which APIs answered, and why the critic passed or escalated — so a reviewer audits the reasoning instead of re-doing it.',
    next: ['Per-product policy packs', 'Replay of production runs against a new planner', 'Human feedback folded into the critic'],
  },
  {
    key: 'llm-flow',
    title: 'Document Intelligence Extraction Flow',
    note: 'OCR to structured JSON for discharge summaries and bills, with schema validation and a review queue for everything the model was not confident about.',
    problem:
      'Hospital paperwork is scanned, rotated, stamped, and inconsistent between providers. Regex-and-template extraction broke on every new hospital format.',
    flow: ['OCR', 'Extract', 'Validate', 'Confidence gate', 'Review queue'],
    stack: ['OCR', 'Structured output', 'JSON Schema', 'Supabase', 'Human-in-the-loop'],
    challenges: [
      'A confident wrong number is worse than a blank field, so every extracted value carries a confidence and low ones route to a human rather than downstream',
      'Schema validation runs as code after generation — the model is asked for JSON, never trusted to have produced valid JSON',
      'Keeping the reviewer’s corrections as labelled data instead of losing them into a ticket',
    ],
    outcome:
      'The queue only shows fields that failed validation or scored low, so review time tracks document quality rather than document volume.',
    next: ['Per-provider layout hints', 'Active learning from reviewer corrections', 'Table extraction for itemised bills'],
  },
  {
    key: 'llm-flow',
    title: 'LLM Gateway — Routing, Fallback & Cost Control',
    note: 'One internal endpoint in front of several models: routes by task, falls back when a provider degrades, caches repeats, and enforces a token budget per team.',
    problem:
      'Every prototype called a provider SDK directly with its own key, its own retry logic, and no idea what it was spending. Nobody could answer what a feature cost per month.',
    flow: ['Request', 'Route', 'Cache', 'Call + fallback', 'Meter'],
    stack: ['Next.js', 'Streaming', 'Redis-style cache', 'Circuit breaker', 'OpenTelemetry'],
    challenges: [
      'Failing over mid-stream without replaying tokens the client already rendered',
      'Cache keys that include the prompt version — a prompt edit has to miss the cache, or the rollout is invisible',
      'Budgets that degrade to a cheaper model rather than returning an error, so a spend cap never becomes an outage',
    ],
    outcome:
      'Per-team, per-feature spend and latency are answerable from one place, and a provider incident degrades quality instead of taking features down.',
    next: ['Semantic caching', 'Latency-aware routing', 'Per-tenant rate shaping'],
  },
  {
    key: 'llm-flow',
    title: 'Prompt Registry & Release Pipeline',
    note: 'Prompts treated as deployable artefacts — versioned, diffed in review, rolled out to a percentage of traffic, and reverted in one step.',
    problem:
      'Prompts lived in string literals. A one-word edit shipped with no review, no record of what changed, and no way back other than remembering the old wording.',
    flow: ['Author', 'Diff', 'Eval gate', 'Staged rollout', 'Rollback'],
    stack: ['Versioning', 'Golden datasets', 'CI/CD', 'Feature flags', 'Observability'],
    challenges: [
      'A prompt change cannot merge until the evaluation suite runs against it — the gate lives in CI, not in a reviewer’s judgement',
      'Rendering a useful diff when whitespace and ordering in a prompt genuinely change behaviour',
      'Pinning production traffic to an exact prompt version so a rollout is measurable rather than anecdotal',
    ],
    outcome:
      'Every answer in production is traceable to the exact prompt version that produced it, and reverting is a deploy rather than an archaeology exercise.',
    next: ['Side-by-side variant scoring', 'Automatic rollback on eval regression', 'Shared prompt fragments'],
  },
  {
    key: 'llm-flow',
    title: 'Support Ticket Auto-Resolution Flow',
    note: 'Classifies an incoming ticket, retrieves the matching runbook, drafts a reply, and escalates to a human whenever confidence or policy says it should not send.',
    problem:
      'Most tickets are the same dozen questions, but the long tail is exactly where an automated reply does damage. The interesting part is knowing when to stop.',
    flow: ['Classify', 'Retrieve', 'Draft', 'Policy gate', 'Send or escalate'],
    stack: ['RAG', 'Embeddings', 'Classification', 'Policy rules', 'Audit trail'],
    challenges: [
      'Calibrating the escalation threshold against real outcomes rather than a number that felt about right',
      'Keeping the draft anchored to the retrieved runbook so it cannot invent a policy that does not exist',
      'Making every auto-sent reply reversible and attributable in an audit trail',
    ],
    outcome:
      'The repeatable tickets close themselves with a citation attached; anything ambiguous reaches a human with the retrieval already done.',
    next: ['Per-category thresholds', 'Deflection measurement against reopen rate', 'Multilingual routing'],
  },

  {
    key: 'llm-eval',
    title: 'LLM Red-Team Arena',
    note: 'A playable round of the prompt-injection triage I run against our own assistants — ten prompts, allow or block, scored on precision and recall.',
    game: 'redteam',
    problem:
      'Guardrail work is usually described rather than demonstrated. The judgement it takes — spotting an injection without blocking the legitimate question that merely looks like one — is easier to show than to write about.',
    flow: ['Corpus', 'Classify', 'Score', 'Precision/recall', 'Verdict'],
    stack: ['Prompt injection', 'Jailbreak patterns', 'Guardrails', 'Red teaming', 'Scoring'],
    challenges: [
      'False positives are the expensive failure — a filter that blocks real questions gets switched off within a week',
      'Indirect injection hides in retrieved content, so the attack never appears in what the user typed',
      'Attack phrasing drifts constantly, which makes a fixed keyword blocklist obsolete almost immediately',
    ],
    outcome:
      'Scoring both directions — attacks caught and safe prompts wrongly blocked — is the only way to tell a working guardrail from an aggressive one.',
    next: ['Larger attack corpus', 'Model-versus-human scoreboard', 'Automated regeneration of attack variants'],
  },
  {
    key: 'llm-eval',
    title: 'Prompt Regression Harness',
    note: 'Golden datasets and semantic assertions that run in CI, so a prompt or model change cannot silently break an answer that used to be right.',
    problem:
      'Model and prompt updates are invisible to ordinary tests. Output changes wording every run, so string equality is useless and nobody notices a regression until a user does.',
    flow: ['Golden set', 'Run', 'Assert', 'Diff', 'Gate'],
    stack: ['TestNG', 'Golden datasets', 'Semantic assertions', 'CI/CD', 'Reporting'],
    challenges: [
      'Assertions that survive rewording but still catch a wrong fact — structure and claims are checked, not prose',
      'Keeping the golden set honest as the product changes, so it does not calcify into testing last year’s behaviour',
      'Flake budgets: a non-deterministic system needs a pass threshold, not a single green tick',
    ],
    outcome:
      'A prompt edit that degrades accuracy fails the build with the specific cases it broke, in the same place any other regression would show up.',
    next: ['Per-case cost and latency trends', 'Auto-generated cases from production misses', 'Cross-model comparison runs'],
  },
  {
    key: 'llm-eval',
    title: 'RAG Retrieval Quality Suite',
    note: 'Measures the retrieval half separately — recall@k, citation coverage, and chunking experiments — because most bad answers are retrieval failures wearing a generation costume.',
    problem:
      'When a grounded assistant answers badly, the instinct is to blame the model. Usually the right document never made it into the context at all.',
    flow: ['Query set', 'Retrieve', 'Recall@k', 'Faithfulness', 'Report'],
    stack: ['Vector search', 'Hybrid retrieval', 'Reranking', 'Evaluation', 'Supabase'],
    challenges: [
      'Building a labelled query set from real questions without simply encoding what the current retriever already returns',
      'Separating faithfulness from correctness — an answer can be perfectly grounded in a document that is out of date',
      'Making chunking a measured decision rather than a default that nobody revisits',
    ],
    outcome:
      'Retrieval and generation are scored independently, so tuning effort goes to whichever half is actually losing the points.',
    next: ['Freshness scoring', 'Per-collection dashboards', 'Reranker A/B harness'],
  },
  {
    key: 'llm-eval',
    title: 'Hallucination & Grounding Scanner',
    note: 'Splits an answer into individual claims, checks each one against the retrieved evidence, and scores what is unsupported by how much it would matter.',
    problem:
      '"Did it hallucinate?" is not a measurable question at the level of a whole paragraph. One sentence can be perfectly sourced while the next quietly invents a clause number.',
    flow: ['Extract claims', 'Match evidence', 'Classify', 'Severity', 'Flag'],
    stack: ['Claim extraction', 'Entailment', 'Evidence matching', 'Severity model', 'Guardrails'],
    challenges: [
      'Deciding what counts as supported when the evidence implies a fact without stating it',
      'Weighting severity — an invented policy clause and a slightly wrong date are not the same failure',
      'Running the check cheaply enough to sit in the request path rather than in a nightly batch',
    ],
    outcome:
      'Unsupported claims are surfaced individually with the evidence that should have backed them, which makes the fix obvious.',
    next: ['Numeric and date-specific checks', 'Inline citation rendering', 'Feedback loop into retrieval'],
  },
  {
    key: 'llm-eval',
    title: 'LLM Load & Cost Profiler',
    note: 'Load-tests an LLM feature the way any other service gets tested — latency percentiles, tokens per journey, and the concurrency where quality starts sliding.',
    problem:
      'LLM features get functionally tested and then shipped without anyone knowing the p95 under real concurrency, or what a thousand users a day actually costs.',
    flow: ['Scenario', 'Ramp', 'Measure', 'Cost model', 'Threshold'],
    stack: ['Load testing', 'Token accounting', 'Percentiles', 'OpenTelemetry', 'CI/CD'],
    challenges: [
      'Streaming makes "response time" ambiguous — time-to-first-token and total completion are separate numbers with separate budgets',
      'Provider rate limits mean the test harness has to distinguish a real regression from being throttled',
      'Attributing cost to a user journey rather than to a raw API call',
    ],
    outcome:
      'A feature ships with a known cost per journey and a concurrency ceiling, both checked on every release rather than discovered from a bill.',
    next: ['Cost regression alerts', 'Cache hit-rate modelling', 'Per-tenant projections'],
  },

  {
    key: 'automation',
    title: 'Generic Dynamic Journey Builder',
    note: 'Parses Chrome DevTools HAR exports and replays them as repeatable REST journeys, with variable extraction and dependency chaining.',
    problem:
      'Onboarding automation for an application with thin API documentation meant reverse-engineering request order by hand, one endpoint at a time.',
    flow: ['Import HAR', 'Redact', 'Detect producers', 'Template', 'Replay'],
    stack: ['Node.js', 'HAR', 'Playwright', 'Dependency graph', 'Rest-Assured'],
    challenges: [
      'The same ID appears in several places meaning different things, so mappings are confidence-ranked and overridable',
      'Secrets and tokens have to be stripped before a HAR is ever stored',
      'Auth refresh partway through a replay without restarting the journey',
    ],
    outcome:
      'A recorded session becomes a runnable, parameterised journey in minutes rather than a day of reading network tabs.',
    next: ['Visual graph editing', 'Shared team mappings', 'Distributed runners'],
  },
  {
    key: 'automation',
    title: 'JSON-Driven API Sequencing Engine',
    note: 'Config-driven orchestration of chained API calls, with retry and polling, SSE streaming, and a visual builder for composing runs.',
    problem:
      'Every new integration meant another bespoke test class that differed from the last one only in URLs and field names.',
    flow: ['Define', 'Resolve vars', 'Execute', 'Assert', 'Report'],
    stack: ['Java 17', 'TestNG', 'Rest-Assured', 'JSONPath', 'SSE'],
    challenges: [
      'A scoped variable store so parallel journeys cannot read each other’s extracted values',
      'Polling semantics for endpoints that answer 202 and finish asynchronously',
      'Keeping the config readable enough that a non-author can edit a journey',
    ],
    outcome:
      'New journeys are written as configuration and reviewed as data, which moved suite authorship beyond the people who wrote the framework.',
    next: ['Parallel journey execution', 'Contract-drift alerts', 'Shared assertion library'],
  },
  {
    key: 'release',
    title: 'API Contract Drift Detector',
    note: 'Diffs OpenAPI specs between environments, classifies every change as breaking or safe, and gates the deploy on the verdict.',
    problem:
      'A field quietly changing type between UAT and production is invisible until a consumer deserialises it and fails in the middle of a claim.',
    flow: ['Fetch specs', 'Normalise', 'Diff', 'Classify', 'Gate'],
    stack: ['OpenAPI', 'Semantic diff', 'GitHub Actions', 'Node.js', 'Reporting'],
    challenges: [
      'Distinguishing a genuinely breaking change from cosmetic spec churn, or the gate gets ignored',
      'Normalising specs generated by different tooling versions before comparing them',
      'Reporting a diff in terms of consumer impact rather than JSON paths',
    ],
    outcome:
      'Breaking changes are caught at the pipeline instead of by whichever consumer deserialises them first.',
    next: ['Consumer-driven contract checks', 'Deprecation windows', 'Per-consumer impact reports'],
  },
  {
    key: 'llm-flow',
    title: 'Grounded Knowledge Assistant',
    note: 'Retrieval-backed assistant over runbooks and API specs that keeps every answer attached to its source.',
    problem:
      'Operational knowledge was spread across runbooks, incident notes, and specs. Finding the relevant paragraph took longer than acting on it.',
    flow: ['Ingest', 'Chunk + index', 'Retrieve', 'Answer', 'Cite'],
    stack: ['RAG', 'Embeddings', 'Vector search', 'Supabase', 'Evaluation'],
    challenges: [
      'Enterprise documents are noisy — headers, tables, and stale duplicates all pollute retrieval',
      'Separating what the evidence says from what the model inferred',
      'Keeping answers useful when the best source is only partially relevant',
    ],
    outcome:
      'Answers arrive with the paragraph they came from, so the reader can disagree with the source rather than with the model.',
    next: ['Role-based collections', 'Feedback-driven reranking', 'Automated freshness checks'],
  },
  {
    key: 'ml',
    title: 'Wildlife Conservation Analysis',
    note: 'Computer-vision pipeline for species analysis — the work behind my copyright registration.',
    problem:
      'Survey imagery was being classified by hand, which does not scale and is inconsistent between people doing the classifying.',
    flow: ['Collect', 'Preprocess', 'Train', 'Evaluate', 'Publish'],
    stack: ['Python', 'Computer vision', 'Classification', 'Evaluation'],
    challenges: [
      'Heavy class imbalance — rare species are exactly the ones that matter and the ones with the fewest samples',
      'Field imagery quality varies enormously with light and distance',
      'Reporting accuracy honestly per class rather than as one flattering average',
    ],
    outcome:
      'Registered as a copyright: Wildlife Conservation and Analysis Using Machine Learning.',
    next: ['Larger labelled set', 'Edge deployment for field use'],
  },
];

export const projectCategories = {
  'llm-flow': 'LLM automation flows',
  'llm-eval': 'LLM testing & evaluation',
  automation: 'API automation',
  release: 'Release engineering',
  ml: 'Machine learning',
};
