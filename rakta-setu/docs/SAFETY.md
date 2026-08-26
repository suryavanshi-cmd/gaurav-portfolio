# Safety, privacy, and what this project will not do

This app puts health information in front of patients without a clinician in
the room. The limits below are design constraints, not disclaimers to be edited
away.

---

## What the app will not do

**It does not diagnose.** No result is ever presented as a disease. The wording
is always "this may indicate…, your doctor will decide". The AI system prompt
forbids diagnosis explicitly; the rule engine has no mechanism for it.

**It does not prescribe.** No medicine name, no dose, no duration — from either
the AI or the rule engine. Asked about medication, the answer is always to ask
the doctor.

**It does not invent values.** Answers are grounded in the parsed report. Asked
about a test that was not performed, it says so rather than guessing.

**It does not silently guess at unreadable reports.** A scanned PDF with no text
layer is refused and moved to `failed/`. A file with no recognisable results is
refused. Sending a patient a mis-read blood result is worse than sending nothing.

**It does not downplay urgency.** Panic values raise a distinct alert telling
the patient to see a doctor today, and the AI is instructed to repeat that in
every answer for such a report.

---

## Where the guardrails live

| Guardrail | File |
|---|---|
| AI system prompt — no diagnosis, no medicine, grounded, Marathi only | `src/services/ai.js` → `SYSTEM_PROMPT` |
| Rule-engine answers (the no-API-key path) | `src/services/ai.js` → `answerFromRules()` |
| Panic-value thresholds | `src/domain/analytes.js` → `critical` |
| On-page disclaimer | `public/report.html` → `.disclaimer` |
| WhatsApp message disclaimer | `src/domain/interpret.js` → `whatsappSummary()` |

If you fork this, keep them.

---

## Privacy

**What is stored.** Patient name, phone, age, sex, and their test results — in
`data/rakta-setu.sqlite` on your own machine. Nothing is sent to any third party
except the WhatsApp provider you configure and, if you enable it, the Anthropic
API for answering questions.

**Logs are masked.** Names and phone numbers are reduced to `R*******` and
`****2345` before they reach the log. Lab staff paste logs into support chats;
this makes that survivable.

**Nothing sensitive is committed.** `.gitignore` excludes `.env`, `data/`,
`inbox/`, `archive/` and `failed/`. Verify before your first push:

```bash
git status --porcelain --ignored | grep -E "\.env|data/|inbox/"
```

**Links expire.** `LINK_TTL_HOURS` defaults to 30 days. Shorten it if your
regulator or your comfort says so.

**The report page is not cached or indexed.** `Cache-Control: no-store` on
`/api/*` and `/r/*`, plus `noindex, nofollow`.

### If you enable AI answers

The report context — name, age, sex, and test values — is sent to the Anthropic
API with each question. If that is not acceptable to your lab or your patients,
leave `ANTHROPIC_API_KEY` empty. The app runs entirely locally and still answers
in Marathi. This is a real choice the deployment gets to make, which is why the
rule engine is not an afterthought.

---

## Threat model for report links

The link is a capability. Anyone holding it, plus the last four digits of the
patient's phone, can read the report.

**Mitigations in place:** 24-character tokens from a CSPRNG (~115 bits), a PIN
gate, rate limiting (12 unlock attempts per 10 minutes per IP+token), expiry,
constant-time PIN comparison, and no health data in the pre-auth endpoint.

**What this does not defend against:** someone with access to the patient's own
WhatsApp. That is the same exposure as a paper report left on a kitchen table,
and it is the tradeoff for a system a patient can actually use.

**Do not disable the PIN in production.** `REQUIRE_PATIENT_VERIFICATION=false`
exists for local development only.

---

## Before you deploy for real patients

- [ ] Serve over HTTPS. Required for microphone access, and required for this data.
- [ ] Set a long random `ADMIN_TOKEN`. The startup check warns if you did not.
- [ ] Verify your lab's reference ranges match `analytes.js`. Analyzers differ.
- [ ] Test the full path on your own phone before any patient's.
- [ ] Set up a backup for `data/rakta-setu.sqlite`.
- [ ] Check `failed/` on a schedule — reports land there when nobody was told.
- [ ] Confirm what your local rules require of a diagnostic lab handling patient
      data and sending results electronically. This project does not and cannot
      determine that for you.
- [ ] Have a clinician read the Marathi explanations in `analytes.js` before
      patients do.

That last one matters most. The medical content in this repo was written to be
careful and conservative, but it has not been reviewed by a practising
clinician. Get that review.
