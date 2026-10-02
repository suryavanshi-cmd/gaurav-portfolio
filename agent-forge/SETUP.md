# First run

Everything below happens on your Mac. Nothing here needs a GPU, a paid
inference endpoint, or a server.

## 1. The one secret you have to fetch yourself

The Supabase project is already created and migrated:

```
SUPABASE_URL=https://ugjpgmskzfikyqmgjxem.supabase.co
```

The service role key cannot be read through the API for security reasons, so
copy it by hand:

**Supabase dashboard → project `agent-forge` → Settings → API → `service_role`**
(under "Project API keys" — reveal it, it is the one labelled `secret`).

```bash
cd agent-forge
cp .env.example .env
```

Then fill in both values in `.env`. Leave `LLM_PROVIDER=extractive` for now —
that mode uses no model at all, so you can confirm retrieval is working before
adding any cost.

> **Never commit `.env`,** and never put the service role key in front-end code.
> Every table has RLS on with no policy, so this key is the only thing that can
> read them — which is exactly why it must stay server-side.

## 2. Install and check

```bash
npm install
npm test          # 48 tests, no credentials needed
```

The first command that touches embeddings downloads the model (~23 MB, once,
into `~/.cache/huggingface`). After that it runs offline.

## 3. Make an agent and feed it

```bash
npm run agent -- create claims "Claims Desk"
npm run agent -- learn claims ~/path/to/your/data      # a file, or a whole folder
```

A folder is walked recursively. Files it cannot read are reported and skipped —
one unreadable file will not stop the other 199.

## 4. Ask it things

```bash
npm run agent -- chat claims
```

In the chat: `/good`, `/bad`, `/fix <what it should have said>`, `/exit`.
`/fix` is the one that matters — it stores a correction that is applied to every
future question resembling that one.

Then the web UI, which does the same thing with drag-and-drop:

```bash
npm start     # http://localhost:3000
```

## What to expect on the first real workbook

**The answers will look like raw passages.** That is `extractive` mode working
correctly, not a bug. It returns the rows it found with their sheet and row
numbers. Switch to a generative provider once you trust the retrieval:

```bash
# free, local, private — needs `brew install ollama && ollama pull llama3.2`
LLM_PROVIDER=ollama
```

**If it refuses too often,** the gate is too tight for your corpus:

```bash
npm run agent -- ask claims "something you know is in the data"
# note the "top score" printed at the end
```

If a question you know is answerable reports a top score just under the gate,
lower it for that agent:

```sql
update agents set min_similarity = 0.15 where slug = 'claims';
```

Do that on evidence, not on instinct — the gate is the thing keeping it honest.
`npm run agent -- gaps claims` lists what has actually been refused.

**If ingestion is slow,** it is the embedding step, which is CPU-bound and
roughly linear in chunk count. A 10,000-row spreadsheet is tens of thousands of
chunks; run it once and leave it. Re-running the same file is free — it is
deduplicated by content hash.

## Common first errors

| Message | Cause |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY is not set` | `.env` missing or not filled in |
| `No agent called "x"` | run `create` first |
| `...is binary and has no parser` | genuinely unreadable file; the message lists what is supported |
| `This PDF has no text layer` | a scan — run `ocrmypdf in.pdf out.pdf` first |
| `.doc is the pre-2007 binary Office format` | open it and Save As `.docx` |
