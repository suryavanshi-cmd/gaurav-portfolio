<div align="center">

# रक्त-सेतू · Rakta-Setu

**रक्त तपासणीचा अहवाल — व्हॉट्सॲपवर, मराठीत, आवाजासह.**

Automated WhatsApp delivery of blood reports, with a voice-enabled Marathi web
app that explains every result in plain language and gives food and lifestyle guidance.

</div>

---

## हे काय आहे? · What is this?

A blood analyzer finishes a sample and drops a report file on the lab PC.
Nothing else happens — someone has to notice it, find the patient's number, and
send it. And when the patient does get a PDF, it is a wall of English acronyms
they cannot read.

रक्त-सेतू closes both gaps:

```
  रक्त तपासणी यंत्र                 रक्त-सेतू                          रुग्ण
  Blood analyzer                                                     Patient
       │                                                                │
       │  report.pdf  ──►  📁 watch  ──►  📄 parse  ──►  🧠 interpret    │
       │                                                        │       │
       │                                          🔒 secure link │       │
       │                                                        ▼       │
       └──────────────────────────────────────────  📱 WhatsApp ──────►│
                                                       (मराठीत)         │
                                                                        ▼
                                             🌐 मराठी अहवाल + 🎙️ आवाजाने प्रश्नोत्तरं
```

1. **Watches** the folder the analyzer writes into.
2. **Parses** the PDF / CSV / text output — patient name, phone, and every test value.
3. **Interprets** each value against sex-aware reference ranges and writes a
   plain-Marathi explanation plus diet advice.
4. **Sends** a WhatsApp message in Marathi with a secure, patient-specific link.
5. **Serves** a mobile web page where the patient reads their report in Marathi —
   and can **speak questions in Marathi and hear the answers back**.

---

## वैशिष्ट्यं · Features

| | |
|---|---|
| 🩸 **३३ तपासण्या** | Hemoglobin, CBC + differential, ESR, sugar & HbA1c, full lipid profile, liver, kidney, thyroid, vitamin D & B12, ferritin, electrolytes — each with a curated Marathi explanation, likely causes, and food advice |
| 📁 **फोल्डर वॉचर** | Waits for the analyzer to finish writing, de-duplicates by file hash, serialises sends, archives what it processed |
| 🧠 **लिंग-निहाय मर्यादा** | Reference ranges differ for men and women; so do the flags |
| 🚨 **तातडीची सूचना** | Panic values raise a distinct "see a doctor today" banner instead of being buried in a list |
| 📱 **दोन WhatsApp ड्रायव्हर** | Meta Cloud API (default) or Twilio, switchable with one env var — plus a `console` driver for development |
| 🎙️ **मराठी आवाज** | Web Speech API — speak your question in Marathi, hear the answer read aloud |
| 🤖 **AI किंवा नियम** | With an Anthropic API key, answers come from Claude under strict medical guardrails. **Without one, the app still answers** from the built-in Marathi knowledge base |
| 🔒 **सुरक्षा** | Capability-token links + last-4-digits PIN, expiring links, no health data before unlock, masked logs |
| 👩‍⚕️ **कर्मचारी कक्ष** | Staff console to see delivery status and resend |
| 💳 **पे-पर-यूज क्रेडिट** | *Optional.* Supabase + Razorpay credit system metering AI extraction of **scanned** reports — reserve-then-reconcile billing, idempotent webhooks, per-account and platform-wide spend caps |

---

## लगेच सुरू करा · Quick start

```bash
git clone https://github.com/<तुमचं-नाव>/rakta-setu.git
cd rakta-setu
npm install

cp .env.example .env      # works as-is for a local trial
npm run seed              # loads the bundled demo report
npm start
```

`npm run seed` prints a link and a 4-digit PIN. Open the link, enter the PIN,
and you are looking at exactly what a patient sees.

Out of the box it runs with `WHATSAPP_DRIVER=console` — messages are printed to
the terminal, not sent — and with no API key, so Marathi answers come from the
built-in rule engine. **You can try the whole thing without a Meta account, a
Twilio account, or an API key.**

---

## खरं यंत्र जोडणं · Connecting the real analyzer

Point `WATCH_DIR` at whatever folder the lab's machine or LIS software writes
finished reports into:

```bash
# .env   (Windows paths use forward slashes)
WATCH_DIR=C:/BloodMachine/Reports
```

Then drop a real report file in and watch the log. Test the parse without
sending anything to anyone:

```bash
node scripts/ingest-file.js "C:/BloodMachine/Reports/some-report.pdf"
```

**If the lab's software can export CSV, use that instead of PDF.** A structured
export is far more reliable than scraping a PDF's text layer.

> **Scanned PDFs are refused, deliberately.** If a PDF has no text layer this
> app fails loudly and moves the file to `failed/` rather than guessing. Sending
> a patient a mis-read blood result is worse than sending nothing.

