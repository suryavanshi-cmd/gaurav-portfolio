# Agent Forge

A self-learning agent that answers **only** from the data you give it.

Feed it a spreadsheet, a PDF, a folder of contracts. Ask it a question. It
either answers with a citation pointing at the exact row or page the answer came
from, or it says it does not know. There is no third outcome, and in particular
there is no outcome where it answers from what a language model happens to have
memorised.

Multiple agents live in one database, isolated by `agent_id` on every row, so a
second agent costs one `INSERT` rather than a second deployment.

## Why it cannot make things up

Three independent checks, because any one of them alone leaks:

1. **The retrieval gate.** A chunk enters the context by being semantically
   close to the question (cosine ≥ `min_similarity`, default 0.35) *or* by
   containing every term of it. If nothing qualifies, the agent refuses
   **before a model is called at all** — no tokens, no latency, no invention.
   This is the only check that holds even if the model misbehaves, because the
   model never runs.

   Reciprocal rank fusion ranks the results but is deliberately *not* the gate.
   RRF scores by position in the pool, so the nearest of three irrelevant chunks
   still ranks first and scores as well as a real match. Absolute similarity is
   what decides admission.

2. **The prompt contract.** The model gets numbered passages and is told it may
   use nothing else. Necessary, and on its own not sufficient — a prompt is a
   request, not a guarantee.

3. **The citation audit.** After generation, every `[n]` is checked against the
   passages actually supplied. A citation pointing at a passage that was never
   given is the signature of an invented answer, so the answer is withheld
   rather than shown.

The default answer mode is **extractive**: no model at all, just the retrieved
passages with their sources. It cannot hallucinate because there is nothing
generating, and it costs nothing to run. Generative providers buy fluency and
synthesis across passages; they do not buy correctness.

## What "self-learning" means here

Four things change what the agent knows, and none of them is fine-tuning:

| | Mechanism |
|---|---|
| **Ingest a file** | New chunks, immediately retrievable |
| **Correct an answer** | Stored, embedded against the *question*, and searched on every later question. A matching correction is injected ahead of the source text and overrides it |
| **Vote on an answer** | Moves the ranking weight (`boost`) of the chunks it cited, clamped to `[0.5, 2.0]` so no chunk can run away |
| **A refusal** | Logged as a knowledge gap — `npm run agent -- gaps <slug>` ranks what people asked that your data could not answer |

Every one of these is a row you can read, audit and delete. Weights inside a
fine-tuned model are none of those things. That last row is the most useful
output of the system: it tells you what to upload next, written by the people
actually using the agent rather than guessed at in advance.

## What it reads

| Group | Formats |
|---|---|
| Spreadsheets | `.xlsx` `.xls` `.xlsm` `.xlsb` `.ods` `.csv` `.tsv` `.dbf` `.prn` |
| Documents | `.pdf` `.docx` `.pptx` `.rtf` `.html` |
| Structured | `.json` `.jsonl` `.ndjson` `.xml` `.yaml` `.toml` |
| Text & code | `.md` `.txt` `.log` `.sql` `.py` `.js` `.java`, and the rest |
| Anything else | If its bytes decode as UTF-8 text, it is ingested as text |

Binary formats with no parser are refused with a message saying what to do
instead. `.doc` and `.ppt` (pre-2007 binary Office) are named explicitly, as is
a scanned PDF with no text layer — ingesting one would store a handful of stray
ligatures and then answer questions from them, which is worse than refusing.

### Spreadsheets get special treatment

Dumping a sheet as CSV text produces chunks like `12,44,,7,2026-01-03` that
match nothing, because the column names ended up in a different chunk. Instead:

- every row is rendered as `Column: value` pairs and **carries its own header**,
  so a row is retrievable on the words in its header;
- every sheet also gets a **summary** chunk — row count, column names, min/max/
  total/average for numeric columns, and the distinct values of small category
  columns — so *"what columns are in this file"* and *"which regions are
  covered"* are answerable without scanning every row;
- the header row is **detected**, not assumed to be row 1, because real exports
  start with a title and a blank line;
- citations carry `{"sheet": "Q3", "rows": [14, 19]}`, so you can open the file
  and land on the row that produced the claim.

## Setup

```bash
npm install
cp .env.example .env     # fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
```

Apply `supabase/migrations/*.sql` in order (Supabase SQL editor, or
`supabase db push`).

```bash
npm run agent -- create claims "Claims Desk"
npm run agent -- learn claims ./data          # a file or a whole folder
npm run agent -- chat claims                  # /good /bad /fix <correction>
npm start                                     # web UI on :3000
```

The first run downloads the embedding model (~23 MB, once, to
`~/.cache/huggingface`); after that it is entirely offline.

## Cost

| Piece | Cost |
|---|---|
| Embeddings | **$0** — `all-MiniLM-L6-v2` runs locally on CPU, ~1.4 s to load, milliseconds per chunk |
| Vector storage | **$0** — Supabase free tier, pgvector with an HNSW index |
| Answers (extractive) | **$0** — no model involved |
| Answers (Ollama) | **$0** — local on your Mac |
| Answers (Anthropic / OpenAI) | per-token, only if you opt in |

Nothing here needs a GPU or a paid inference endpoint. A Mac, a Raspberry Pi or
a $5 VPS runs the whole thing.

## Deploying

**Split the work by what each host is good at.** Query serving is short and
stateless; ingestion is neither.

- **Long-running host** (your Mac, a small VPS) — run `npm start`. This is where
  ingestion belongs: a large workbook takes longer to embed than any serverless
  function is allowed to run.
- **Vercel** — `api/index.js` exports the same Express app, so queries and the
  UI deploy as a serverless function. Set the two Supabase env vars in the
  project settings. Cold containers re-fetch the embedding model, so the first
  request after an idle period is slow; and don't upload large files through it.

Both talk to the same Supabase project, so an agent taught from the CLI is
immediately answerable from the web.

## Security

Every table has RLS **enabled with no permissive policy**. That is deliberate,
not an oversight — Supabase's linter will report it as `rls_enabled_no_policy`
at INFO level. A publishable or anon key therefore reads nothing at all. All
access goes through this server with the service role key, which is the only
place the grounding rules can be enforced; a browser that could read `chunks`
directly could also read another tenant's data. Never ship the service role key
to a client.

## Layout

```
src/
  config.js            every tunable, with the reasoning for each default
  db.js                service-role Supabase client
  embeddings.js        local MiniLM, batched
  ingest/
    parse.js           one parser per format + a universal text fallback
    chunk.js           blocks -> chunks, structure-aware
    pipeline.js        parse -> chunk -> embed -> store, with dedupe
  agent/
    registry.js        agents as rows
    retrieve.js        hybrid search + correction lookup
    answer.js          the three grounding checks
    learn.js           feedback, corrections, knowledge gaps
  llm/index.js         extractive | ollama | anthropic | openai
  app.js / server.js   HTTP API, split so it deploys either way
  cli.js               create / learn / ask / chat / teach / gaps
supabase/migrations/   schema, hybrid_search, reinforce_chunks
test/                  parser, chunking and grounding tests
```

## Tests

```bash
npm test
```

23 tests, no credentials required — parsing, chunking and the citation audit are
pure functions by design, so the logic that decides what the agent may say is
testable without a database.
