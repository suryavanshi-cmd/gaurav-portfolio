/*
  Every live demo on the site, in one list.

  The lab index, each /lab/[slug] page, the footer, the sitemap and the home
  page all read this, so adding a demo is one entry here plus its component in
  components/lab/LabTool.jsx.

  Two groups: `tool` (everyday tools anyone can use — money, time, passwords)
  and `learn` (games and simulators that explain an idea by letting you play
  with it).

  `art` picks the small CSS-only preview drawn on the demo's card.
  `post` links the demo to the article that explains the idea behind it.
*/

const DEMOS = [
  {
    slug: 'langgraph',
    title: 'LangGraph: wire the agent',
    short: 'LangGraph game',
    note: 'A puzzle game. Connect the arrows between an agent’s steps, run the tests, and learn how LangGraph agents loop, stop and wait for people.',
    about: [
      'LangGraph builds an AI app as a graph: steps (nodes) that share one state, joined by arrows (edges). Some arrows depend on what just happened.',
      'Each level leaves some arrows open. Pick where they go, then run the tests — you watch every test walk through your graph.',
      'Four levels, four patterns: a plain graph, a tool loop, a retry limit, and pausing for a person’s approval.',
      'No AI model is called. The steps are tiny bits of code, so the game is about the graph itself — which is exactly what LangGraph adds.',
    ],
    tags: ['LangGraph', 'AI agents'],
    art: 'graph',
    post: 'langgraph-and-langfuse-in-plain-words',
    group: 'learn',
  },
  {
    slug: 'langfuse',
    title: 'Langfuse: trace detective',
    short: 'Langfuse game',
    note: 'A user complains. You get the trace. Tap the step that caused it — six cases, three lives.',
    about: [
      'Langfuse records every run of an AI app as a trace: each step, how long it took, the tokens and cost of each model call, the prompt version and any scores.',
      'Each case gives you a complaint (slow, wrong, expensive, wrong language, stuck, 👎) and one trace. Find the step that caused it.',
      'Every case ends with the one habit it teaches — like “slow? read the timeline first”.',
      'The traces are made up, and drawn the way Langfuse shows them.',
    ],
    tags: ['Langfuse', 'AI observability'],
    art: 'trace',
    post: 'langgraph-and-langfuse-in-plain-words',
    group: 'learn',
  },
  {
    slug: 'rate-limiter',
    title: 'Rate limiter',
    short: 'Rate limiter',
    note: 'Watch a token bucket let requests in or turn them away. Change the limits and see what gets through.',
    about: [
      'A token bucket holds a fixed number of tokens. Each request spends one. Tokens refill at a steady rate.',
      'If the bucket is empty, the request is rejected with 429 Too Many Requests. That keeps one noisy client from using up the whole server.',
      'The bucket size decides how big a burst you allow. The refill rate decides the long-run average.',
    ],
    tags: ['System design', 'APIs'],
    art: 'flow',
    post: 'api-design-for-100k-rps',
  },
  {
    slug: 'flaky-suite',
    title: 'Flaky test suite',
    short: 'Flaky test suite',
    note: 'Run a CI suite 20 times. Fix sleeps and shared data, add workers and retries — and see when a retry hides a real bug.',
    about: [
      'Twelve tests sleep for 3 seconds, eight share data, and one finds a real bug in a quarter of runs. The rest just pass.',
      'Waiting for the condition makes the suite faster and removes the timing failures. Giving each test its own data removes the failures that only appear in parallel.',
      'Retries turn builds green — including the one run where the bug showed up. Retry at most once, and count every retry.',
    ],
    tags: ['Test automation', 'CI/CD'],
    art: 'lanes',
    post: 'slow-and-flaky-test-suites',
  },
  {
    slug: 'eval-gate',
    title: 'LLM test gate',
    short: 'LLM test gate',
    note: 'Test an LLM feature the way the post says: structure, facts, then meaning. Compare two prompts and see which one the gate lets ship.',
    about: [
      'Exact match fails even correct answers, because the wording changes every run.',
      'Structure and facts are plain code checks — edit any answer and they re-run as you type.',
      'Meaning uses a judge model’s label. This page has no model, so those labels are written with the cases, and an edited answer is marked “not re-judged”.',
      'The build passes on a percentage, but structure checks and critical cases must always pass.',
    ],
    tags: ['LLM testing', 'CI/CD'],
    art: 'gate',
    post: 'testing-llm-features-in-ci',
  },
  {
    slug: 'guardrail',
    title: 'Guardrail game',
    short: 'Guardrail game',
    note: 'Catch prompt-injection attacks and let safe prompts pass. An arcade round, then a slower round scored on precision and recall.',
    about: [
      'An AI guardrail can fail two ways: it lets an attack through, or it blocks a normal question.',
      'Blocking normal questions is the failure that gets guardrails switched off, so both are scored.',
    ],
    tags: ['LLM testing', 'Security'],
    art: 'game',
    post: 'false-positives-kill-guardrails',
  },
  {
    slug: 'circuit-breaker',
    title: 'Circuit breaker',
    short: 'Circuit breaker',
    note: 'Make a service your API depends on fail or hang. Watch threads pile up — and how a circuit breaker keeps the rest of the API alive.',
    about: [
      'Every call to another service holds a thread until it answers. If that service hangs, threads run out and the whole API stops — even endpoints that never call it.',
      'A circuit breaker counts recent failures. Past a threshold it opens, and calls fail at once instead of waiting.',
      'After a pause it lets a few trial calls through. If they work, it closes again.',
    ],
    tags: ['System design', 'Resilience'],
    art: 'breaker',
    post: 'api-design-for-100k-rps',
  },
  {
    slug: 'cache-stampede',
    title: 'Cache stampede',
    short: 'Cache stampede',
    note: 'See what happens to the database when many cache keys expire at the same moment — and how two small fixes stop it.',
    about: [
      'When many keys are cached at the same time with the same expiry, they also expire together. Every request for them misses at once and hits the database.',
      'Jitter gives each key a slightly different expiry, so the misses spread out.',
      'Single-flight lets only one request refresh a key; the rest wait for that result instead of all querying the database.',
    ],
    tags: ['Caching', 'Databases'],
    art: 'bars',
    post: 'api-design-for-100k-rps',
  },
  {
    slug: 'capacity',
    title: 'Capacity planner',
    short: 'Capacity planner',
    note: 'Enter your traffic and latency. Get how many requests are in flight, and whether your database pool can take it.',
    about: [
      'Little’s Law: requests in flight = requests per second × seconds per request.',
      'That one number sizes your connection pools, threads and memory. When latency goes up, it goes up with it.',
      'A database runs best with a small pool — roughly twice its CPU cores, across all your servers combined.',
    ],
    tags: ['System design', 'Performance'],
    art: 'gauge',
    post: 'the-database-is-the-bottleneck',
  },
  {
    slug: 'json-journey',
    title: 'API chain builder',
    short: 'API chain builder',
    note: 'Paste an API response, pull values out with JSONPath, and see them filled into the next request.',
    about: [
      'Most API tests are a chain: call one endpoint, take an ID from the response, send it to the next one.',
      'Here the chain is data, not code. Change a path or a template and the result updates as you type.',
      'It is a small, browser-only version of the idea behind my Generic Dynamic Journey Builder.',
    ],
    tags: ['Test automation', 'APIs'],
    art: 'json',
    post: 'api-automation-that-survives-change',
  },
  {
    slug: 'llm-notes',
    title: 'Next-token notes',
    short: 'Next-token notes',
    note: 'My notes on how an LLM picks the next word — tokens, embeddings, attention, softmax — one step at a time.',
    about: [
      'These are notes I made while learning it, not a course.',
      'Every number in it is simulated to show the idea; none come from a real model.',
    ],
    tags: ['LLM', 'Notes'],
    art: 'notes',
    post: null,
  },
  {
    slug: 'assistant',
    title: 'Ask about me',
    short: 'Ask-me assistant',
    note: 'Ask anything about me. It searches this site, then answers in plain words — always showing where the answer came from.',
    about: [
      'It searches my résumé facts, projects and posts (BM25) and finds the passages that match.',
      'When AI answers are on, Gemini writes a short reply from those passages only. Otherwise it shows the best passage as-is. Either way, the source is linked.',
      'If nothing matches, it says so — it never guesses.',
      'Open it any time with ⌘K, Ctrl-K or the / key.',
    ],
    tags: ['RAG', 'Search'],
    art: 'chat',
    post: 'bad-rag-answers-are-retrieval-failures',
  },
];