### स्कॅन केलेले अहवाल · Scanned reports (paid, optional)

The local parser cannot read a PDF with no text layer, and refuses rather than
guessing. Turning on `BILLING_ENABLED` adds an AI extraction path for exactly
those, metered per use:

```
POST /api/extract        Content-Type: application/pdf, raw bytes
GET  /api/user/balance   remaining credits
POST /api/payment/create-order   Razorpay top-up
```

Credits are held before the call and reconciled against the real
`usage.input_tokens` / `usage.output_tokens` afterwards, so an over-estimate
costs the user nothing and concurrent uploads cannot overdraw an account.
Everything stays off — and free — unless you enable it.

Setup: **[supabase/README.md](supabase/README.md)** then
**[docs/BILLING.md](docs/BILLING.md)**.

---

Full guides:

- **[docs/SETUP.mr.md](docs/SETUP.mr.md)** — मराठीत, टप्प्याटप्प्याने सेटअप (for the lab)
- **[docs/WHATSAPP.md](docs/WHATSAPP.md)** — Meta Cloud API + getting a Marathi template approved
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — how it fits together, and how to extend it
- **[docs/DEPLOY-VERCEL.md](docs/DEPLOY-VERCEL.md)** — hosting on Vercel + Supabase, and exactly which keys go where
- **[docs/BILLING.md](docs/BILLING.md)** — the credit system, Razorpay, and the spend caps
- **[supabase/README.md](supabase/README.md)** — applying the Postgres migrations
- **[docs/SAFETY.md](docs/SAFETY.md)** — the medical and privacy limits this project holds itself to

---

## प्रकल्पाची रचना · Project layout

```
api/index.js             Vercel serverless entry (exports the Express app)
vercel.json              routing + function limits
src/
  app.js                 the Express app — no listen(), no watcher
  server.js              long-running entry for the lab PC (adds both)
  config.js              env parsing + startup validation
  store/                 report storage: sqlite (lab PC) | supabase (serverless)
  db.js                  SQLite schema
  domain/
    analytes.js          ★ the knowledge base — 33 tests in Marathi
    interpret.js         flagging, scaling, summaries, WhatsApp text
  parsers/
    index.js             dispatch by file type
    pdf.js  csv.js       readers
    text-extract.js      the messy-real-world extractor
  services/
    ingest.js            parse → dedupe → store → send → archive
    reports.js           storage, tokens, PIN verification
    ai.js                Marathi Q&A (Claude) + rule-based fallback
    extraction.js        AI extraction of scanned PDFs (the metered feature)
    whatsapp/            cloud.js · twilio.js · console.js
  billing/               optional — off unless BILLING_ENABLED=true
    pricing.js           model rates, INR conversion, estimation
    credits.js           reserve → settle, over atomic SQL
    razorpay.js          orders + both signature schemes
    platformCap.js       monthly spend backstop
    auth.js              Supabase JWT verification
  watcher/index.js       chokidar folder watcher
  routes/                api.js · webhook.js · payment.js · user.js · extract.js
supabase/migrations/     credit schema + atomic functions
public/                  patient page, staff console, voice module
scripts/                 seed · ingest-file · send-test · eject-to-new-repo
```

The file worth reading first is **`src/domain/analytes.js`** — it is where the
actual value of this project lives, and where you will add tests your lab runs.

### आणखी तपासणी जोडणं · Adding a test

```js
{
  key: 'hba1c',
  mr: 'एचबीए१सी', en: 'HbA1c', unit: '%', group: 'diabetes',
  aliases: ['hba1c', 'glycated haemoglobin', 'a1c'],   // what the printout says
  ranges: { default: [4.0, 5.6] },                      // or { male: [...], female: [...] }
  critical: { high: 9 },                                // optional panic value
  about: 'मागच्या तीन महिन्यांतली सरासरी साखर.',
  low:  { meaning: '…', advice: ['…'] },
  high: { meaning: '…', causes: ['…'], advice: ['…'] },
}
```

Parsing, flagging, the report page, the voice answers and the WhatsApp summary
all pick it up automatically.

---

## ⚠️ वैद्यकीय सूचना · Medical disclaimer

**हे साधन डॉक्टरांना पर्याय नाही.** This project explains laboratory values in
plain Marathi and offers general dietary guidance. It does not diagnose, does
not prescribe, and does not name or dose any medicine — the AI prompt forbids
all three, and the rule engine cannot do them by construction. Every report
page and every answer carries a disclaimer telling the patient to consult their
doctor.

Anyone deploying this is handling other people's health data. Read
**[docs/SAFETY.md](docs/SAFETY.md)** before it touches a real patient, and check
what your local rules require of a diagnostic lab.

---

## परवाना · Licence

MIT — see [LICENSE](LICENSE).
