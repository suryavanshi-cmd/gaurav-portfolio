# Deploying to Vercel

## ⚠️ Do not paste secrets into a chat

Every value below goes into the **Vercel dashboard** or your **local `.env`** —
typed by you, seen by nobody else. A key pasted into a chat window, an issue,
or a commit should be treated as burned and rotated immediately.

Nothing in this repo needs a real secret to run: `WHATSAPP_DRIVER=console` and
an empty `ANTHROPIC_API_KEY` give you a working app on `localhost`.

---

## What can and cannot run on Vercel

Vercel runs serverless functions: no persistent filesystem, no long-lived
process. Two parts of this app depend on both, so the deployment splits in two.

```
   LAB PC  (always on, Windows/Linux)          VERCEL  (serverless)
  ┌────────────────────────────────┐          ┌──────────────────────────┐
  │  analyzer writes report.pdf    │          │  /r/:token   report page │
  │            ↓                   │          │  /api/report/*   Q&A     │
  │  watcher (chokidar)            │          │  /api/extract   AI OCR   │
  │            ↓                   │  HTTPS   │  /api/payment/* Razorpay │
  │  parse locally (pdf-parse)     │ ───────► │  /api/ingest/report      │
  │            ↓                   │  push    │                          │
  │  POST parsed JSON              │          └────────────┬─────────────┘
  └────────────────────────────────┘                       │
                                                           ▼
                                              ┌──────────────────────────┐
                                              │  SUPABASE  (Postgres)    │
                                              │  reports · patients      │
                                              │  credits · payments      │
                                              └──────────────────────────┘
```

**The folder watcher stays on the lab PC.** It watches a real directory that
persists between requests — Vercel has no such thing. It parses locally and
pushes only the parsed result, so the raw PDF never leaves the lab.

**SQLite cannot be used on Vercel.** The filesystem is ephemeral and not shared
between concurrent function instances: reports would vanish on every redeploy
and two visitors could hit different databases. `STORE_DRIVER` resolves to
`supabase` automatically when `VERCEL` is set.

---

## What I need from you

Work through these four. Each row says **where** the value goes.

### 1 · Supabase — 3 values

