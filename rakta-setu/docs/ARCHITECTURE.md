# Architecture

A single Node process does everything: watches the folder, parses, stores,
sends, and serves the patient page. That is deliberate — the target deployment
is one PC in a pathology lab, often with intermittent internet and nobody to
administer it. Anything with more moving parts would not survive there.

```
                  ┌──────────────────────────────────────────────┐
   analyzer  ───► │  inbox/          (WATCH_DIR)                 │
   writes         └──────────────────┬───────────────────────────┘
                                     │  chokidar, awaitWriteFinish
                                     ▼
                         ┌───────────────────────┐
                         │  watcher/index.js     │  serial queue
                         └───────────┬───────────┘
                                     ▼
                         ┌───────────────────────┐
                         │  services/ingest.js   │
                         └───────────┬───────────┘
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
     ┌────────────────┐   ┌──────────────────┐   ┌──────────────────┐
     │ parsers/       │   │ domain/          │   │ services/        │
     │  pdf · csv     │──►│  analytes.js     │──►│  whatsapp/       │
     │  text-extract  │   │  interpret.js    │   │   cloud│twilio   │
     └────────────────┘   └────────┬─────────┘   └──────────────────┘
                                   ▼
                         ┌───────────────────────┐
                         │  SQLite (data/)       │
                         └───────────┬───────────┘
                                     ▼
                         ┌───────────────────────┐        ┌──────────────┐
                         │  routes/api.js        │◄──────►│ public/      │
                         │  routes/webhook.js    │        │ report page  │
                         └───────────────────────┘        └──────────────┘
```

---

## Why these choices

**SQLite, not Postgres.** One lab, hundreds of reports a day at most, and a
machine that gets switched off at night. WAL mode handles the concurrency this
needs, and the entire database is one file the lab can back up by copying it.

**A serial ingest queue.** Two samples finishing at the same instant must not
interleave their WhatsApp sends — staff read the log top-to-bottom to work out
what happened to whom.

**`awaitWriteFinish`.** Analyzer software writes PDFs in chunks. Reading on the
first `add` event yields a truncated file perhaps one time in twenty — a
failure mode that is invisible in testing and ugly in production.

**De-duplication by file hash.** LIS packages love to rewrite the same file, and
some watchers re-emit events after a network share reconnects. The hash is the
only reliable identity a report file has.

**Capability token + PIN.** A bare link is a capability: anyone it is forwarded
to can read the report. The last four digits of the patient's own number is a
second factor they always know and a stranger usually does not. It is not
strong authentication, and it is not meant to be — it is the most security you
can add without locking out the patient this is built for.

**A rule engine behind the AI.** A lab with no API budget still gets Marathi
answers, and an API outage degrades instead of breaking. `answerFromRules()` in
`src/services/ai.js` is the floor the whole feature stands on.

---

## Data flow in detail

### 1. Parse (`src/parsers/`)

`parseReportFile()` dispatches on extension and always ends at the same place:
raw text → `extractMeasurements()` + `extractPatient()`.

`text-extract.js` matches each line against an alias index sorted
**longest-alias-first**, so `total cholesterol` wins over `cholesterol` and
`hba1c` over `hb`. Aliases must match on whole-word boundaries — without that,
`hb` matches inside `hbsag`. The value is taken from the text **after** the
matched label, which is why `Vitamin B12 350` yields 350 and not 12.

CSV takes a separate, more reliable path: it looks for a header row and reads
the result column directly, only falling back to the text extractor for patient
metadata.

### 2. Interpret (`src/domain/`)

`analytes.js` is the knowledge base — 33 tests, each with aliases, sex-aware
ranges, optional panic values, and Marathi explanation + advice for both
directions.

`interpret.js` classifies each measurement and builds the structure the report
page, the voice answers and the WhatsApp message all render from.

**Scale normalisation is the subtle part.** Cell counts arrive on wildly
different scales:

```
WBC        7200 /µL      7.2 10³/µL      7.2 thou/cumm
Platelets  145000 /µL    1.45 10⁵/µL     1.45 lakhs/cumm
```

`normaliseValue()` scales from the printed unit when there is one, and falls
back to a plausibility band when there is not. Getting this wrong is not
cosmetic — a mis-scaled platelet count raises a false critical alarm. When a
value *is* rescaled, the printed unit is dropped along with it, so the page
never shows `2,60,000 lakhs/cumm`.

### 3. Store (`src/services/reports.js`)

The interpretation is stored as JSON alongside the raw measurements. Reports are
immutable once written — re-reading an old report always shows what the patient
was actually told, even after the knowledge base is edited.

> Because of that, editing `analytes.js` does not change existing reports. To
> re-interpret them you would need a migration that recomputes
> `interpretation_json`.

### 4. Deliver (`src/services/whatsapp/`)

Three drivers behind one interface. Retries are bounded and only for transient
failures — `err.retryable === false` fails fast, because retrying an unapproved
template just delays the moment a human finds out.

### 5. Serve (`src/routes/api.js`, `public/`)

- `GET /api/report/:token/meta` — pre-auth, deliberately carries **no health data**
- `POST /api/report/:token` — full report, PIN required
- `POST /api/report/:token/ask` — Marathi Q&A, PIN required, rate-limited

The frontend is dependency-free ES5 that builds DOM nodes with `textContent`
and never `innerHTML`, so a patient name containing markup cannot become XSS.

---

## Extending it

**Add a test** — add an entry to `ANALYTES` in `src/domain/analytes.js`.
Everything else picks it up.

**Lab-specific reference ranges** — analyzers disagree, and your printed ranges
should match what the app flags. Edit `ranges` directly, or add a git-ignored
`src/domain/ranges.local.js` and merge it in `analytes.js` so your local values
survive a `git pull`.

**Another messaging channel** — implement `sendText()` and `sendReportTemplate()`
in a new file under `src/services/whatsapp/` and register it in the `DRIVERS`
map. SMS or Telegram fit the same interface.

**Another language** — the Marathi strings are inline in `analytes.js`,
`interpret.js` and the HTML. A Hindi build means translating those three places;
the parsing and flagging logic is language-independent.

---

## Testing

```bash
npm run seed                                   # demo report, no sending
node scripts/ingest-file.js <file>             # parse a real file, no sending
node scripts/ingest-file.js <file> --send      # full path including WhatsApp
node scripts/send-test.js <phone>              # driver check only
```

`samples/` holds one text report and one CSV, covering both parser paths, a male
and a female patient (different reference ranges), and platelets printed in
lakhs.
