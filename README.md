# Gaurav Suryavanshi — Portfolio

A multi-page personal site for an SDET who also builds backend services, full
apps and LLM tools. Plain words, an Apple-style light/dark theme, and a set of
live demos that run entirely in the browser.

## Pages

| Route | What it is |
| --- | --- |
| `/` | Hero, stats, what I do, live demos, featured projects, latest writing, contact |
| `/projects` | Every project, filterable: **Work** (at a job), **Built** (my own, shipped), **Designs** (write-ups, not shipped) |
| `/projects/[slug]` | Problem, flow, what I did, what was hard, result, stack |
| `/lab` | Tools and games — everyday tools, then learn-by-playing games and simulators. All client-side, no sign-up |
| `/lab/[slug]` | One tool or game, how it works, and the post it goes with |
| `/writing` | All posts, by topic, with search |
| `/blog/[slug]` | One post: "In short" points first, then the detail |
| `/about` | Bio, live Pune time and weather, timeline, skills, certificates |

### Tools and games (`components/lab/`)

`registry.js` is the one list — the tools page, each tool's page, the home
page's "Try it" switch, the footer, the sitemap and the assistant all read
from it. Each entry has a `group`: `tool` or `learn`. Each one is loaded with
`next/dynamic` in `LabTool.jsx`, so one tool's code never ships with another's.

**Built from scratch** — the engines live in `lib/`, each with its own tests
in `tests/`, and each has a live page:

- **QueryLite** (`lib/querylite/`) — a SQL database: hand-written lexer and
  recursive-descent parser, B+ tree indexes (`btree.mjs`), a planner that
  pushes filters down, picks index or full scans (skipping an index that
  would match over 30% of rows), and chooses index nested loop / hash /
  nested loop joins; GROUP BY, HAVING, ORDER BY, LIMIT, LEFT JOIN, NULL
  semantics, BEGIN/COMMIT/ROLLBACK with an undo log. Seeded with 22,060 rows
  (`seed.mjs`); the console saves your changes in `localStorage`.
- **Raft** (`lib/raft.mjs`) — leader election, log replication and commit,
  per the Raft paper, in a deterministic millisecond simulator with crashes,
  restarts and partitions. Safety invariants are checked on every step.
- **CRDT editor** (`lib/crdt.mjs`) — an RGA text CRDT with Lamport ids,
  tombstones, causal buffering and caret anchoring. The page syncs real tabs
  through `BroadcastChannel` and three simulated devices over a network with
  a delay and offline switches.