[database.new](https://database.new) → **Project Settings → API**

| Value | Env var | Goes in | Secret? |
|---|---|---|---|
| Project URL | `SUPABASE_URL` | Vercel + lab PC | no |
| `service_role` key | `SUPABASE_SERVICE_ROLE_KEY` | **Vercel only** | **YES — bypasses all security** |
| `anon` / publishable key | `SUPABASE_ANON_KEY` | Vercel + frontend | no |

Then apply the migrations (see [supabase/README.md](../supabase/README.md)):

```bash
supabase link --project-ref <your-ref>
supabase db push
```

Three files run in order: `0001_credit_system.sql`, `0002_credit_functions.sql`,
`0003_reports.sql`.

> The `service_role` key can read every patient's health data and mint credit.
> It belongs in Vercel's environment variables and nowhere else — never in
> frontend code, never in the repo, never in a screenshot.

### 2 · Razorpay — 3 values

[dashboard.razorpay.com](https://dashboard.razorpay.com) → **Settings → API Keys**

| Value | Env var | Secret? |
|---|---|---|
| Key ID (`rzp_test_…` / `rzp_live_…`) | `RAZORPAY_KEY_ID` | no — the browser needs it |
| Key Secret | `RAZORPAY_KEY_SECRET` | **YES** |
| Webhook secret — *you invent this* | `RAZORPAY_WEBHOOK_SECRET` | **YES** |

**Start with test-mode keys.** Switch to live only after a full end-to-end run.

After the first deploy, add the webhook — **Settings → Webhooks → Add**:

- URL: `https://<your-app>.vercel.app/api/payment/webhook`
- Secret: the same string you put in `RAZORPAY_WEBHOOK_SECRET`
- Events: `payment.captured`, `payment.failed`, `order.paid`

### 3 · AI key — 1 value

| Env var | Where |
|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |

**Give me the Anthropic one.** The extraction path is built on two
Anthropic-specific shapes — base64 PDF `document` blocks and strict tool use
for schema-guaranteed output — and it is the path that is tested. A Google or
OpenAI key would mean rewriting `src/services/extraction.js` and
`src/services/ai.js` against a different API. I can do that if you prefer one
of those, but it is real work and throws away the tested path, so say so
explicitly rather than just handing me a different key.

**Also set a spend limit in the Anthropic Console** (Settings → Limits). The
app's `MONTHLY_SPEND_CAP_USD` is a backstop that can only react *after* money
is spent; the Console limit is enforced upstream and is the one that actually
protects you.

> This key is optional. Without it the report page still works and still
> answers questions in Marathi from the built-in knowledge base — you just lose
> AI extraction of scanned PDFs.

### 4 · WhatsApp — 2 values

Already covered in [WHATSAPP.md](WHATSAPP.md): `WA_CLOUD_PHONE_NUMBER_ID` and
`WA_CLOUD_ACCESS_TOKEN`, plus an approved Marathi template.

Leave `WHATSAPP_DRIVER=console` until everything else works.

---

## Deploying

### 1. Push the repo

```bash
cd rakta-setu
bash scripts/eject-to-new-repo.sh <your-github-username>
cd ../rakta-setu-standalone && git push -u origin main
```

### 2. Import into Vercel

[vercel.com/new](https://vercel.com/new) → import the repo.
Framework preset: **Other**. No build command; `vercel.json` routes everything
to `api/index.js`.

### 3. Set the environment variables

**Project → Settings → Environment Variables.** Minimum set:

```
STORE_DRIVER               supabase
PUBLIC_BASE_URL            https://<your-app>.vercel.app
SUPABASE_URL               https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY  eyJ...            ← secret
SUPABASE_ANON_KEY          eyJ...
ADMIN_TOKEN                <40+ random chars> ← secret
LAB_NAME                   तुमच्या प्रयोगशाळेचं नाव
LAB_PHONE                  +91XXXXXXXXXX
WHATSAPP_DRIVER            cloud
WA_CLOUD_PHONE_NUMBER_ID   ...
WA_CLOUD_ACCESS_TOKEN      ...               ← secret
WA_WEBHOOK_VERIFY_TOKEN    <you invent>      ← secret
BILLING_ENABLED            true
ANTHROPIC_API_KEY          sk-ant-...        ← secret
RAZORPAY_KEY_ID            rzp_test_...
RAZORPAY_KEY_SECRET        ...               ← secret
RAZORPAY_WEBHOOK_SECRET    <you invent>      ← secret
MONTHLY_SPEND_CAP_USD      50
TOKENS_PER_INR             900
USD_TO_INR_RATE            88
```

Generate the two you invent with:

```bash
openssl rand -base64 32
```

`PUBLIC_BASE_URL` must be the real deployed URL — it is what goes into the
WhatsApp message patients tap.

### 4. Deploy and check

```bash
curl https://<your-app>.vercel.app/health
# {"ok":true,"store":"supabase","billing":{"enabled":true,...}}
```

`"store":"supabase"` is the one to confirm. If it says `sqlite`, set
`STORE_DRIVER=supabase` and redeploy — reports would not survive otherwise.

### 5. Connect the lab PC

Create a Supabase Auth user for the lab (Authentication → Users → Add), copy
its uuid, then issue a watcher key **from your own machine**:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  node scripts/create-lab-key.js <lab-user-uuid> "Pune lab PC"
```

It prints the key once. On the lab PC's `.env`:

```ini
WATCH_DIR=C:/BloodMachine/Reports
REMOTE_INGEST_URL=https://<your-app>.vercel.app
LAB_API_KEY=rsk_live_...
```

Then `npm start` there. It parses locally and pushes; nothing else is needed.

---

## Function timeout

`vercel.json` sets `maxDuration: 60`. AI extraction of a multi-page scan can
take 20–40s, so **the Hobby plan's 10s limit is not enough for `/api/extract`** —
every extraction would time out. The rest of the app is fine on Hobby. Either
take a Pro plan or run extraction somewhere without that limit.

---

## Costs

| | |
|---|---|
| Vercel Hobby | free (but see the timeout above) |
| Vercel Pro | $20/mo |
| Supabase free | 500MB — tens of thousands of reports |
| Anthropic | ~₹0.31 per scanned page at Haiku 4.5 rates |
| Razorpay | ~2% per transaction |
| WhatsApp | per 24h conversation, fractions of a rupee for utility messages |

---

## Verified

The Postgres store path was tested end-to-end against a real Postgres with
these migrations applied: lab-key auth (accept and reject), a pushed report
stored and WhatsApped, re-push de-duplicated, payload validation rejecting
unknown analytes, the patient page gated by PIN with no health data before
unlock, female-specific reference ranges, platelets in lakhs scaled correctly,
Marathi Q&A persisted, open tracking, and the staff list with masked phones.

The SQLite path was re-tested after the refactor and is unchanged.

**Not tested:** an actual Vercel deployment, a live Razorpay order, and a
successful live Anthropic extraction — all three need real credentials.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| `/health` says `"store":"sqlite"` on Vercel | `STORE_DRIVER=supabase` not set |
| `Cannot find module 'better-sqlite3'` | Same — the sqlite driver is being loaded on serverless |
| Every webhook 400s | `RAZORPAY_WEBHOOK_SECRET` mismatch, or a proxy altering the body |
| `/api/extract` times out | Hobby plan's 10s cap; needs Pro |
| Watcher: `401 invalid or revoked lab key` | Wrong `LAB_API_KEY`, or it was revoked |
| Reports vanish after redeploy | Still on SQLite — this is exactly the failure `STORE_DRIVER` prevents |
| Patient link 404s | `PUBLIC_BASE_URL` does not match the deployed URL |
