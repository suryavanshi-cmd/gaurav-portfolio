# Supabase setup

The billing side of रक्त-सेतू lives in Postgres on Supabase. Report data stays
in local SQLite — only money and identity are here.

## 1. Create a project

[database.new](https://database.new) → note the project ref.

## 2. Apply the migrations

**Option A — Supabase CLI (recommended)**

```bash
npm install -g supabase
supabase link --project-ref <your-project-ref>
supabase db push
```

**Option B — SQL editor**

Paste and run, in order:

1. `migrations/0001_credit_system.sql` — tables, indexes, RLS, signup trigger
2. `migrations/0002_credit_functions.sql` — the atomic balance operations

## 3. Copy the keys

**Project Settings → API**

| Supabase field | Env var | Where it may go |
|---|---|---|
| Project URL | `SUPABASE_URL` | anywhere |
| `anon` / publishable key | `SUPABASE_ANON_KEY` | browser — this is fine |
| `service_role` key | `SUPABASE_SERVICE_ROLE_KEY` | **server only** |

> The service role key bypasses row level security and can mint credit. It must
> never reach a browser, a mobile app, or a public repo. `.gitignore` already
> excludes `.env`.

## 4. Verify

```sql
select routine_name from information_schema.routines
 where routine_schema = 'public' and routine_name like 'fn_%';
```

Expect eight functions: `fn_reserve_credits`, `fn_settle_hold`,
`fn_expire_stale_holds`, `fn_credit_payment`, `fn_mark_payment_failed`,
`fn_record_platform_spend`, `fn_platform_spend`, `fn_user_balance`
(plus `fn_handle_new_auth_user`, the signup trigger).

## Schema at a glance

```
auth.users ──trigger──► users ──┬──► credits         (balance + reservations)
                                ├──► credit_holds    (in-flight extractions)
                                ├──► usage_log       (every metered call)
                                └──► payments        (Razorpay orders)

platform_usage    monthly spend, for the account-level cap
webhook_events    Razorpay event ids, for idempotency
```

## Why the logic is in SQL

Every balance change needs a row lock to be correct under concurrency. Doing
read-modify-write from Node across separate queries is a race: two uploads read
the same balance, both proceed, and the account overdraws. Each function here
holds `select ... for update` for the duration, so concurrent requests for the
same user serialise. `docs/BILLING.md` walks through the failure this prevents.

## Housekeeping

If the server crashes mid-extraction, that reservation is stranded and the user
cannot spend those tokens. The server calls `fn_expire_stale_holds()` on boot;
for a long-running deployment, also schedule it:

```sql
select cron.schedule('expire-holds', '*/10 * * * *', $$select public.fn_expire_stale_holds()$$);
```

(Requires the `pg_cron` extension — Database → Extensions.)