/* Everyday tools: useful to anyone, no sign-up, nothing leaves the browser. */
const TOOLS = [
  {
    slug: 'split-bill',
    title: 'Split the bill',
    short: 'Bill splitter',
    note: 'Add friends and who paid for what. Get the fewest payments that settle everyone — and copy it for WhatsApp.',
    about: [
      'Each expense is split equally between the people ticked for it. Untick someone who wasn’t there.',
      'Everyone’s balance is what they paid minus their share. Then the person who owes most pays the person owed most, until everyone is even. With 5 friends, it never takes more than 4 payments.',
      'Your list stays in this browser, so it is still there tomorrow. Nothing is uploaded.',
    ],
    tags: ['Everyday', 'Money'],
    art: 'split',
    post: null,
    group: 'tool',
  },
  {
    slug: 'emi',
    title: 'Loan EMI calculator',
    short: 'EMI calculator',
    note: 'Your monthly EMI, the total interest, and how much you save by paying a little extra every month.',
    about: [
      'EMI = loan × monthly rate × (1 + rate)^months ÷ ((1 + rate)^months − 1).',
      'The chart shows each year’s payments. Early years are mostly interest; later years are mostly the loan.',
      'Any extra payment goes straight to the loan itself, so the loan ends sooner and you pay less interest.',
    ],
    tags: ['Everyday', 'Money'],
    art: 'ring',
    post: null,
    group: 'tool',
  },
  {
    slug: 'sip',
    title: 'SIP planner',
    short: 'SIP planner',
    note: 'See what a monthly investment grows into — or how much you need each month to reach a goal.',
    about: [
      'Every month the amount is added, then the whole pot grows by the monthly return.',
      'A yearly step-up raises the monthly amount once a year, like a salary rise.',
      'It also shows the final amount in today’s money, at 6% inflation — the number that tells you what it will actually buy.',
    ],
    tags: ['Everyday', 'Money'],
    art: 'growth',
    post: null,
    group: 'tool',
  },
  {
    slug: 'focus',
    title: 'Focus timer',
    short: 'Focus timer',
    note: 'Work for 25 minutes, rest for 5, repeat. A calm timer that keeps time even when the tab is in the background.',
    about: [
      'Pick a rhythm: 25/5, 50/10 or 15/3 minutes of focus and break.',
      'The ring shows time left. The tab title shows it too, and a soft chime plays at the end of each part.',
      'Today’s finished sessions are counted and kept in this browser.',
    ],
    tags: ['Everyday', 'Focus'],
    art: 'timer',
    post: null,
    group: 'tool',
  },
  {
    slug: 'password',
    title: 'Password maker',
    short: 'Password maker',
    note: 'Strong passwords or easy-to-type word phrases, with an honest “how long to guess” meter.',
    about: [
      'Made with your browser’s secure random generator. Nothing is sent or saved.',
      'Strength is counted in bits: how many equally likely choices there were. Guess time assumes ten billion guesses a second.',
      'Seven random words and a number are about as strong as 10 random characters — and much easier to type on a phone.',
    ],
    tags: ['Everyday', 'Security'],
    art: 'pw',
    post: null,
    group: 'tool',
  },
];

export const LAB = [...TOOLS, ...DEMOS.map((d) => ({ group: 'learn', ...d }))];
export const LAB_TOOLS = LAB.filter((t) => t.group === 'tool');
export const LAB_LEARN = LAB.filter((t) => t.group === 'learn');

export const labBySlug = Object.fromEntries(LAB.map((tool) => [tool.slug, tool]));
