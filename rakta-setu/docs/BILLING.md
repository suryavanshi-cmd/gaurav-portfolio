# Pay-per-use credits

Metering for the **AI extraction of scanned blood reports** — the one operation
in रक्त-सेतू that costs real money.

> **What is and is not billed.** The original path (`src/parsers/`) reads a
> PDF's text layer locally with `pdf-parse`. It never calls an API, costs ₹0,
> and is not metered. It also *refuses* scanned reports, because a PDF with no
> text layer cannot be read that way. Those refusals are what the paid path
> handles. Free stays free; only the AI call is charged.

Billing is off unless `BILLING_ENABLED=true`.

---

## The flow

```
  upload ──► platform cap ──► estimate ──► HOLD ──► Anthropic ──► SETTLE ──► report
              │                 │           │                       │
         503 if over       countTokens   402 if short         charge actual,
          monthly cap      (exact) or    of credit            refund the rest
                           page heuristic
```

### Why a hold rather than a check

The obvious design — check the balance, do the work, deduct — has a race:

```
  t0  request A reads balance = 5000 ✓          request B reads balance = 5000 ✓
  t1  A calls the API (4000 tokens)             B calls the API (4000 tokens)
  t2  A deducts 4000 → 1000
  t3                                            B deducts 4000 → −3000  ← overdrawn
```

Both requests passed a check that was true when they read it and false by the
time they acted. So instead, `fn_reserve_credits` takes a row lock and moves
the estimate into `reserved_tokens` up front. Spendable balance is
`balance_tokens - reserved_tokens`, so B sees the reduced figure and is
refused cleanly with a 402.

After the call, `fn_settle_hold` releases the reservation and charges what was
*actually* used — so an over-estimated hold costs the user nothing.

This is verified: two concurrent 6000-token requests against a 10000-token
balance grant exactly one reservation.

### Estimation

The hold is sized from `messages.countTokens` — a real count of the exact
request, and free to call — falling back to a per-page heuristic
(`EXTRACTION_TOKENS_PER_PAGE`, default 1000) when that call fails. Output
length genuinely cannot be known in advance, so the output allowance is always
heuristic (`EXTRACTION_OUTPUT_TOKENS_PER_PAGE`, default 400/page, capped).

The total is padded by `ESTIMATE_SAFETY_MARGIN` (1.2) so a slightly low
estimate does not routinely let a call overrun the balance.

### Reconciliation

`usage.input_tokens` and `usage.output_tokens` come back on the response.
From those:

- `billed_tokens` = input + output → deducted from `credits.balance_tokens`
- `cost_usd` = the true Anthropic cost, from the rate table
- `cost_inr` = `cost_usd × USD_TO_INR_RATE`
- a row in `usage_log` recording all of it

Actual usage can exceed the hold. When it does, the real amount is charged and
the balance clamps at zero — the overshoot is the platform's loss, which is
the right place for it. A balance can never go negative; the `CHECK`
constraint enforces that independently of application code.

---

## Money

`TOKENS_PER_INR=900` (₹10 → 9000 tokens) against Haiku 4.5 at $1/$5 per
million, ₹88/USD:

| | |
|---|---|
| Typical page | ~1000 input + ~500 output tokens |
| Charged | 1500 tokens = **₹1.67** |
| True API cost | $0.0035 = **₹0.31** |
| Margin | **~5.4x** |

`npm run billing-check` prints this and asserts the charge exceeds the cost —
run it after changing any rate.

Charging `input + output` equally is deliberate: output costs 5x more, but
extraction is input-heavy (a whole PDF in, a small JSON out), so the simpler
number a lab can reason about still leaves healthy margin. If your output ratio
grows, revisit `billedTokens()` in `src/billing/pricing.js`.

**Changing the model changes the rate automatically.** `BILLING_MODEL` selects
a row from `MODEL_RATES`; an unlisted model throws rather than billing at a
guessed price. Note Haiku 4.5's 200K context caps PDFs at 100 pages, and it
does not accept `output_config.effort` — `pricing.js` records both.

---

## Endpoints

### `GET /api/user/balance`
`Authorization: Bearer <supabase jwt>`

```json
{
  "balance_tokens": 90000, "reserved_tokens": 0, "available_tokens": 90000,
  "balance_inr": 100.00, "approx_pages_remaining": 50,
  "display": { "mr": "तुमच्याकडे 90,000 क्रेडिट शिल्लक आहेत (अंदाजे 50 पानं)." }
}
```

Read from Postgres on every call. No client-supplied balance is ever trusted.

### `POST /api/payment/create-order`
```json
{ "amount_inr": 100 }
```
Creates the Razorpay order **and** a pending `payments` row. That row is what
later binds the webhook's `order_id` back to a user — the webhook carries no
authenticated identity of its own, so without it there would be no safe way to
know whose account to credit.

