# Reel Analyzer

Give it an Instagram reel and get back a structured read on it: what the hook
does, how the reel is put together with timestamps, the tone, who it was written
for, what made it travel, and what to change next time.

Part of the [gaurav-portfolio](../) monorepo. Next.js 15 (App Router) with
Supabase for Postgres, auth, storage and realtime, and the Claude API for the
analysis itself.

## Two ways in, deliberately equal

**Upload the file.** Always works, for any reel, yours or not. This is the
primary path.

**Paste a link.** Best-effort. Links resolve through the Instagram Graph API,
which only ever returns media belonging to the connected professional account —
so it works for your own reels and nothing else. Every failure, including "that
reel isn't yours", ends with the same message asking for the file instead. The
product never blocks on this path working.

There is no scraper here, on purpose. Instagram's anti-bot measures make
yt-dlp-style extraction unreliable in production and heavy for serverless.

## Pipeline

One long-running request per job — no queue, no worker service.

```
POST /api/reels            create the reel and job rows, then after() → runJob
  ↓
fetching                   link reels only: resolve, download, store in Supabase
  ↓                        Storage. Uploads are already there.
transcribing               hand the signed video URL to the transcription provider
  ↓
analyzing                  Claude reads the transcript, caption and engagement
  ↓                        numbers and returns a schema-constrained report
done                       spend one credit, write the analysis
```

Each stage writes its status before doing the work for it, so the status page —
subscribed to the job row over Realtime — shows the step change as it happens.
Row-level security applies to the Realtime stream too, so a subscriber only ever
receives their own job. Because RLS is enforced on the socket, `JobProgress`
waits for the session and calls `realtime.setAuth` *before* subscribing; a
channel opened before the token lands connects as `anon` and the policy then
silently filters out every event.

The local worker's claim is leased rather than advisory (`claim_transcription_job`):
a bare `select ... where status = 'transcribing'` hands the same row to every
poll, so one worker re-claims a job it is already transcribing and two workers
duplicate the whole download. The lease expires, so a worker that dies
mid-transcription releases its job instead of stranding it.

Failures set `status = 'failed'` with a message written for the person reading
it, not for a log. Nothing is retried blindly.

## Transcription: pick one

Set by `TRANSCRIPTION_PROVIDER`.

| | `assemblyai` | `local` |
|---|---|---|
| Runs | Inside the Vercel request | On your own machine |
| Cost | Per minute of audio | ₹0 |
| Needs | `TRANSCRIPTION_API_KEY` | `WORKER_SHARED_SECRET`, and the worker running |
| ffmpeg | No — it fetches the URL itself | No — faster-whisper reads the .mp4 directly |

The local path parks the job in `transcribing`. `scripts/local_whisper_worker.py`
polls `/api/worker/claim`, transcribes with faster-whisper, and posts the result
to `/api/jobs/[id]/transcript`, which resumes the pipeline at analysis. From the
status page the two paths are indistinguishable.

```bash
pip install faster-whisper requests
export REEL_ANALYZER_URL=https://your-deployment.vercel.app
export WORKER_SHARED_SECRET=...      # same value as on the deployment
npm run worker
```

No cloud instance is involved, so there is no compute left running by accident
and no third provider to hold credentials for.

## Analysis: Claude or Gemini

`src/lib/providers/analysis/` holds both, behind one interface. Whichever runs,
the response is schema-constrained on the way out and zod-validated on the way
in, so the database sees the same shape or the job fails — a response that
doesn't match never half-fills a report.

| | `claude` | `gemini` |
|---|---|---|
| Key | `ANTHROPIC_API_KEY` | `GEMINI_API_KEY` |
| Default model | `claude-opus-5` | `gemini-3.8-flash` |
| Schema mechanism | `output_config.format` JSON Schema | `responseSchema` (OpenAPI subset) |

The two schemas are not the same object: Gemini's dialect has no
`additionalProperties`, and adds `propertyOrdering`, which is worth setting so
field order doesn't drift between calls.

`ANALYSIS_PROVIDER` pins one. Left unset, whichever key is present wins.

The schema field descriptions are doing prompt work as much as validation work;
they are the most reliable place to say what each field should contain. The
system prompt is shared by both providers — it is about how to read a reel, not
about any one model's quirks.

## Schema

Five tables — `profiles`, `reels`, `jobs`, `transcripts`, `analyses` — with RLS
on every one of them. Reads are scoped to the owner; there are no write policies
at all, because every write goes through the service-role key from a route
handler that has already checked ownership itself.

Two functions run `security definer`, both with `execute` revoked from `anon`
and `authenticated`:

- `handle_new_user()` — trigger on `auth.users`, creates the profile with five
  free credits.
- `consume_credit(uuid)` — decrements atomically and refuses to go below zero,
  so two concurrent jobs can't overspend a balance.

Migrations live in `supabase/migrations/` and are applied in filename order.
`npm run check:sql` applies all of them to a throwaway PostgreSQL server, with
Supabase's `auth`/`storage` schemas and roles stubbed, which is the only way a
broken migration gets caught before it reaches a real database.

## Credits and limits

Five analyses per account. A credit is spent when an analysis completes, not
when a job starts, so a job that fails halfway costs nothing. At zero the
ingestion route refuses with a clear message. Separately, ten jobs per user per
hour.

There is no paywall yet — running out is simply a wall.

## Local setup

```bash
cp .env.example .env.local     # fill in the values
npm install
npm run dev
```

`npm run typecheck`, `npm run lint` and `npm run build` are what CI runs.

## Environment

| Variable | Required | What it does |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Browser-side key; RLS does the work |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server only. Bypasses RLS — never expose it |
| `ANTHROPIC_API_KEY` | one of these two | Analysis via Claude |
| `GEMINI_API_KEY` | one of these two | Analysis via Gemini |
| `ANALYSIS_PROVIDER` | no | `claude` or `gemini`; unset means whichever key is set |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-opus-5` |
| `GEMINI_MODEL` | no | Defaults to `gemini-3.8-flash` |
| `TRANSCRIPTION_PROVIDER` | no | `assemblyai` (default) or `local` |
| `TRANSCRIPTION_API_KEY` | for `assemblyai` | AssemblyAI key |
| `WORKER_SHARED_SECRET` | for `local` | Shared secret the worker presents |
| `EXTRACTION_PROVIDER` | no | `meta` (default) or `none` to disable links |
| `EXTRACTION_API_KEY` | no | Instagram Graph long-lived access token |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | no | Only for the Facebook-Login flavour |
| `NEXT_PUBLIC_SITE_URL` | no | Magic-link redirects; Vercel supplies its own |

The un-prefixed `SUPABASE_URL` / `SUPABASE_ANON_KEY` are accepted as fallbacks,
matching the rest of the portfolio.

Nothing is hardcoded and no key has a default.

## Deployment notes

Fluid Compute should be on, and `maxDuration` on the processing routes set as
high as the plan allows — download, transcription and analysis all happen inside
one request. `src/app/api/reels/route.ts` and `src/app/api/jobs/[id]/process/route.ts`
both declare it, because `after()` keeps the ingestion function alive for the
pipeline it started.
