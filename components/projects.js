/*
  Projects, in three kinds:

    work    Done at a job. Every claim comes from the résumé
            (public/Gaurav-Suryavanshi-Resume.pdf) and nothing more.
    built   Things I built on my own: the résumé's project section, the two
            products in this repository, and what runs live on this site.
    design  Systems I have worked out on paper — the problem, the design and
            the trade-offs. Not shipped, and every page says so.

  Each one gets a page at /projects/[slug]. The assistant (components/rag)
  indexes this file, so it can answer questions about any project.
*/

const REPO = 'https://github.com/suryavanshi-cmd/gaurav-portfolio/tree/main';

export { KINDS } from './format';

export const projects = [
  /* ----- Work ------------------------------------------------------------ */
  {
    slug: 'claims-api-test-framework',
    kind: 'work',
    category: 'Test automation',
    where: 'Vidal Health TPA · 2024 — now',
    title: 'Claims API test framework',
    note: 'The Java 17 + TestNG + Rest-Assured framework that tests health-insurance claim, enrolment and partner APIs.',
    problem:
      'Insurance claims pass through many APIs and partner systems. A bug here can reach someone’s claim, so every release needs a regression run that is fast and can be trusted.',
    flow: ['Build request', 'Call the API', 'Check the schema', 'Check the database', 'Report'],
    stack: ['Java 17', 'TestNG', 'Rest-Assured', 'Oracle SQL', 'CI/CD'],
    challenges: [
      'A partner-integration regression suite of 190+ test cases across many REST APIs.',
      'Every response checked against its schema, and the result checked again in the database with Oracle SQL.',
      'TestNG tuned to run in parallel, so regression finishes sooner and CI stays steady.',
      'Test coverage for database migrations, blue-green deploys and real-time (SSE) claim updates.',
    ],
    outcome:
      'Faster regression runs and steadier CI feedback across releases. Backend bugs get reproduced, triaged and closed together with the developers.',
    featured: true,
  },
  {
    slug: 'log-to-test-service',
    kind: 'work',
    category: 'Backend + testing',
    where: 'Bajaj Finserv Health · 2024',
    title: 'Log-to-test microservice',
    note: 'Took real HTTPS traffic from ELK logs, turned it into curl commands, and ran them as API tests.',
    problem:
      'Writing API tests by hand is slow. Real traffic already shows how the APIs are used — it is sitting in the logs.',
    flow: ['Read ELK logs', 'Generate curl', 'Run as tests'],
    stack: ['Node.js', 'NestJS', 'ELK', 'curl'],
    challenges: [
      'Generated curl commands straight from logged HTTPS responses, instead of writing each test by hand.',
      'Moved the service from Node.js to NestJS for better speed and scale.',
    ],
    outcome: 'API tests that come from how the system is really used.',
  },
  {
    slug: 'realtime-chat-backend',
    kind: 'work',
    category: 'Backend',
    where: 'Esenceweb IT Solutions · 2024',
    title: 'Real-time backend with a chatbot',
    note: 'Node.js and Express services with MongoDB, JWT login, live messaging over Socket.io and a Dialogflow chatbot.',
    problem: 'The app needed a backend for accounts, live messages, and automatic replies.',
    flow: ['Log in (JWT)', 'Store (MongoDB)', 'Live messages (Socket.io)', 'Auto-reply (Dialogflow)'],
    stack: ['Node.js', 'Express', 'MongoDB', 'JWT', 'Socket.io', 'Dialogflow'],
    challenges: [
      'Backend services in Node.js and Express, with data in MongoDB.',
      'JWT authentication for logins.',
      'Real-time messaging with Socket.io.',
      'A Dialogflow chatbot wired in for automatic answers.',
    ],
    outcome: 'A working backend for accounts, live chat and bot replies.',
  },

  /* ----- Built ----------------------------------------------------------- */
  {
    slug: 'connect-to-nature',
    kind: 'built',
    category: 'Full-stack product',
    title: 'Connect to Nature',
    note: 'A farm-stay marketplace for the Kokan and Nashik regions — one app, two portals, in English, Hindi and Marathi.',
    problem:
      'A farming family with a spare room has no easy way to reach city travellers who would pay to spend two days on a farm. Travellers have no trusted place to find them.',
    flow: ['Farmer lists', 'Admin approves', 'Traveller plans', 'Pay (Razorpay)', 'Stay + review'],
    stack: ['Next.js 15', 'Supabase', 'PostgreSQL', 'Row-level security', 'Razorpay', 'i18n (EN / HI / MR)'],
    challenges: [
      'Two portals — traveller and farmer (shetkari) — from one app and one database. Middleware reads the domain and serves the right one.',
      'A trip planner that builds a two-day plan from what that farm actually runs, and shows the farmer’s share of the price.',
      'The farmer portal is Marathi by default, with larger text and bigger buttons.',
      'Security in the database itself: row-level security policies, tested in CI against a real Postgres.',
    ],
    outcome: 'A complete marketplace with a live database. It also runs with no setup at all, in a demo mode that serves seeded farms from memory.',
    source: `${REPO}/connect-to-nature`,
    featured: true,
  },
  {
    slug: 'rakta-setu',
    kind: 'built',
    category: 'Automation + health',
    title: 'Rakta-Setu',
    note: 'Sends blood reports to patients on WhatsApp in Marathi, with a voice web page that explains every result.',
    problem:
      'A blood analyzer drops a report file on the lab PC and nothing else happens. Someone has to find the patient and send it — and the patient gets a PDF full of English terms they cannot read.',
    flow: ['Watch folder', 'Parse report', 'Explain in Marathi', 'Send on WhatsApp', 'Secure web page'],
    stack: ['Node.js', 'Express', 'SQLite / Supabase', 'WhatsApp Cloud API', 'Web Speech API'],
    challenges: [
      '33 blood tests explained in plain Marathi, with separate normal ranges for men and women.',
      'Dangerous values show a clear “see a doctor today” banner instead of hiding in a list.',
      'Patients can ask questions out loud in Marathi and hear the answers.',
      'Scanned PDFs are refused on purpose — sending a mis-read result is worse than sending nothing.',
    ],
    outcome: 'The report reaches the patient automatically, in their language, behind a secure expiring link and PIN.',
    source: `${REPO}/rakta-setu`,
    featured: true,
  },
  {
    slug: 'dynamic-journey-builder',
    kind: 'built',
    category: 'Test automation',
    title: 'Generic Dynamic Journey Builder',
    note: 'Turns a Chrome DevTools HAR export into a repeatable API test — it pulls out values, chains the requests and checks the results.',
    problem: 'Recording a user journey in the browser is easy. Turning it into an automated API test by hand is slow.',
    flow: ['Import HAR', 'Find values', 'Chain requests', 'Replay', 'Assert'],
    stack: ['Java', 'Node.js', 'HAR parsing'],
    challenges: [
      'The same ID can appear in many places, so each extracted value has to be mapped to the right later request.',
      'HAR files can hold passwords and tokens, which must be stripped before anything is saved.',
      'Values from one response feed the next request, so the chain order matters.',
    ],
    outcome: 'A recorded browser session becomes a repeatable, automated API test.',
    live: 'json-journey',
    featured: true,
  },
  {
    slug: 'api-sequencing-engine',
    kind: 'built',
    category: 'Test automation',
    title: 'JSON-Driven API Sequencing Engine',
    note: 'Chains API calls from a JSON config, with retry, polling, live SSE output and a visual builder.',
    problem: 'Many API tests have the same shape: call, wait, pass a value on. Writing each one as code repeats the same work.',
    flow: ['JSON config', 'Fill in values', 'Call + retry', 'Stream results (SSE)', 'Report'],
    stack: ['Node.js', 'Express', 'SSE'],
    challenges: [
      'Some endpoints answer “accepted” and finish later, so steps poll until done or time out.',
      'Results stream to the builder over SSE while each step runs.',
      'The config has to stay easy for someone else to read and edit.',
    ],
    outcome: 'New test sequences are written as config and run from a visual builder, not coded by hand.',
    live: 'json-journey',
  },
  {
    slug: 'wildlife-conservation',
    kind: 'built',
    category: 'Machine learning',
    where: 'Honours project · PCCOER',
    title: 'Wildlife Conservation Analysis',
    note: 'Counts animals in images and video and classifies species against the IUCN Red List. Copyright-registered.',
    problem: 'Counting and naming animals in survey photos by hand is slow, and different people count differently.',
    flow: ['Images / video', 'Detect (YOLOv5)', 'Classify (Inception V3)', 'Count', 'Red List status'],
    stack: ['Python', 'YOLOv5', 'Inception V3'],
    challenges: [
      'The rare species matter most — and have the fewest photos to learn from.',
      'Light and distance change a lot between field photos.',
      'Accuracy has to be checked species by species, not as one average.',
    ],
    outcome: 'A working pipeline, registered as a copyright: “Wildlife Conservation and Analysis Using Machine Learning”.',
  },
  {
    slug: 'ask-me-assistant',
    kind: 'built',
    category: 'Search + LLM',
    where: 'Live on this site',
    title: 'Ask-me assistant',
    note: 'A search assistant over this whole site. No AI model — every answer is something I wrote, shown with its source.',
    problem:
      'A reader with one question — does he know Oracle? what is the CGPA? — has to skim the whole site. A chatbot on a hosted model costs money per visitor and can make things up.',
    flow: ['Split into passages', 'Index (BM25)', 'Search', 'Rank', 'Answer with source'],
    stack: ['BM25', 'JavaScript', 'No server'],
    challenges: [
      'Short résumé facts and long articles are indexed separately, so one question finds the one passage that answers it.',
      'A synonym map links words people ask with (“tech”) to words the site uses (“Java 17, TestNG”).',
      'If nothing matches well, it says so instead of guessing.',
    ],
    outcome: 'Every answer is a real passage with a link to where it came from. It costs nothing to run and works offline.',
    live: 'assistant',
    source: 'https://github.com/suryavanshi-cmd/gaurav-portfolio/tree/main/components/rag',
  },
  {
    slug: 'guardrail-game',
    kind: 'built',
    category: 'LLM testing',
    where: 'Live on this site',
    title: 'Guardrail game',
    note: 'Catch prompt-injection attacks and let safe prompts through — an arcade round, then a slower round scored on precision and recall.',
    problem: 'Guardrail work is usually described, not shown. The hard part — catching an attack without blocking a normal question — is easier to play than to explain.',
    flow: ['Prompts fall', 'Catch or let pass', 'Score', 'Precision + recall'],
    stack: ['Canvas', 'JavaScript', 'Prompt injection'],
    challenges: [
      'Blocking a normal question is the costly mistake, so it loses points.',
      'Some attacks hide inside retrieved documents, not in what the user typed.',
      'The slower round scores both kinds of mistake, the way a real guardrail should be judged.',
    ],
    outcome: 'A game that teaches the real trade-off in AI safety filters.',
    live: 'guardrail',
  },

  /* ----- Designs --------------------------------------------------------- */
  {
    slug: 'agentic-claims-triage',
    kind: 'design',
    category: 'LLM flows',
    title: 'Agentic claims triage',
    note: 'A plan → tools → check loop that reads a claim, picks which checks apply, and asks a human when evidence is thin.',
    problem: 'Claims arrive as free text plus files. Deciding which of many checks apply takes time, and a fixed decision tree needs a code change for every new product.',
    flow: ['Intake', 'Plan', 'Call tools', 'Check', 'Route'],
    stack: ['Tool calling', 'JSON Schema', 'REST APIs'],
    challenges: [
      'The model may only call tools on a fixed allow-list — never tools it invents.',
      'A token budget and a max number of tool calls, enforced outside the model.',
      'A separate checker that can reject the plan, not just approve it.',
    ],
    outcome: 'Each decision keeps a written trace, so a reviewer checks the reasoning instead of redoing it.',
  },
  {
    slug: 'document-extraction-flow',
    kind: 'design',
    category: 'LLM flows',
    title: 'Document extraction flow',
    note: 'Scanned bills to structured JSON, with schema checks and a review queue for anything uncertain.',
    problem: 'Hospital bills are scanned, rotated and formatted differently by every hospital. Fixed templates break on each new layout.',
    flow: ['OCR', 'Extract', 'Validate', 'Confidence check', 'Review queue'],
    stack: ['OCR', 'Structured output', 'JSON Schema'],
    challenges: [
      'A confident wrong number is worse than a blank, so low-confidence fields go to a person.',
      'The JSON is validated by code after the model answers — never trusted as-is.',
      'Reviewer fixes are kept as labelled data, not lost.',
    ],
    outcome: 'People only review the fields that need it, not every document.',
  },
  {
    slug: 'llm-gateway',
    kind: 'design',
    category: 'LLM flows',
    title: 'LLM gateway',
    note: 'One endpoint in front of several models: routing, fallback, caching and a spend limit per team.',
    problem: 'Every prototype called a model provider directly, with its own key and retry logic. Nobody knew what a feature cost.',
    flow: ['Request', 'Route', 'Cache', 'Call + fallback', 'Meter cost'],
    stack: ['Streaming', 'Cache', 'Circuit breaker'],
    challenges: [
      'Switching providers mid-stream without repeating text the user already saw.',
      'Cache keys include the prompt version, so a prompt change is not hidden by old answers.',
      'Hitting the budget moves to a cheaper model instead of failing.',
    ],
    outcome: 'Cost and speed per feature in one place, and an outage at one provider slows things down instead of breaking them.',
  },
  {
    slug: 'prompt-release-pipeline',
    kind: 'design',
    category: 'LLM flows',
    title: 'Prompt release pipeline',
    note: 'Prompts treated like code: versioned, reviewed, rolled out slowly, and rolled back in one step.',
    problem: 'Prompts lived in string literals. A one-word edit shipped with no review and no way back.',
    flow: ['Write', 'Review diff', 'Run evals', 'Staged rollout', 'Rollback'],
    stack: ['Versioning', 'Evals in CI', 'Feature flags'],
    challenges: [
      'A prompt change cannot merge until the eval suite passes.',
      'Every answer in production records the exact prompt version that made it.',
    ],
    outcome: 'Rolling back a bad prompt becomes a normal deploy.',
  },
  {
    slug: 'ticket-auto-resolution',
    kind: 'design',
    category: 'LLM flows',
    title: 'Support ticket auto-reply',
    note: 'Sorts a ticket, finds the right runbook, drafts a reply, and hands it to a person when unsure.',
    problem: 'Most tickets are the same few questions — but the rare ones are exactly where an automatic reply does damage.',
    flow: ['Classify', 'Retrieve', 'Draft', 'Policy check', 'Send or escalate'],
    stack: ['RAG', 'Classification', 'Audit log'],
    challenges: [
      'Setting the “hand to a human” threshold from real outcomes, not a guess.',
      'Keeping the draft tied to the runbook so it cannot invent a policy.',
    ],
    outcome: 'Common tickets close with a source attached; unclear ones reach a person with the research done.',
  },
  {
    slug: 'prompt-regression-tests',
    kind: 'design',
    category: 'LLM testing',
    title: 'Prompt regression tests',
    note: 'Golden test cases that run in CI, so a prompt or model change cannot quietly break a right answer.',
    problem: 'LLM output changes wording every run, so normal “equals” tests fail — and teams end up with no tests at all.',
    flow: ['Golden set', 'Run', 'Check', 'Compare', 'Gate'],
    stack: ['TestNG', 'Golden datasets', 'CI/CD'],
    challenges: [
      'Check facts and structure, not exact wording.',
      'Pass on a percentage of cases, with some cases that must always pass.',
      'Expected answers written by a person, never copied from a run.',
    ],
    outcome: 'A prompt change that hurts accuracy fails the build, with the exact cases it broke.',
  },
  {
    slug: 'rag-retrieval-tests',
    kind: 'design',
    category: 'LLM testing',
    title: 'RAG retrieval tests',
    note: 'Tests the “find the right document” half of RAG on its own, because most bad answers start there.',
    problem: 'When a RAG assistant answers badly, people blame the model. Usually the right document was never found.',
    flow: ['Question set', 'Retrieve', 'Recall@k', 'Faithfulness', 'Report'],
    stack: ['Vector search', 'Keyword search', 'Reranking'],
    challenges: [
      'Building test questions from real ones, not from what the search already returns.',
      'An answer can match its source perfectly and still be wrong if the source is old.',
    ],
    outcome: 'Search and answer quality are scored separately, so effort goes to the half that is failing.',
  },
  {
    slug: 'hallucination-checker',
    kind: 'design',
    category: 'LLM testing',
    title: 'Hallucination checker',
    note: 'Splits an answer into single claims and checks each one against the source.',
    problem: '“Did it make something up?” cannot be measured for a whole paragraph. One sentence can be right and the next invented.',
    flow: ['Split claims', 'Find evidence', 'Supported?', 'How serious?', 'Flag'],
    stack: ['Claim extraction', 'Evidence matching'],
    challenges: [
      'Deciding what counts as “supported” when the source only implies it.',
      'A made-up policy clause is worse than a wrong date — severity matters.',
    ],
    outcome: 'Each unsupported claim is shown next to the evidence that should have backed it.',
  },
  {
    slug: 'llm-load-test',
    kind: 'design',
    category: 'LLM testing',
    title: 'LLM load and cost test',
    note: 'Load-tests an LLM feature like any other service: response times, tokens per user flow, and the breaking point.',
    problem: 'LLM features get tested for correctness, then shipped without anyone knowing how they behave under real traffic or what they cost.',
    flow: ['Scenario', 'Ramp up', 'Measure', 'Cost model', 'Threshold'],
    stack: ['Load testing', 'Token counts', 'Percentiles'],
    challenges: [
      'Time to first token and total time are different numbers with different budgets.',
      'Telling a real slowdown apart from provider rate limits.',
    ],
    outcome: 'A known cost per user flow and a known concurrency limit, checked every release.',
  },
  {
    slug: 'api-contract-drift',
    kind: 'design',
    category: 'Release engineering',
    title: 'API contract drift check',
    note: 'Compares OpenAPI specs between environments and blocks the deploy on a breaking change.',
    problem: 'A field quietly changes type between UAT and production, and nobody notices until a client crashes on it.',
    flow: ['Fetch specs', 'Normalise', 'Diff', 'Breaking?', 'Gate'],
    stack: ['OpenAPI', 'CI/CD', 'Node.js'],
    challenges: [
      'Telling a real breaking change apart from harmless spec noise.',
      'Reporting who is affected, not just which JSON path changed.',
    ],
    outcome: 'Breaking changes are caught in the pipeline, before a client finds them.',
  },
  {
    slug: 'grounded-knowledge-assistant',
    kind: 'design',
    category: 'LLM flows',
    title: 'Grounded knowledge assistant',
    note: 'An assistant over runbooks and API specs that keeps every answer attached to its source.',
    problem: 'Knowledge is spread across runbooks, incident notes and specs. Finding the right paragraph takes longer than acting on it.',
    flow: ['Ingest', 'Chunk + index', 'Retrieve', 'Answer', 'Cite'],
    stack: ['RAG', 'Embeddings', 'Vector search'],
    challenges: [
      'Real documents are messy — headers, tables and old copies all hurt search.',
      'Keeping what the source says separate from what the model guessed.',
    ],
    outcome: 'Answers come with the paragraph they came from, so people can check the source.',
  },
];

export const projectsBySlug = Object.fromEntries(projects.map((project) => [project.slug, project]));

export const projectHref = (project) => `/projects/${project.slug}`;
