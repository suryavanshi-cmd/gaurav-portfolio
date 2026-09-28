/*
  Every live demo on the site, in one list.

  The lab index, each /lab/[slug] page, the footer, the sitemap and the home
  page all read this, so adding a demo is one entry here plus its component in
  components/lab/tools.jsx.

  `art` picks the small CSS-only preview drawn on the demo's card.
  `post` links the demo to the article that explains the idea behind it.
*/

export const LAB = [
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
    note: 'A search assistant over this site. No AI model — every answer is something I wrote, shown with its source.',
    about: [
      'It indexes my résumé facts, projects and posts with BM25, then shows the best-matching passage with a link to where it came from.',
      'There is no model call, so it cannot make anything up. If nothing matches, it says so.',
      'Open it any time with ⌘K, Ctrl-K or the / key.',
    ],
    tags: ['RAG', 'Search'],
    art: 'chat',
    post: 'bad-rag-answers-are-retrieval-failures',
  },
];

export const labBySlug = Object.fromEntries(LAB.map((tool) => [tool.slug, tool]));
