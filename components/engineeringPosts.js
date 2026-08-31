/*
  Engineering posts: API system design and test automation.

  Kept separate from posts.js purely so neither file becomes unreadable. Both
  are concatenated and date-sorted in posts.js — block types are the same:
  h2, p, ul, ol, code, quote, table.
*/

export const engineeringPosts = [
  {
    slug: 'api-design-for-100k-rps',
    title: 'Designing an API that holds at 100,000 requests per second',
    date: '2026-08-11',
    readingMinutes: 13,
    tags: ['System design', 'Scalability', 'APIs'],
    summary:
      'A throughput number on its own is meaningless. What decides whether a service survives six figures a second is the workload shape, the concurrency maths, and what the system does when it is past its limit rather than under it.',
    body: [
      {
        type: 'p',
        text: '"It should handle 100,000 requests per second" is not a requirement. It is half of one. A hundred thousand reads a second of a cacheable 400-byte payload is a solved problem you can serve from a CDN. A hundred thousand writes a second that each touch three tables in a transaction is a genuinely difficult distributed systems project. Same number, two completely different budgets.',
      },
      {
        type: 'p',
        text: 'So before any architecture, pin down five things. Read-to-write ratio. Payload size. Latency target, expressed as p99 rather than average. Fan-out — how many downstream calls one request makes. And the shape of the traffic, because a steady hundred thousand is much easier than a daily spike to a hundred thousand from a baseline of two.',
      },
      { type: 'h2', text: 'The concurrency maths comes first' },
      {
        type: 'p',
        text: 'Little\'s Law is the only formula you need before choosing anything: concurrency equals throughput multiplied by latency. It tells you how many requests are in flight at once, which is what actually sizes your pools, your threads and your memory.',
      },
      {
        type: 'code',
        lang: 'text',
        code: `L = λ × W

λ = 100,000 req/s
W = 50 ms  → L = 100,000 × 0.05  =  5,000 concurrent requests
W = 200 ms → L = 100,000 × 0.20  = 20,000 concurrent requests`,
      },
      {
        type: 'p',
        text: 'Read that second line carefully, because it is the whole reason latency work is throughput work. Nothing about the request rate changed. Latency went up four times, and the number of things you must hold open simultaneously went up four times with it — four times the sockets, four times the buffers, four times the pool entries. A slow dependency does not just make responses slow; it multiplies your resource footprint until something runs out.',
      },
      {
        type: 'p',
        text: 'This is also why a thread-per-request model gets expensive here. Twenty thousand OS threads is not a serious plan. Either the work is non-blocking, or you accept that most of those threads are parked waiting on I/O and you size the machine for it.',
      },
      { type: 'h2', text: 'What breaks, in the order it breaks' },
      {
        type: 'p',
        text: 'Across services I have load-tested, the failure order is remarkably consistent. Knowing it saves you optimising the fourth thing while the first is on fire.',
      },
      {
        type: 'table',
        head: ['Order', 'What goes', 'The symptom you actually see'],
        rows: [
          ['1', 'Database connection pool', 'Latency cliff, not a gradual slope. Threads queue for a connection and every response inherits the wait.'],
          ['2', 'A single hot query or a missing index', 'One endpoint degrades, then takes the shared pool down with it.'],
          ['3', 'Serialization and GC', 'p99 sawtooths while the average stays flat.'],
          ['4', 'Downstream fan-out', 'Your service is fine; you are queueing on somebody else.'],
          ['5', 'Network and load balancer limits', 'Ephemeral port exhaustion, conntrack tables, TLS handshake cost.'],
        ],
      },
      { type: 'h2', text: 'Connection pools: more is emphatically not better' },
      {
        type: 'p',
        text: 'The most common self-inflicted outage at this scale is arithmetic. Fifty application instances, each with a pool of a hundred, is five thousand connections pointed at a Postgres primary that starts thrashing somewhere in the low hundreds. Each backend costs memory and a scheduler slot, and past the point where connections exceed cores by a modest factor, adding more strictly reduces throughput.',
      },
      {
        type: 'p',
        text: 'The useful starting point is small enough to be uncomfortable: roughly two to four times the core count of the database, in total across every client. Then put a transaction-mode pooler in front so your application can hold many cheap client connections against few expensive server ones.',
      },
      {
        type: 'code',
        lang: 'text',
        code: `# 50 app instances × 100 connections = 5,000 backends. The database dies.
app ─────────────────────────────────────────▶ postgres  (5,000)

# 50 app instances × 100 client connections against a pooler that
# multiplexes onto ~64 real backends. Same app config, survivable database.
app ────▶ pgbouncer (transaction mode) ──────▶ postgres  (64)`,
      },
      {
        type: 'p',
        text: 'Transaction-mode pooling is not free — you lose session state, so no session-level prepared statements, no advisory locks held across statements, no temporary tables spanning a transaction boundary. Those constraints are usually easy to design around and always cheaper than the alternative.',
      },
      { type: 'h2', text: 'Push work off the request path' },
      {
        type: 'p',
        text: 'The cheapest request is the one that does not reach your database. In rough order of leverage:',
      },
      {
        type: 'ol',
        items: [
          'Cache at the edge. Anything identical for every caller and tolerably stale belongs in a CDN with a sensible max-age. This does not scale your service; it removes traffic from it entirely, which is better.',
          'Cache per-user or per-entity in Redis, keyed on something you can invalidate deliberately. Include a version or updated-at in the key so a write makes the old key unreachable rather than requiring you to find and delete it.',
          'Serve reads from replicas. Route anything that tolerates a second of staleness away from the primary and keep the primary for writes and read-your-writes cases.',
          'Make writes asynchronous. Accept, validate, persist the intent, return 202, and do the expensive part on a consumer. The client gets a fast answer and the spike becomes queue depth instead of failed requests.',
        ],
      },
      { type: 'h2', text: 'The stampede, and the two lines that prevent it' },
      {
        type: 'p',
        text: 'A cache is also a way to concentrate failure. If ten thousand keys were written at the same moment during a deploy, they expire at the same moment, and every one of those requests misses simultaneously and goes to the database. The database sees its entire day\'s load in one second.',
      },
      {
        type: 'p',
        text: 'Two habits fix nearly all of it. Jitter every TTL so expiry spreads out, and serve stale while exactly one caller refreshes.',
      },
      {
        type: 'code',
        lang: 'javascript',
        code: `const BASE_TTL = 300;

// Jitter: ±10%, so keys written together do not expire together.
const ttl = () => BASE_TTL * (0.9 + Math.random() * 0.2);

async function readThrough(key, load) {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);

  // Exactly one caller per key gets the lock and does the work.
  // Everyone else briefly serves stale, or waits — either beats
  // ten thousand identical queries hitting the primary at once.
  const lock = await redis.set(\`lock:\${key}\`, '1', { NX: true, EX: 10 });
  if (!lock) {
    const stale = await redis.get(\`stale:\${key}\`);
    if (stale) return JSON.parse(stale);
  }

  const value = await load();
  await redis.set(key, JSON.stringify(value), { EX: Math.round(ttl()) });
  await redis.set(\`stale:\${key}\`, JSON.stringify(value), { EX: 3600 });
  return value;
}`,
      },
      { type: 'h2', text: 'Behaviour past the limit is the actual design' },
      {
        type: 'p',
        text: 'Every service has a capacity. The engineering question is not how to never reach it — you will — but what happens in the second after you do. Left alone, a system past capacity does the worst possible thing: it accepts everything, queues it, gets slower, holds more concurrent work, and collapses while still technically running. Clients time out, retry, and add load exactly when there is none to spare.',
      },
      {
        type: 'p',
        text: 'A service that sheds load stays up at reduced capacity. That is a strictly better failure.',
      },
      {
        type: 'ul',
        items: [
          'Bound every queue. An unbounded queue converts a throughput problem into an out-of-memory crash and hides the signal until it is fatal.',
          'Shed early and cheaply. Reject at the edge with 429 and a Retry-After before the request has consumed a database connection. A rejection that costs work is not shedding.',
          'Shed by priority. A health check and a payment confirmation should not be dropped at the same threshold as a recommendations widget.',
          'Give every outbound call a timeout shorter than your own deadline, and put a circuit breaker in front of it. Without a breaker, one slow dependency consumes your entire thread pool and takes down endpoints that never touch it.',
          'Make clients retry with exponential backoff and jitter. Synchronised retries are a self-inflicted DDoS, and the naive client library default is usually a fixed 100 ms.',
        ],
      },
      { type: 'h2', text: 'Idempotency, because retries are guaranteed' },
      {
        type: 'p',
        text: 'At this volume a client will retry a request that actually succeeded — the response was lost, not the write. If the endpoint is not idempotent you have just double-charged someone. Take a client-supplied key, store it with the result, and return the stored result on a repeat.',
      },
      {
        type: 'code',
        lang: 'sql',
        code: `CREATE TABLE idempotency (
  key           text PRIMARY KEY,
  request_hash  text NOT NULL,
  response_body jsonb,
  status        smallint,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- The insert is the lock. Losing the race means someone else is
-- handling this key, so wait for their result rather than doing it twice.
INSERT INTO idempotency (key, request_hash)
VALUES ($1, $2)
ON CONFLICT (key) DO NOTHING
RETURNING key;`,
      },
      {
        type: 'p',
        text: 'Store the request hash alongside the key. The same key with a different body is a client bug, and returning the first result silently would hide it — answer 422 instead.',
      },
      { type: 'h2', text: 'Measure the tail, and measure it correctly' },
      {
        type: 'p',
        text: 'Average latency at this scale is worse than useless because it is reassuring. If p50 is 20 ms and p99 is 900 ms, one request in a hundred is having a terrible time — at a hundred thousand a second that is a thousand unhappy requests every second.',
      },
      {
        type: 'p',
        text: 'Two things people get wrong. Percentiles do not average, so you cannot take the p99 from ten instances and mean them into a cluster p99; aggregate the histogram, not the summary. And your load generator will lie to you unless it corrects for coordinated omission — when the system stalls, a naive generator simply sends fewer requests and never records the latency of the ones it did not send, so the stall vanishes from the results.',
      },
      { type: 'h2', text: 'The order I would actually work in' },
      {
        type: 'ol',
        items: [
          'Write down the workload: read/write ratio, payload size, p99 target, fan-out, spike shape.',
          'Compute the concurrency from Little\'s Law and size pools from it rather than from a default.',
          'Put a transaction-mode pooler in front of the database before touching anything else.',
          'Remove traffic — edge cache, entity cache with jittered TTL, read replicas.',
          'Make writes async wherever the client does not need the result synchronously.',
          'Add timeouts, breakers, bounded queues and load shedding. This is the part that decides whether a bad day is a slow hour or an outage.',
          'Load test with a generator that corrects for coordinated omission, and read p99 from an aggregated histogram.',
        ],
      },
      {
        type: 'p',
        text: 'None of this is exotic. Almost everything that falls over at high throughput falls over because of pool arithmetic, an unbounded queue, or a missing timeout — not because the architecture needed to be cleverer.',
      },
    ],
  },

  {
    slug: 'the-database-is-the-bottleneck',
    title: 'The database is the bottleneck',
    date: '2026-08-03',
    readingMinutes: 12,
    tags: ['Databases', 'PostgreSQL', 'Performance'],
    summary:
      'Application code is rarely what makes an API slow. It is a missing composite index, a query in a loop, a pool sized by guesswork, or pagination that gets slower the further you read. All of them are visible before they hurt.',
    body: [
      {
        type: 'p',
        text: 'Every time I have chased a latency problem to its source, it has ended at the database. Not because databases are slow — they are extraordinarily fast when asked sensibly — but because they are where a small mistake gets multiplied by row count, and row count is the thing that grows quietly while nobody is looking.',
      },
      {
        type: 'p',
        text: 'Here are the failures I keep meeting, and how to see each one before it becomes an incident.',
      },
      { type: 'h2', text: 'Composite index column order is not arbitrary' },
      {
        type: 'p',
        text: 'A composite index is usable left to right, like a phone book sorted by surname then first name. Sorted that way you can find every Suryavanshi instantly, and every Suryavanshi called Gaurav — but you cannot find every Gaurav without reading the whole book.',
      },
      {
        type: 'code',
        lang: 'sql',
        code: `CREATE INDEX idx_claims ON claims (status, created_at);

-- Uses the index: leading column present.
WHERE status = 'PENDING' AND created_at > now() - interval '7 days'
WHERE status = 'PENDING'

-- Cannot use it: the leading column is missing, so this scans.
WHERE created_at > now() - interval '7 days'`,
      },
      {
        type: 'p',
        text: 'The rule of thumb that survives contact with reality: equality columns first, then the range or sort column, then anything you only want along for the ride. Getting the order wrong does not produce an error — it produces a sequential scan that is perfectly fast on your ten-thousand-row development database and catastrophic on ten million.',
      },
      { type: 'h2', text: 'Read the plan; do not guess' },
      {
        type: 'p',
        text: 'Guessing about query performance is optional, which makes it a strange habit. Ask.',
      },
      {
        type: 'code',
        lang: 'sql',
        code: `EXPLAIN (ANALYZE, BUFFERS)
SELECT c.id, c.status, m.name
FROM claims c
JOIN members m ON m.id = c.member_id
WHERE c.status = 'PENDING'
ORDER BY c.created_at DESC
LIMIT 50;`,
      },
      {
        type: 'p',
        text: 'Four things to look at, in order:',
      },
      {
        type: 'ul',
        items: [
          'Seq Scan on a large table. Occasionally correct — reading most of a table is faster sequentially — but usually a missing index.',
          'A large gap between estimated and actual rows. The planner is choosing strategy from a wrong estimate, so the fix is often ANALYZE or better statistics rather than a new index.',
          'Rows Removed by Filter, high. You are reading rows only to throw them away; the predicate belongs in the index.',
          'Heap Fetches on an index-only scan. The visibility map is stale — usually a vacuum problem, not a query problem.',
        ],
      },
      { type: 'h2', text: 'The N+1, which never looks like a database problem' },
      {
        type: 'p',
        text: 'This is the single most common cause of an endpoint that is fine in testing and unusable in production, because its cost is invisible in the source. One tidy loop is fifty-one round trips.',
      },
      {
        type: 'code',
        lang: 'javascript',
        code: `// 1 query for the claims, then 1 per claim. At 50 claims and 2 ms
// of round trip each, that is ~100 ms of pure waiting.
const claims = await db.claims.findMany({ where: { status: 'PENDING' } });
for (const claim of claims) {
  claim.member = await db.members.findUnique({ where: { id: claim.memberId } });
}

// One extra query, regardless of how many claims come back.
const claims = await db.claims.findMany({ where: { status: 'PENDING' } });
const members = await db.members.findMany({
  where: { id: { in: [...new Set(claims.map((c) => c.memberId))] } },
});
const byId = new Map(members.map((m) => [m.id, m]));
claims.forEach((claim) => { claim.member = byId.get(claim.memberId); });`,
      },
      {
        type: 'p',
        text: 'The reason it survives code review is that the slow version reads better. The defence is not vigilance, it is instrumentation: count queries per request and fail the build when an endpoint crosses a threshold. A test that asserts "this endpoint issues at most 4 queries" catches every future N+1 including the one introduced by an innocent-looking change three layers down.',
      },
      { type: 'h2', text: 'OFFSET pagination degrades with depth' },
      {
        type: 'p',
        text: 'OFFSET does not skip rows cheaply. The database produces every row up to the offset and discards them, so page one is instant and page two thousand is a table scan. It also silently duplicates and drops rows when the underlying data changes between pages.',
      },
      {
        type: 'code',
        lang: 'sql',
        code: `-- Reads 100,050 rows to return 50.
SELECT * FROM claims ORDER BY created_at DESC OFFSET 100000 LIMIT 50;

-- Reads 50. Constant cost at any depth, and stable under concurrent writes.
SELECT * FROM claims
WHERE (created_at, id) < ($1, $2)   -- last row of the previous page
ORDER BY created_at DESC, id DESC
LIMIT 50;`,
      },
      {
        type: 'p',
        text: 'The tuple comparison, rather than created_at alone, is what makes it correct when timestamps collide. Keyset pagination costs you the ability to jump to an arbitrary page number, which almost no API consumer actually wants and almost every API offers anyway.',
      },
      { type: 'h2', text: 'Pool size, and why the small number is right' },
      {
        type: 'p',
        text: 'Connection pools get sized by superstition more than any other setting. The intuition that a bigger pool means more throughput is exactly backwards once you exceed what the hardware can genuinely run at once: the extra connections do not do more work, they just add context switching and lock contention to the work already happening.',
      },
      {
        type: 'code',
        lang: 'text',
        code: `A defensible starting point, then measure:

  pool = (core_count × 2) + effective_spindle_count

8 cores, SSD → (8 × 2) + 1 ≈ 17 connections. Total, across every
instance — not per instance. Ten replicas at 100 each is 1,000
connections to a database that performs best somewhere near 20.`,
      },
      {
        type: 'p',
        text: 'The counter-intuitive part is worth stating plainly: a queue in front of a small pool is faster than a large pool. Requests wait either way; waiting in a cheap application-side queue is better than waiting inside the database while degrading everyone else\'s queries.',
      },
      { type: 'h2', text: 'Hot rows serialise everything' },
      {
        type: 'p',
        text: 'Any counter that every request updates becomes the whole system\'s throughput ceiling, because row locks serialise those writes no matter how much hardware you add.',
      },
      {
        type: 'code',
        lang: 'sql',
        code: `-- Every request in the system queues behind this one row.
UPDATE counters SET value = value + 1 WHERE name = 'claims_processed';

-- Spread across N rows; readers sum. Contention drops by roughly N.
UPDATE counters
SET value = value + 1
WHERE name = 'claims_processed' AND shard = floor(random() * 16);

SELECT sum(value) FROM counters WHERE name = 'claims_processed';`,
      },
      {
        type: 'p',
        text: 'The same shape appears wherever rows are shared: a status row per tenant, a sequence table, an inventory count. If the write rate on one row approaches your request rate, that row is your scaling limit.',
      },
      { type: 'h2', text: 'Replication lag will find you' },
      {
        type: 'p',
        text: 'Sending reads to replicas works beautifully until a user creates something and immediately does not see it, because their write went to the primary and their read went to a replica two hundred milliseconds behind.',
      },
      {
        type: 'p',
        text: 'The workable pattern is to route by what the request needs rather than by whether it is a read. Immediately after a write from that same session, read from the primary; after a short window, drop back to replicas.',
      },
      {
        type: 'code',
        lang: 'javascript',
        code: `// Read-your-writes without pinning every read to the primary forever.
const WINDOW_MS = 2000;

function pickConnection(session, isWrite) {
  if (isWrite) {
    session.lastWriteAt = Date.now();
    return primary;
  }
  const recentlyWrote = Date.now() - (session.lastWriteAt ?? 0) < WINDOW_MS;
  return recentlyWrote ? primary : replica;
}`,
      },
      {
        type: 'p',
        text: 'And monitor the lag itself. A replica that has fallen minutes behind is not a read replica any more, it is a source of confidently wrong answers, and it should be pulled from rotation automatically rather than by whoever notices.',
      },
      { type: 'h2', text: 'Denormalise deliberately, never casually' },
      {
        type: 'p',
        text: 'Normalisation is right until a join sits on a hot read path and is measurably the cost. Then a duplicated column is a reasonable trade — but only with an explicit answer to how it stays correct. A denormalised field with no maintenance story is just a bug with a delay on it.',
      },
      {
        type: 'ul',
        items: [
          'Update it in the same transaction as the source. Simple, correct, and it couples the two writes.',
          'Maintain it in a trigger. Keeps the application ignorant, and hides the cost from anyone reading application code.',
          'Rebuild it asynchronously from a change feed. Scales best, and you must accept and design for the window where it is stale.',
        ],
      },
      {
        type: 'p',
        text: 'Whichever you pick, write a reconciliation job that recomputes the truth and reports drift. Not because you expect drift, but because you will have it, and finding out from a scheduled job is enormously better than finding out from a customer.',
      },
      { type: 'h2', text: 'The checklist' },
      {
        type: 'ol',
        items: [
          'EXPLAIN ANALYZE every query on a hot path before it ships.',
          'Composite indexes: equality columns first, then range or sort.',
          'Assert a maximum query count per endpoint in tests.',
          'Keyset pagination anywhere someone can page deeply.',
          'Size the pool from cores, count it across all instances, and put a pooler in front.',
          'Find your hot rows before your traffic does, and shard them.',
          'Route reads by staleness tolerance, and alert on replica lag.',
          'Reconcile anything you denormalise.',
        ],
      },
      {
        type: 'p',
        text: 'Nothing here requires a different database or a rewrite. It is the same database, asked better questions.',
      },
    ],
  },

  {
    slug: 'api-automation-that-survives-change',
    title: 'An API automation framework that survives the API changing',
    date: '2026-05-19',
    readingMinutes: 11,
    tags: ['Test automation', 'Rest-Assured', 'TestNG'],
    summary:
      'Most API suites are a class per integration that breaks the moment a field is renamed. Describing journeys as data instead of code turns a rename into a config edit, and moves suite authorship beyond the person who wrote the framework.',
    body: [
      {
        type: 'p',
        text: 'The first API automation suite I owned had a class per integration. Each one built a request, asserted a status code, pulled a value out of the response and passed it to the next call. They were readable, they worked, and every one of them differed from the others only in URLs and field names.',
      },
      {
        type: 'p',
        text: 'That is fine at ten journeys. At a hundred and ninety it means a renamed field is a hundred and ninety edits, and only the person who wrote the framework can add a test. Both of those are the real cost, and neither shows up in a coverage number.',
      },
      { type: 'h2', text: 'Describe the journey as data' },
      {
        type: 'p',
        text: 'The insight is that these tests have almost no logic in them. They are a sequence of requests where later steps depend on values produced by earlier ones. That is a data structure, not a program.',
      },
      {
        type: 'code',
        lang: 'json',
        code: `{
  "journey": "claim-settlement",
  "environment": "uat",
  "steps": [
    {
      "name": "register claim",
      "method": "POST",
      "path": "/claims",
      "body": { "memberId": "\${member.id}", "amount": 12500 },
      "extract": { "claimId": "$.result.claimSeqID" },
      "expect": { "status": 201, "schema": "claim-created.json" }
    },
    {
      "name": "view claim",
      "method": "GET",
      "path": "/claims/\${claimId}",
      "expect": {
        "status": 200,
        "body": { "$.status": "REGISTERED", "$.amount": 12500 }
      }
    },
    {
      "name": "settle",
      "method": "POST",
      "path": "/claims/\${claimId}/settlement",
      "expect": { "status": 200, "body": { "$.settlementStatus": "APPROVED" } }
    }
  ]
}`,
      },
      {
        type: 'p',
        text: 'One executor walks that structure: resolve placeholders from the value store, send, assert, extract, move on. The framework stops growing once it can do those five things. Everything after that is configuration, and configuration can be reviewed by a business analyst who would never open a Java class.',
      },
      { type: 'h2', text: 'The value store needs a scope' },
      {
        type: 'p',
        text: 'The moment you run journeys in parallel, a global map of extracted values becomes a source of impossible bugs — journey A overwrites `claimId` while journey B is halfway through using it, and the failure appears in whichever one lost the race, which is to say a different one each run.',
      },
      {
        type: 'code',
        lang: 'java',
        code: `public final class JourneyContext {
    // One store per journey execution. Never static, never shared.
    private final Map<String, Object> values = new ConcurrentHashMap<>();

    public void put(String key, Object value) { values.put(key, value); }

    public String resolve(String template) {
        Matcher m = PLACEHOLDER.matcher(template);
        StringBuilder out = new StringBuilder();
        while (m.find()) {
            String key = m.group(1);
            Object value = values.get(key);
            if (value == null) {
                // Fail here, with the key name. Letting a null through
                // produces a 400 three steps later and a confusing report.
                throw new UnresolvedValueException(key, values.keySet());
            }
            m.appendReplacement(out, Matcher.quoteReplacement(value.toString()));
        }
        return m.appendTail(out).toString();
    }
}`,
      },
      {
        type: 'p',
        text: 'Failing loudly on an unresolved placeholder is worth insisting on. The alternative — substituting null and continuing — turns a clear "you never extracted claimId" into a 400 from an unrelated endpoint two steps downstream, and someone loses an afternoon to it.',
      },
      { type: 'h2', text: 'Assert in layers, and let each layer fail separately' },
      {
        type: 'p',
        text: 'A test that only checks the status code passes while the API returns structurally valid nonsense. A test that asserts the entire response body breaks every time someone adds an optional field. Neither extreme is useful, so assert at four levels and report which one failed.',
      },
      {
        type: 'table',
        head: ['Layer', 'Asserts', 'Breaks when'],
        rows: [
          ['Transport', 'HTTP status, content type, response time budget', 'The service is down or slow'],
          ['Schema', 'Response validates against a JSON Schema', 'The contract changed'],
          ['Business', 'Specific field values are correct for this input', 'The logic changed'],
          ['Dependency', 'Values used downstream are present and well-formed', 'A chain will break at the next step'],
        ],
      },
      {
        type: 'p',
        text: 'The value of separating them is diagnostic. "Schema failed, business passed" tells you a field was added or renamed. "Schema passed, business failed" tells you the contract held and the logic moved. That distinction is the difference between a five-minute triage and an hour of reading diffs.',
      },
      { type: 'h2', text: 'Test data is the hard part, and it is not the framework' },
      {
        type: 'p',
        text: 'Every API automation project I have seen eventually discovers that the framework was the easy bit. The suite starts failing not because the code is wrong but because the member it uses got settled last Tuesday, or because two parallel runs grabbed the same policy.',
      },
      {
        type: 'ul',
        items: [
          'Create what you need in setup, through the API, and tear it down after. Slowest and by far the most reliable, because the test owns everything it touches.',
          'Lease from a pool. Keep a table of usable entities, check one out for the duration of a run, return it after. Necessary when creation is expensive or involves a batch job you cannot trigger.',
          'Never hardcode an ID that a human might edit. A shared UAT record used by six suites will be modified by someone who has no idea it is load-bearing.',
          'Make the data requirement explicit in the journey definition, so the failure is "no eligible member available" rather than a 404 from the third step.',
        ],
      },
      { type: 'h2', text: 'Contract tests are cheaper than end-to-end tests' },
      {
        type: 'p',
        text: 'A full journey through six services is slow, needs an environment, and tells you something is broken without telling you what. A contract test on one endpoint runs in milliseconds and points at exactly one service.',
      },
      {
        type: 'p',
        text: 'A shape that works: contract tests on every endpoint, run on every commit, gating the merge. End-to-end journeys covering the paths that actually generate money, run on deploy to an environment. Not every path — the ones that matter. A suite that takes forty minutes and covers everything gets skipped under deadline; a suite that takes four minutes and covers the critical journeys gets trusted.',
      },
      { type: 'h2', text: 'Diff the spec, do not wait for a test to notice' },
      {
        type: 'p',
        text: 'The best moment to find a breaking change is before it is deployed. If both environments publish OpenAPI, compare them and classify the differences, and you catch the field type change in the pipeline rather than in a 500 at two in the morning.',
      },
      {
        type: 'code',
        lang: 'javascript',
        code: `const BREAKING = [
  'required-field-added',      // old clients will not send it
  'field-removed',             // consumers reading it now get undefined
  'type-changed',              // deserialisation fails
  'enum-value-removed',        // previously valid input now rejected
];

const diff = compareSpecs(await fetchSpec(UAT), await fetchSpec(PROD));
const breaking = diff.filter((change) => BREAKING.includes(change.kind));

if (breaking.length) {
  // Fail the pipeline, and say who is affected — not just what changed.
  console.error(breaking.map((c) => \`\${c.kind}: \${c.path} (\${c.detail})\`).join('\\n'));
  process.exit(1);
}`,
      },
      { type: 'h2', text: 'Reports are read by people who did not write the test' },
      {
        type: 'p',
        text: '"Expected 200 but was 400" is not a report, it is a stack trace with a hat on. The person triaging at 9 a.m. needs the journey name, the step, the resolved request, the response, the correlation ID and the environment — and they should not have to open a log aggregator to get them.',
      },
      {
        type: 'p',
        text: 'Attaching the resolved request rather than the template is the detail that pays for itself. Most journey failures turn out to be a value that resolved to something unexpected, and you simply cannot see that from the definition.',
      },
      { type: 'h2', text: 'What it buys' },
      {
        type: 'p',
        text: 'A renamed field becomes one edit to a mapping instead of a hundred and ninety edits. New journeys get written by people who do not write Java. The framework stops growing while coverage keeps growing, which is the only way a suite stays maintainable past a couple of hundred cases.',
      },
      {
        type: 'p',
        text: 'The trade is that debugging is slightly less direct — a failure is in configuration rather than in a line of code you can breakpoint. Good reporting is what buys that back, which is why it is a first-class feature and not a nice-to-have.',
      },
    ],
  },

  {
    slug: 'slow-and-flaky-test-suites',
    title: 'Why your test suite is slow and flaky, and what to do about it',
    date: '2026-03-08',
    readingMinutes: 10,
    tags: ['Test automation', 'CI/CD', 'Flakiness'],
    summary:
      'A suite people rerun until it goes green has stopped being a test suite. Flakiness has about five causes, all fixable, and the process around it matters as much as the fixes.',
    body: [
      {
        type: 'p',
        text: 'There is a moment when a test suite dies. Not when it breaks — when someone says "just rerun it, that one is flaky" and everybody nods. From then on a red build means nothing, because red is the normal state and the response is to press the button again.',
      },
      {
        type: 'p',
        text: 'The suite is still running. It is just no longer a signal, and it never comes back on its own.',
      },
      { type: 'h2', text: 'Flakiness has about five causes' },
      {
        type: 'p',
        text: 'It feels like randomness, which makes it feel unfixable. It is not random — it is nearly always one of these, and each has a specific fix.',
      },
      {
        type: 'table',
        head: ['Cause', 'How it shows up', 'Fix'],
        rows: [
          ['Timing', 'Passes on a fast machine, fails in CI', 'Poll for the condition; never sleep'],
          ['Shared state', 'Passes alone, fails in the suite', 'Own your data; no cross-test fixtures'],
          ['Order dependence', 'Passes in order, fails when shuffled', 'Randomise order in CI and fix what breaks'],
          ['External dependency', 'Fails at the same time of day, or on their deploys', 'Stub at the boundary for everything but a small smoke set'],
          ['Real concurrency bug', 'Rare, and reproduces under load', 'The only kind worth celebrating — it is a genuine finding'],
        ],
      },
      { type: 'h2', text: 'Sleeping is guessing' },
      {
        type: 'p',
        text: 'A fixed sleep is a bet that an operation finishes within a duration somebody guessed on a laptop. It is simultaneously too short in CI and wasted time everywhere else, and a suite with two hundred of them spends most of its runtime doing nothing.',
      },
      {
        type: 'code',
        lang: 'java',
        code: `// Wrong twice: slow when it is ready in 50 ms, still flaky at 3.1 s.
Thread.sleep(3000);
assertEquals("SETTLED", getClaim(id).getStatus());

// Returns as soon as it is true; fails with the last seen state.
public static <T> T await(Supplier<T> probe, Predicate<T> until,
                          Duration timeout, Duration interval) {
    Instant deadline = Instant.now().plus(timeout);
    T last = null;
    while (Instant.now().isBefore(deadline)) {
        last = probe.get();
        if (until.test(last)) return last;
        sleepQuietly(interval);
    }
    throw new ConditionTimeoutException(
        "Not satisfied within " + timeout + ". Last value: " + last);
}

await(() -> getClaim(id), c -> "SETTLED".equals(c.getStatus()),
      Duration.ofSeconds(30), Duration.ofMillis(200));`,
      },
      {
        type: 'p',
        text: 'Including the last observed value in the timeout message is the part that saves you. "Timed out after 30s" starts an investigation. "Timed out after 30s, last status was PENDING_APPROVAL" usually ends one.',
      },
      { type: 'h2', text: 'Shared state is why order matters' },
      {
        type: 'p',
        text: 'A test that passes alone and fails in the suite is reading something another test wrote. The usual culprits are a fixture created once for the class, a database seeded at the start of a run, or a static field somebody made static for convenience.',
      },
      {
        type: 'p',
        text: 'The principle is that a test owns the data it touches. Create it in setup, use it, remove it — and derive identifiers from the test itself so two parallel workers cannot collide.',
      },
      {
        type: 'code',
        lang: 'java',
        code: `@BeforeMethod
public void setUp(Method method) {
    // Unique per test and per run: no collisions across parallel workers,
    // and an orphaned record tells you which test leaked it.
    String tag = method.getName() + "-" + UUID.randomUUID();
    this.member = api.createMember(MemberFixture.valid(tag));
}

@AfterMethod(alwaysRun = true)   // alwaysRun, or a failure leaks the record
public void tearDown() {
    if (member != null) api.deleteMemberQuietly(member.getId());
}`,
      },
      {
        type: 'p',
        text: 'Then prove it: randomise execution order in CI. If shuffling the order breaks the suite, the tests were coupled and you have simply not noticed yet. Better to find out from a shuffle than from a parallel run on a release day.',
      },
      { type: 'h2', text: 'Parallelism is where hidden coupling surfaces' },
      {
        type: 'p',
        text: 'Running in parallel is the obvious answer to a slow suite, and it converts every latent shared-state problem into a visible failure at once. That is the point, though it does not feel like it on the first day.',
      },
      {
        type: 'ul',
        items: [
          'Give each worker its own data namespace — a prefix, a tenant, or a schema.',
          'Ban static mutable state. It is shared across threads in the same JVM whether you meant it or not.',
          'Watch for external rate limits. Twenty workers against a sandbox that allows ten requests a second produces 429s that look exactly like flakiness.',
          'Pin genuinely non-parallelisable tests to a single group rather than serialising the whole suite for their sake.',
        ],
      },
      { type: 'h2', text: 'Retries: useful, and a trap' },
      {
        type: 'p',
        text: 'Automatic retry is the most tempting tool available and the easiest way to lose the signal permanently. Retrying a network blip is sensible. Retrying until green means a race condition your users will hit is now invisible to you forever.',
      },
      {
        type: 'p',
        text: 'The rule I would hold to: retry at most once, and record every retry as a first-class metric. A test that needed a retry did not pass — it is a defect with a countdown.',
      },
      {
        type: 'code',
        lang: 'java',
        code: `public class RecordingRetry implements IRetryAnalyzer {
    private int attempts = 0;

    @Override
    public boolean retry(ITestResult result) {
        if (attempts >= 1) return false;
        attempts++;
        // Emitted to the same dashboard as failures. A test whose retry
        // rate is climbing gets fixed before it starts passing on luck.
        Metrics.increment("test.retry", "test", result.getName());
        return true;
    }
}`,
      },
      { type: 'h2', text: 'Quarantine, with an expiry date' },
      {
        type: 'p',
        text: 'When a test is genuinely flaky and cannot be fixed today, the two usual options are both bad: leave it failing and normalise red, or delete it and lose the coverage silently.',
      },
      {
        type: 'p',
        text: 'Quarantine is the third option, and it only works with the parts people skip:',
      },
      {
        type: 'ol',
        items: [
          'Move it out of the gating suite so the pipeline goes green honestly.',
          'Keep running it, on a schedule, with results recorded.',
          'Give it an owner and a date. A quarantine with no expiry is a deletion with extra steps.',
          'Cap the quarantine. If more than a small number of tests are in it, stop feature work and fix the suite — you no longer know what your coverage is.',
        ],
      },
      { type: 'h2', text: 'Budget the runtime like any other requirement' },
      {
        type: 'p',
        text: 'Suite duration grows monotonically unless someone is watching, and the failure is gradual enough that no single commit is to blame. Set a budget, fail the build when it is exceeded, and print the ten slowest tests on every run.',
      },
      {
        type: 'p',
        text: 'The distribution is usually stark: a handful of tests account for most of the time, and they are the ones sleeping or doing a full end-to-end journey to assert a single field. Those are the ones to rewrite, and they are easy to find once you are looking.',
      },
      { type: 'h2', text: 'The order to fix it in' },
      {
        type: 'ol',
        items: [
          'Measure first. Record pass rate, retry rate and duration per test for two weeks. Fix the worst offenders by data, not by memory.',
          'Delete every sleep. Replace with polling that reports the last observed state.',
          'Make each test own its data, with identifiers derived from the test.',
          'Randomise order in CI and fix what falls over.',
          'Turn on parallelism and fix what falls over again.',
          'Cap retries at one and put the retry rate on a dashboard.',
          'Quarantine with owners and dates, and keep the quarantine small.',
        ],
      },
      {
        type: 'p',
        text: 'The goal is not zero flakiness — a system with real concurrency will never be perfectly deterministic. The goal is that red means something, so that when the build breaks the first instinct is to look rather than to rerun.',
      },
    ],
  },
];