### `POST /api/payment/webhook`
The only path that adds credit.

### `POST /api/payment/verify`
Confirms Checkout's signature for immediate UI feedback. Deliberately does
**not** credit — the browser may close before it ever calls back.

### `POST /api/extract`
`Content-Type: application/pdf`, raw bytes, `?deliver=true` to also store the
report and WhatsApp the patient.

```bash
curl -X POST "$BASE/api/extract?deliver=true" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/pdf" \
  --data-binary @scanned-report.pdf
```

`402` when short of credit, with `shortfall_tokens` and a `topup_inr` figure.

---

## Razorpay

### Two different signatures

Mixing these up is the usual reason an integration silently fails:

| | Signed value | Secret |
|---|---|---|
| **Webhook** | the raw request body | `RAZORPAY_WEBHOOK_SECRET` |
| **Checkout callback** | `order_id\|payment_id` | `RAZORPAY_KEY_SECRET` |

### The raw-body requirement

The webhook signature is an HMAC over the **exact bytes** Razorpay sent.
Parsing to JSON and re-serialising changes key order and whitespace, producing
a different digest — so every legitimate call would be rejected.

`src/server.js` therefore mounts `express.raw()` on the webhook path *before*
`express.json()`:

```js
app.use('/api/payment/webhook', express.raw({ type: '*/*', limit: '1mb' }));
app.use(express.json({ limit: '256kb' }));
```

**If you reorder those two lines, payments stop working.** The self-test
asserts that a re-serialised body fails verification, to keep the reason
visible.

### Idempotency

Razorpay retries until it gets a 2xx, so the same event arrives repeatedly.
Two independent layers stop a double-credit:

1. `webhook_events` keyed on Razorpay's `x-razorpay-event-id`
2. `fn_credit_payment` refuses an order already marked `paid`

Verified: three deliveries of one `payment.captured` event credit exactly once.

Token amounts are computed from the amount **Razorpay** reports, never from
anything the client sent.

### Setup

1. **Settings → Webhooks → Add**
2. URL: `https://your-domain.com/api/payment/webhook`
3. Secret: the value of `RAZORPAY_WEBHOOK_SECRET`
4. Events: `payment.captured`, `payment.failed`, `order.paid`

---

## The spend cap

`MONTHLY_SPEND_CAP_USD` tracks cumulative true cost in `platform_usage` and
returns `503 PLATFORM_CAP_REACHED` for all extraction once exceeded —
platform-wide, independent of any user's balance. It warns at 80%.

**This is a backstop, not the primary control.** It can only react after money
is spent, and it only counts spend that goes through this process. Set the real
limit in the **Anthropic Console**, where it is enforced upstream of anything
running here.

Failed calls that still consumed tokens charge the user nothing but *do* count
toward the cap — the cap must reflect money actually spent.

To reset early:

```sql
update platform_usage set spend_usd = 0 where period = '2026-08';
```

---

## Testing

```bash
npm run billing-check     # rates, conversions, margin, both signature schemes
```

No credentials, no network, no database. Run it after touching any rate.

Verified against a real Postgres with the actual migrations applied:

- 28 assertions on the SQL functions — crediting, replay refusal, hold/settle,
  idempotent settle, zero-clamping, stale-hold recovery, spend accumulation
- concurrent reservation: two 6000-token requests, 10000-token balance, exactly
  one granted
- full HTTP stack: auth rejection, 402 with no credit, webhook signature
  accept/reject, ₹100 → 90000 tokens, replays not double-crediting, a failed
  extraction releasing its hold rather than stranding it, and the cap returning
  503 without taking a hold

**Not yet exercised against the live APIs:** a successful Anthropic extraction
(needs a real key and spends money) and a real Razorpay order. Test both on
staging before taking real payments.

---

## Security notes

- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and can mint credit. Server only.
- The `fn_*` functions `GRANT EXECUTE` to `service_role` alone — a leaked anon
  key cannot call them.
- RLS gives users read-only access to their own rows. There are no
  insert/update/delete policies for end users at all.
- JWTs are verified by Supabase, never decoded locally — a locally decoded
  token proves nothing, and a forged `sub` would spend someone else's credit.
- Balances are read server-side on every request.
- Signature comparisons are constant-time.

## Failure modes worth knowing

| Symptom | Cause |
|---|---|
| Every webhook 400s | `express.json()` mounted before `express.raw()`, or wrong secret |
| Users pay, no credit | Webhook not reachable, or the `payments` row was never created |
| Balance stuck below what was bought | Stale holds — run `fn_expire_stale_holds()` |
| `No published rate for model "..."` | `BILLING_MODEL` is not in `MODEL_RATES` |
| Everything 503s | Monthly cap hit — check `platform_usage` |
| 402 despite a paid top-up | Look at `reserved_tokens`; an in-flight or stranded hold |