Run the tests with `npm test` (Node's built-in runner, no dependencies). CI
runs them before every build. They include property tests: 60 random queries
comparing index plans with full scans, 40 random Raft failure scenarios with
zero safety violations, and 60 random offline-editing sessions that must
converge.

**Everyday tools** — useful to anyone, nothing leaves the browser:

- **Split the bill** — fewest payments to settle a group; saved in
  `localStorage`, copy-for-WhatsApp summary
- **Loan EMI calculator** — month-by-month schedule, and what paying extra saves
- **SIP planner** — growth by year, goal mode (binary search), today's money
- **Focus timer** — Pomodoro ring; keeps the end time, not ticks, so it stays
  right in a background tab
- **Password maker** — `crypto.getRandomValues`, strength in bits and plain words

**Learn by playing**:

- **LangGraph: wire the agent** — four levels (`graphLevels.js`): connect the
  conditional edges, run test inputs through the graph, recursion limit, a
  human-approval pause. No model is called — the game is about the graph
- **Langfuse: trace detective** — six made-up traces (`traceRounds.js`): read
  the complaint, open the steps, blame the one that caused it

- **Rate limiter** — a token bucket with Poisson traffic, drawn on canvas
- **Cache stampede** — 400 keys expiring together vs. jitter and single-flight
- **Capacity planner** — Little's Law: traffic × latency → servers, pools, DB
- **API chain builder** — JSONPath from one response into the next request;
  a missing value stops the chain by name (`jsonpath.js` is a small subset engine)
- **Flaky test suite** — 20 seeded CI builds as worker lanes: sleeps vs.
  waiting for the condition, shared data in parallel, and retries hiding a
  real bug
- **LLM test gate** — structure, facts and meaning checks over hand-written
  sample cases (`evalCases.js`); edit an answer and the code checks re-run.
  There is no model, so an edited answer is marked "not re-judged"
- **Circuit breaker** — a thread pool calling a failing or hanging service,
  with closed / open / half-open states
- **Guardrail game** and **red-team arena**, **LLM notes**, and the **assistant**

A post lists every demo whose `post` field names it, under "Try it live".

## Structure

```
app/
  layout.jsx        fonts, metadata, JSON-LD, theme boot script, shell
  template.jsx      per-route enter animation
  css/              tokens · layout · pages · lab · ported (older component styles)
  sitemap.js robots.js manifest.js opengraph-image.jsx   SEO
  */[slug]/opengraph-image.jsx   one preview card per post, demo and project
  api/contact/      Supabase-backed contact endpoint (see note below)
components/
  site.js           site-wide facts from the résumé (PERSON, SKILLS, TIMELINE…)
  projects.js posts.js engineeringPosts.js   the content
  SiteNav.jsx SiteFooter.jsx PhysicsField.jsx ui.jsx cards.jsx
  lab/              the live demos
  rag/              the assistant's corpus and retriever
assets/fonts/       self-hosted variable woff2 — see that folder's README
```

Fonts are self-hosted via `next/font/local` rather than `next/font/google`,
which fetches from `fonts.gstatic.com` at build time and fails the build if a
request does not land. The build makes no network requests.

## Motion

- **Background** (`PhysicsField.jsx`): a grid of dots on damped springs. The
  pointer pushes them, a click sends a shockwave, a slow wind keeps them alive.
  It is strongest on the home page, fades as you scroll, pauses when the tab is
  hidden, and is a still grid under `prefers-reduced-motion`.
- **Page changes**: `template.jsx` fades each route in; elements with
  `data-rise` rise into view as they scroll in (`useReveal`), re-armed on every
  route by `RevealOnRoute`.
- **Theme change**: a circular reveal from the click point, using the View
  Transitions API where the browser has it.
- **Nav**: a pill that slides to the current section.

- **Posts**: a reading bar, a section pill under the nav that names the
  section you are in and opens into a jump list, heading links, and a copy
  button on code blocks.

All of it is turned off by `prefers-reduced-motion`.

The page-enter animation uses `animation-fill-mode: backwards`, not `both`.
A fill that outlives the animation leaves a transform on the page wrapper, and
a transformed ancestor traps every `position: fixed` child inside the page
instead of the screen.

## SEO

Every page sets its own title, description and canonical URL. The layout adds
`Person` and `WebSite` JSON-LD; list pages add `ItemList`, posts add
`BlogPosting` and `BreadcrumbList`, demos add `WebApplication`. `sitemap.xml`,
`robots.txt`, the web manifest and the Open Graph images are generated from the
same content lists at build time. Set `NEXT_PUBLIC_SITE_URL` if the site moves
to a custom domain.

## Light and dark

A three-way control in the header: **light**, **dark**, **system**. System is a
real option, not a gap — without it, a visitor who just wants to follow their OS
has no way back once they have touched the control, and on a phone that also
means losing the automatic switch at sunset.

The stylesheet reads one attribute on `<html>`:

| `data-theme` | Result |
| --- | --- |
| *absent* | follow the OS — the media query decides |
| `light` | force light, even on a dark OS |
| `dark` | force dark, even on a light OS |

The dark palette is therefore declared twice: once under
`@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme='light'])`,
so an explicit light choice still wins on a dark OS, and once under
`:root[data-theme='dark']` for the explicit choice. Neither is the default, so
the light values stand until one matches.

The control's active option is marked by a single indicator that slides between
the three, driven by a `--i` custom property — one transform on one element
rather than three backgrounds crossfading. It carries two flags: `is-ready`
reveals it once the stored choice is known, and `is-armed`, set only by a click,
is what permits it to travel. Without that split both would change in the same
React commit and the indicator would slide across on every page load.

A stored choice is applied by the inline script in `app/layout.jsx`, before
first paint. That has to be synchronous and inline — applying it in an effect
paints the system theme first and flashes on every load. With no stored choice
the attribute stays off and the media query does the work, so a blocked script
degrades to exactly the OS-following behaviour.

## Writing

Posts live in `components/posts.js` (LLM topics) and
`components/engineeringPosts.js`. Bodies are block arrays, rendered by
`app/blog/[slug]/page.jsx`, which prerenders every post at build time. Each post
has `points` — the "In short" list shown first — and a reading time computed
from its word count. Keep them short and plain: one idea per sentence.

Getting back is handled by `components/BackToList.jsx`. A plain
`<Link href="/writing">` pushes a *new* history entry and lands on the
section heading, so the reader ends up somewhere other than where they left.
When they actually came from `/writing`, the control calls `router.back()`
instead, which unwinds that entry and lets the router restore the scroll
position exactly. "Came from the list" is a single-use `sessionStorage` token
set when a post is opened from the list and consumed on mount, so a deep link, a refresh, or an
arrival from search finds nothing and gets the ordinary link — which is also
what renders on the server, keeping hydration stable.

## The assistant (RAG)

The "Ask about Gaurav" button opens a retrieval assistant built from the site's
own content. `components/rag/corpus.js` chunks the résumé facts, project
write-ups and article paragraphs; `components/rag/retriever.js` indexes them
with BM25 and retrieves for a question; `components/Chat.jsx` shows the passage
with a link to its source.

**Optional Gemini answers.** With `GEMINI_API_KEY` set on the server,
`app/api/ask/route.js` re-runs the same retrieval and asks Gemini to write a
short answer from those passages only. The answer is labelled "Written by
Gemini from these pages only", and its sources are still shown.

- **The key is server-side only.** Set it as a secret named `GEMINI_API_KEY`
  (never `NEXT_PUBLIC_…`, never in the repo), then redeploy — on Cloudflare
  with `npx wrangler secret put GEMINI_API_KEY`, on Vercel under Project →
  Settings → Environment Variables. `GEMINI_MODEL` optionally picks the model
  tried first.
- **The browser sends only the question.** The server picks the passages, so
  the endpoint cannot be used as a free general-purpose AI proxy. It is also
  rate-limited per visitor and caches repeated questions.
- **Retrieval always comes first.** A question that retrieves nothing never
  reaches the model; the assistant says it could not find it.
- **Falls back cleanly.** No key (503), a quota error, or a timeout → the best
  passage is shown as-is, as it was before Gemini. After a 503 the browser
  stops asking for the rest of the visit. Google's error status and message
  (never the key) are logged to the function logs as `[ask] …`.

It opens with **⌘K / Ctrl-K** or **`/`**, closes on Escape, and keeps its thread
in `sessionStorage` so closing the panel does not make a reader start over.
Each answer underlines the terms the retriever actually matched on, cites its
sources, can be copied, and offers two follow-up questions.

Those follow-ups are the retriever's runners-up rather than a fixed prompt list,
so they can only lead somewhere the corpus answers well. Note the two different
thresholds: a **source** must clear 45% of the top score to be cited as
evidence, while a **follow-up** only has to be related — gating both at 45% left
most answers with no follow-ups at all, because one document usually dominates.

Two decisions worth keeping if you edit it:

- **BM25, not raw TF-IDF.** The corpus mixes one-line résumé facts with
  multi-hundred-word article passages; without length normalisation the long
  passages win every query on term count alone.
- **A synonym map and an aggressive stemmer.** A visitor asks about "tech", the
  corpus says "Java 17, TestNG" — no shared term, so BM25 scores zero. The map
  closes that gap where an embedding model would have. The stemmer reduces
  `automate`, `automated` and `automation` to one root; its output is not real
  words (`validation` → `validat`), which does not matter because the same
  function runs over both the query and the corpus.

To add an LLM later, keep retrieval as-is and feed the retrieved passages to a
model for phrasing only — the facts should still come from the corpus.

## Where the facts come from

Roles, dates, tooling and project details on the page are taken from
`public/Gaurav-Suryavanshi-Resume.pdf`, which is the source of truth. When the
résumé changes, update `components/site.js` (timeline, skills, certificates,
ticker) and the `stack` entries in `components/projects.js` to match — the site
should never claim something the PDF does not. Design write-ups are labelled
"Design — not shipped" and must stay that way until they are built.

The PDF embeds subset fonts, so `pdftotext` (poppler) or `pdfjs-dist` reads it
properly; a naive stream decode returns mojibake.

## Adding a profile photo

The about page shows a `GS` monogram. To use a real photo, drop it in
`public/` and swap the `<div className="monogram">` in `app/about/page.jsx` for
an image with the same class:

```jsx
<img className="monogram" src="/gaurav.jpg" alt="Gaurav Suryavanshi" style={{ objectFit: 'cover', width: '100%' }} />
```

## Contact endpoint

`app/api/contact/route.js` still works but nothing on the page posts to it — the
contact section is an email link (with copy-to-clipboard), GitHub and the résumé. It
is kept so a form can be re-added without rebuilding the backend. Delete it if
you would rather not carry it.

It expects a `public.portfolio_contacts` table with `name`, `email`, `message`,
and `created_at`, and reads:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` also work. Row
Level Security should allow validated `INSERT` and no public reads. Never commit
secret or service-role keys.

## Other projects in this repository

Two products live alongside the site, each self-contained with its own README,
dependencies and deploy settings:

- **`connect-to-nature/`** — a farm-stay marketplace for the Kokan and Nashik
  vibhags. Next.js 15 and Supabase, two portals (traveller and shetkari) on one
  database, in English, Hindi and Marathi.
- **`rakta-setu/`** — automated WhatsApp delivery of blood reports in Marathi,
  with a voice-enabled web app that explains the results.

## Stack

Next.js 15, React 19, Supabase. Deploys to Cloudflare Workers (via the
OpenNext adapter) and to Vercel from the same source — see **Deploying**.

## Deploying

The same build runs on Cloudflare Workers and on Vercel; neither target is
required for the other.

### Cloudflare Workers

Both API routes are server routes, so this is a Worker rather than a static
export. [OpenNext](https://opennext.js.org/cloudflare) adapts `next build` for
the Workers runtime; `wrangler.jsonc` points at its output and turns on
`nodejs_compat`, which the `runtime = 'nodejs'` routes need.

```bash
npm run cf:preview   # build, then serve it in the real Workers runtime locally
npm run cf:deploy    # build, then deploy to the gaurav-portfolio Worker
```

#### Workers Builds settings

Deploys from Git run through [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/),
which is a **build command** followed by a **deploy command** (or, on a pull
request, a **preview command**). One field has to be set by hand, in
**Worker → Settings → Build**:

| Setting | Value |
| --- | --- |
| Build command | `npm run cf:build` |
| Deploy command | `npx wrangler deploy` (the default) |
| Preview command | `npx wrangler preview` (the default) |

The build command is not optional here, and it cannot be moved into
`wrangler.jsonc`: Workers Builds [does not honour Custom Builds in the Wrangler
config](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).
Leave it empty and the deploy step runs against a `.open-next/worker.js` that
was never built, so the build fails in under a minute having never compiled
anything — which looks like a code failure and is not one.

Anything the build itself needs — a `NEXT_PUBLIC_…` value, or a variable read
while prerendering — goes in **Build variables and secrets**, which is separate
from the runtime secrets below: build variables are not visible at runtime, and
runtime secrets are not visible to the build.

Secrets are not read from `.env` in production — set them once per Worker:

```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
```

Without them the site still works: `/api/ask` answers 503 and the assistant
falls back to quoting the retrieved passage, and the contact form reports that
it is unavailable rather than losing a message silently.

Two things differ from a Node host. The `/api/ask` in-memory answer cache and
per-visitor rate limit live in a single isolate, so on Workers they are
per-isolate and short-lived — the limit still blunts abuse but is looser than
the 12-per-10-minutes it reads as. Move both to Workers KV if that matters.

### Vercel

`vercel.json` builds `main` with the default Next.js pipeline; no adapter is
involved.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev      # http://localhost:3000
```

```bash
npm run build && npm start
npm test         # engine tests: QueryLite, Raft, CRDT
```
