/*
  Engineering posts: API system design and test automation.

  Written to be short and plain. Each has `points` — the "In short" list shown
  at the top — and a body of simple blocks: h2, p, ul, ol, code, table, quote.
  Reading time is computed in posts.js from the word count.
*/

export const engineeringPosts = [
  {
    slug: 'api-design-for-100k-rps',
    title: 'How to build an API for 100,000 requests a second',
    date: '2026-08-11',
    tags: ['System design', 'APIs', 'Scaling'],
    summary:
      'The number alone means little. What matters is the kind of traffic, how many requests are in flight at once, and what your system does when it is over its limit.',
    points: [
      'First ask: reads or writes? How big? What response time?',
      'Little’s Law: requests in flight = requests per second × response time.',
      'The database pool breaks first. Keep it small and put a pooler in front.',
      'Plan for overload: reject early, bound every queue, time out every call.',
    ],
    body: [
      { type: 'h2', text: 'The number is only half the question' },
      { type: 'p', text: '100,000 reads a second of a small, cacheable page is easy — a CDN can serve it. 100,000 writes a second that each touch three tables is a hard project. Same number, very different work.' },
      { type: 'p', text: 'So ask five things first. Reads or writes? How big is each payload? What response time do you need — at p99, not on average? How many other services does one request call? Is the traffic steady, or does it spike?' },

      { type: 'h2', text: 'Little’s Law sizes everything' },
      {
        type: 'code',
        lang: 'text',
        code: `in flight = requests per second × response time

100,000 × 0.05 s  =  5,000 requests in flight
100,000 × 0.20 s  = 20,000 requests in flight`,
      },
      { type: 'p', text: 'Only the response time changed — and now you must hold four times the connections, threads and memory. A slow dependency does not just slow you down. It multiplies what you have to keep open until something runs out.' },

      { type: 'h2', text: 'What breaks, in order' },
      {
        type: 'ol',
        items: [
          'The database connection pool. Response times jump off a cliff, not up a slope.',
          'One slow query or missing index — then it drags the shared pool down.',
          'Garbage-collection pauses. p99 goes spiky while the average looks fine.',
          'Slow services you call. You are fine; you are waiting on them.',
          'Network limits: ports, load balancer tables, TLS handshakes.',
        ],
      },

      { type: 'h2', text: 'Keep the database pool small' },
      { type: 'p', text: '50 servers with 100 connections each is 5,000 connections. A Postgres server works best with a few dozen. More connections make it slower, not faster. Put a pooler such as PgBouncer in front, so many app connections share a few real ones.' },

      { type: 'h2', text: 'Take work off the database' },
      {
        type: 'ol',
        items: [
          'Cache at the CDN anything that is the same for everyone.',
          'Cache per user in Redis, with a version number in the key so an update makes the old value unreachable.',
          'Send reads that can be a second old to replicas.',
          'Do slow writes in the background: accept, save the request, return 202.',
        ],
      },

      { type: 'h2', text: 'Stop the cache stampede' },
      { type: 'p', text: 'If many keys were cached at the same moment, they also expire at the same moment. Every request misses at once and the database gets hit by all of them. Two fixes: add a little random time (jitter) to each expiry, and let only one request rebuild each key while the rest wait.' },

      { type: 'h2', text: 'Plan for overload' },
      { type: 'p', text: 'You will go over capacity one day. The question is what happens in that second. A system that accepts everything just gets slower until it falls over. A system that turns some requests away stays up.' },
      {
        type: 'ul',
        items: [
          'Bound every queue. An endless queue turns slowness into a crash.',
          'Reject early with 429 — before the request uses a database connection.',
          'Put a timeout on every outside call, and a circuit breaker in front of it.',
          'Make clients retry with backoff and jitter, not all at the same moment.',
          'Make writes idempotent. At this scale, retries of successful requests will happen.',
        ],
      },

      { type: 'h2', text: 'Measure p99, not the average' },
      { type: 'p', text: 'At 100,000 requests a second, “1% are slow” means 1,000 slow requests every second. And check that your load-testing tool corrects for coordinated omission — otherwise, when the system stalls, the tool quietly sends fewer requests and the stall never shows up in the results.' },
    ],
  },

  {
    slug: 'the-database-is-the-bottleneck',
    title: 'Your API is slow because of the database',
    date: '2026-08-03',
    tags: ['Databases', 'Performance', 'SQL'],
    summary:
      'A slow API is rarely slow because of app code. It is usually a missing index, a query inside a loop, a pool that is too big, or paging that gets slower the deeper you go.',
    points: [
      'Index column order matters: equality columns first, then range or sort.',
      'Read the query plan with EXPLAIN ANALYZE — never guess.',
      'A query inside a loop (the N+1) is the most common slowdown.',
      'Page with a cursor (keyset), not OFFSET.',
    ],
    body: [
      { type: 'h2', text: 'Index column order' },
      { type: 'p', text: 'A composite index works left to right, like a phone book sorted by surname, then first name. You can find every “Suryavanshi” fast. You cannot find every “Gaurav” without reading the whole book.' },
      {
        type: 'code',
        lang: 'sql',
        code: `CREATE INDEX idx_claims ON claims (status, created_at);

-- Uses the index: the first column is there.
WHERE status = 'PENDING' AND created_at > now() - interval '7 days'

-- Cannot use it: the first column is missing.
WHERE created_at > now() - interval '7 days'`,
      },
      { type: 'p', text: 'Put equality columns first, then the range or sort column. A wrong order does not throw an error. It just scans — fast on your laptop, very slow on ten million rows.' },

      { type: 'h2', text: 'Read the plan' },
      { type: 'p', text: 'Run EXPLAIN (ANALYZE, BUFFERS) on the query and look for three things: a Seq Scan on a big table, estimated rows far from actual rows, and a high “Rows Removed by Filter” — rows read only to be thrown away.' },

      { type: 'h2', text: 'The query inside a loop' },
      {
        type: 'code',
        lang: 'javascript',
        code: `// 1 query, then 1 more per claim: 51 round trips for 50 claims.
for (const claim of claims) {
  claim.member = await db.members.find(claim.memberId);
}

// 2 queries, however many claims there are.
const ids = [...new Set(claims.map((c) => c.memberId))];
const members = await db.members.findMany({ id: { in: ids } });`,
      },
      { type: 'p', text: 'The slow version often reads better, so it passes code review. The lasting fix is a test: count the queries each endpoint runs, and fail the build when it goes over a limit.' },

      { type: 'h2', text: 'OFFSET gets slower the deeper you go' },
      { type: 'p', text: 'OFFSET 100000 makes the database read 100,050 rows to give you 50. Keyset paging reads only the 50 you want, at any depth.' },
      {
        type: 'code',
        lang: 'sql',
        code: `SELECT * FROM claims
WHERE (created_at, id) < ($1, $2)   -- the last row of the previous page
ORDER BY created_at DESC, id DESC
LIMIT 50;`,
      },

      { type: 'h2', text: 'A smaller pool is faster' },
      { type: 'p', text: 'A good start is (CPU cores × 2) + 1 connections — in total, across all servers. Past what the hardware can really run at once, extra connections only add waiting. A short queue in your app in front of a small pool beats a huge pool.' },

      { type: 'h2', text: 'Hot rows' },
      { type: 'p', text: 'A counter that every request updates becomes the speed limit of your whole system, because each update waits for the last one. Split it across many rows and add them up when you read it.' },

      { type: 'h2', text: 'Replica lag' },
      { type: 'p', text: 'Reading from replicas works until a user saves something and then cannot see it, because the replica is a moment behind. For a couple of seconds after a user writes, read their data from the primary. Then go back to replicas.' },
    ],
  },

  {
    slug: 'api-automation-that-survives-change',
    title: 'API tests that don’t break when the API changes',
    date: '2026-05-19',
    tags: ['Test automation', 'Rest-Assured', 'APIs'],
    summary:
      'One test class per API breaks every time a field is renamed. Describe each test as data instead, and a rename becomes a one-line config change.',
    points: [
      'Most API tests are a chain: call, take a value, call the next one.',
      'Write the chain as JSON and run every test with one engine.',
      'Check four layers: status, schema, business values, values for the next step.',
      'Test data is the hardest part — each test should create its own.',
    ],
    body: [
      { type: 'h2', text: 'The problem' },
      { type: 'p', text: 'A class per integration is easy to read at ten tests. At 190, a renamed field means editing many files — and only the person who wrote the framework can add a test.' },

      { type: 'h2', text: 'Tests as data' },
      {
        type: 'code',
        lang: 'json',
        code: `{
  "journey": "claim-settlement",
  "steps": [
    {
      "name": "register claim",
      "method": "POST",
      "path": "/claims",
      "extract": { "claimId": "$.result.claimSeqID" },
      "expect": { "status": 201 }
    },
    {
      "name": "settle",
      "method": "POST",
      "path": "/claims/\${claimId}/settlement",
      "expect": { "status": 200, "body": { "$.status": "APPROVED" } }
    }
  ]
}`,
      },
      { type: 'p', text: 'One engine reads this: fill in the values, send, check, extract, move on. Once it can do those five things it hardly changes again. New tests are config — and someone who never opens Java can review them.' },

      { type: 'h2', text: 'Stop on a missing value' },
      { type: 'p', text: 'If a step needs claimId and nothing extracted it, stop right there and name it. Sending “null” instead gives you a confusing 400 two steps later, and someone loses an afternoon.' },

      { type: 'h2', text: 'Separate values for parallel runs' },
      { type: 'p', text: 'Give every journey its own store of extracted values. With one shared store, parallel journeys overwrite each other and a different test fails each run.' },

      { type: 'h2', text: 'Check in layers' },
      {
        type: 'table',
        head: ['Layer', 'Checks', 'Fails when'],
        rows: [
          ['Transport', 'Status code and response time', 'The service is down or slow'],
          ['Schema', 'Response matches the JSON Schema', 'The contract changed'],
          ['Business', 'Values are right for this input', 'The logic changed'],
          ['Next step', 'Values the next call needs are present', 'The chain will break'],
        ],
      },
      { type: 'p', text: 'Separate layers make failures easy to read. “Schema failed, business passed” means a field moved. “Schema passed, business failed” means the logic changed.' },

      { type: 'h2', text: 'Test data' },
      {
        type: 'ul',
        items: [
          'Create what the test needs in setup, and delete it afterwards.',
          'Never hard-code an ID a person might edit in a shared environment.',
          'When creating data is slow, borrow it from a pool and give it back.',
        ],
      },

      { type: 'h2', text: 'Catch breaking changes before they deploy' },
      { type: 'p', text: 'If both environments publish an OpenAPI spec, compare them in the pipeline. Fail on removed fields, changed types and new required fields — before a client finds them.' },
    ],
  },

  {
    slug: 'slow-and-flaky-test-suites',
    title: 'How to fix a slow, flaky test suite',
    date: '2026-03-08',
    tags: ['Test automation', 'CI/CD', 'TestNG'],
    summary:
      'A suite that people rerun until it turns green is no longer a test suite. Flaky tests come from about five causes, and each one has a clear fix.',
    points: [
      'Replace every sleep with “wait until true, with a timeout”.',
      'Each test creates and deletes its own data.',
      'Shuffle test order in CI to find hidden dependencies.',
      'Retry at most once, and count every retry.',
    ],
    body: [
      { type: 'h2', text: 'When a suite stops meaning anything' },
      { type: 'p', text: 'The day someone says “just rerun it, that one is flaky” and everyone nods, a red build stops meaning anything. The suite still runs. It just no longer tells you the truth.' },

      { type: 'h2', text: 'The five causes' },
      {
        type: 'table',
        head: ['Cause', 'The sign', 'The fix'],
        rows: [
          ['Timing', 'Passes locally, fails in CI', 'Wait for the condition — never sleep'],
          ['Shared data', 'Passes alone, fails in the suite', 'Each test owns its data'],
          ['Test order', 'Fails when order changes', 'Shuffle order in CI, fix what breaks'],
          ['Outside services', 'Fails when they deploy', 'Stub them, except in a small smoke set'],
          ['A real bug', 'Rare, shows up under load', 'Celebrate — the test found something'],
        ],
      },

      { type: 'h2', text: 'Don’t sleep. Wait for the condition.' },
      {
        type: 'code',
        lang: 'java',
        code: `// Slow when it's ready in 50 ms. Still flaky at 3.1 s.
Thread.sleep(3000);

// Returns as soon as it's true. Fails with the last value it saw.
await(() -> getClaim(id), c -> "SETTLED".equals(c.getStatus()),
      Duration.ofSeconds(30), Duration.ofMillis(200));`,
      },
      { type: 'p', text: 'Put the last value in the error message. “Timed out” starts an investigation. “Timed out, last status was PENDING_APPROVAL” usually ends it.' },

      { type: 'h2', text: 'Each test owns its data' },
      { type: 'p', text: 'A test that passes alone but fails in the suite is reading another test’s data. Create the data in setup with a unique name, and delete it in teardown with alwaysRun = true — so a failing test still cleans up.' },

      { type: 'h2', text: 'Shuffle, then run in parallel' },
      { type: 'p', text: 'Random order finds tests that depend on each other. Parallel runs find shared state. Both will break things at first. That is the point — fix what breaks instead of turning them off.' },

      { type: 'h2', text: 'Retry once, and count it' },
      { type: 'p', text: 'Retrying a network blip is fine. Retrying until green hides real bugs forever. Allow one retry, and show every retry on a dashboard. A test that needed a retry did not really pass.' },

      { type: 'h2', text: 'Quarantine, with a deadline' },
      {
        type: 'ul',
        items: [
          'Move the flaky test out of the gate, so green is honest again.',
          'Keep running it on a schedule.',
          'Give it an owner and a fix-by date.',
          'Keep the quarantine short. If it grows, stop and fix the suite.',
        ],
      },

      { type: 'h2', text: 'Give the suite a time budget' },
      { type: 'p', text: 'Fail the build when the suite gets slower than its budget, and print the ten slowest tests on every run. A few tests usually take most of the time — and they are easy to find once you look.' },
    ],
  },
];
