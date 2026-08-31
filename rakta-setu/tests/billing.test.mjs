/**
 * Credits, payments and the spend cap, over the real HTTP stack and the real
 * SQL functions.
 */
import crypto from 'node:crypto';
import { start, TOKENS, pool } from './helpers/mock-supabase.mjs';
import { check, summary } from './helpers/assert.mjs';

const SECRET = 'whsec_test_12345';
process.env.BILLING_ENABLED = 'true';
process.env.STORE_DRIVER = 'supabase';
process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_fake';
process.env.SUPABASE_ANON_KEY = 'anon_fake';
process.env.RAZORPAY_KEY_ID = 'rzp_test_fake';
process.env.RAZORPAY_KEY_SECRET = 'rzp_secret_fake';
process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
process.env.ANTHROPIC_API_KEY = 'sk-ant-invalid-for-testing';
process.env.MONTHLY_SPEND_CAP_USD = '50';
process.env.ADMIN_TOKEN = 'x'.repeat(40);
process.env.DISABLE_WATCHER = 'true';
process.env.PUBLIC_BASE_URL = 'http://127.0.0.1:3100';
process.env.LOG_LEVEL = 'error';

await start(54321);
const { app } = await import('../src/app.js');
const server = app.listen(3100);
await new Promise((r) => setTimeout(r, 300));

const BASE = 'http://127.0.0.1:3100';
const j = async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) });

const { rows } = await pool.query('insert into auth.users (email) values ($1) returning id',
  [`itest-${crypto.randomUUID()}@test`]);
const USER = rows[0].id;
const JWT = `jwt_${crypto.randomUUID()}`;
TOKENS.set(JWT, { id: USER, email: 'itest@test' });
const auth = { Authorization: `Bearer ${JWT}` };
const pdf = Buffer.from('%PDF-1.4\n/Type /Page \n/Type /Pages /Count 1\ntrailer\n', 'latin1');
const extract = () => fetch(`${BASE}/api/extract`, {
  method: 'POST', headers: { ...auth, 'Content-Type': 'application/pdf' }, body: pdf,
});

console.log('\n── auth ──');
check('no token → 401', (await j(await fetch(`${BASE}/api/user/balance`))).status, 401);
check('forged token → 401',
  (await j(await fetch(`${BASE}/api/user/balance`, { headers: { Authorization: 'Bearer forged' } }))).status, 401);

console.log('\n── balance is read server-side ──');
let r = await j(await fetch(`${BASE}/api/user/balance`, { headers: auth }));
check('valid token → 200', r.status, 200);
check('starts at zero', r.body.available_tokens, 0);

console.log('\n── pre-flight refuses when broke ──');
r = await j(await extract());
check('no credit → 402', r.status, 402);
check('code', r.body.code, 'INSUFFICIENT_CREDIT');
check('never trusts a client balance', r.body.available_tokens, 0);

console.log('\n── webhook signature ──');
const orderId = `order_${crypto.randomUUID()}`;
const payload = JSON.stringify({
  event: 'payment.captured',
  payload: { payment: { entity: { id: 'pay_T1', order_id: orderId, amount: 10000, status: 'captured' } } },
});
const sign = (b, s = SECRET) => crypto.createHmac('sha256', s).update(b).digest('hex');
const hook = (sig, evt) => fetch(`${BASE}/api/payment/webhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(sig ? { 'x-razorpay-signature': sig } : {}), ...(evt ? { 'x-razorpay-event-id': evt } : {}) },
  body: payload,
});
check('missing signature → 400', (await j(await hook(null))).status, 400);
check('wrong secret → 400', (await j(await hook(sign(payload, 'wrong')))).status, 400);

await pool.query("insert into payments (user_id, razorpay_order_id, amount_inr, status) values ($1,$2,100.00,'created')",
  [USER, orderId]);
check('valid signature → 200', (await j(await hook(sign(payload), 'evt_1'))).status, 200);
await new Promise((res) => setTimeout(res, 500));
r = await j(await fetch(`${BASE}/api/user/balance`, { headers: auth }));
check('₹100 credited 90000 tokens', r.body.balance_tokens, 90000);

console.log('\n── idempotency (Razorpay retries hard) ──');
await hook(sign(payload), 'evt_1');
await hook(sign(payload), 'evt_2');
await new Promise((res) => setTimeout(res, 600));
r = await j(await fetch(`${BASE}/api/user/balance`, { headers: auth }));
check('replays did NOT double-credit', r.body.balance_tokens, 90000);

console.log('\n── a failed extraction must not leak its hold ──');
const before = (await j(await fetch(`${BASE}/api/user/balance`, { headers: auth }))).body;
r = await j(await extract());
check('bad API key → error, not a crash', r.status >= 400, true);
check('nothing charged', r.body.charged_tokens, 0);
await new Promise((res) => setTimeout(res, 400));
const after = (await j(await fetch(`${BASE}/api/user/balance`, { headers: auth }))).body;
check('balance unchanged', after.balance_tokens, before.balance_tokens);
check('reservation released, not stranded', after.reserved_tokens, 0);
const logged = await pool.query('select status, billed_tokens from usage_log where user_id=$1 order by created_at desc limit 1', [USER]);
check('failure recorded', logged.rows[0]?.status, 'failed');
check('billed zero for the failure', Number(logged.rows[0]?.billed_tokens), 0);

console.log('\n── stale holds recover without a server boot (serverless) ──');
// Simulate a function killed mid-extraction: a hold left behind, already past
// its expiry, with nothing to sweep it.
const bal = (await j(await fetch(`${BASE}/api/user/balance`, { headers: auth }))).body.balance_tokens;
await pool.query(
  `insert into credit_holds (user_id, tokens, pdf_id, status, expires_at)
   values ($1, $2, 'crashed', 'held', now() - interval '1 hour')`, [USER, bal]);
await pool.query('update credits set reserved_tokens = $2 where user_id = $1', [USER, bal]);
r = await j(await fetch(`${BASE}/api/user/balance`, { headers: auth }));
check('the whole balance is stranded', r.body.available_tokens, 0);

// Without recovery this is a permanent 402 on money the user already paid for.
r = await j(await extract());
check('recovers and gets past the credit check (not a 402)', r.status !== 402, true);
await new Promise((res) => setTimeout(res, 400));
const healed = await pool.query("select count(*)::int c from credit_holds where user_id=$1 and status='expired'", [USER]);
check('the stale hold was expired, not left forever', healed.rows[0].c >= 1, true);

console.log('\n── platform spend cap ──');
const heldBefore = (await pool.query(
  "select count(*)::int c from credit_holds where user_id=$1 and status='held'", [USER])).rows[0].c;
await pool.query(
  `insert into platform_usage (period, spend_usd) values (to_char(now() at time zone 'utc','YYYY-MM'), 999)
   on conflict (period) do update set spend_usd = 999`);
r = await j(await extract());
check('over cap → 503', r.status, 503);
check('code', r.body.code, 'PLATFORM_CAP_REACHED');
const heldAfter = (await pool.query(
  "select count(*)::int c from credit_holds where user_id=$1 and status='held'", [USER])).rows[0].c;
check('no new hold taken when capped', heldAfter, heldBefore);

server.close();
await pool.end();
summary('billing');
