-- ═══════════════════════════════════════════════════════════════════════════
--  रक्त-सेतू · pay-per-use credit system
--  0001 — tables, indexes, row level security
-- ═══════════════════════════════════════════════════════════════════════════
--
--  Money and health data live here, so two rules run through the whole schema:
--    1. Balances can never go negative — enforced by CHECK, not by app code.
--    2. Nothing here is writable by a client. Every mutation goes through the
--       SECURITY DEFINER functions in 0002, called with the service role key
--       from the server. RLS gives end users read-only access to their own rows.
--
--  Requires the pgcrypto extension for gen_random_uuid() (present by default
--  on Supabase).

create extension if not exists pgcrypto;

-- ── users ──────────────────────────────────────────────────────────────────
-- Mirrors auth.users so we can hang billing off a real authenticated identity.
-- id is deliberately the SAME uuid as auth.users.id, which means the `sub`
-- claim in a Supabase JWT is directly usable as the billing user id.
create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  phone       text,
  created_at  timestamptz not null default now()
);

comment on table public.users is
  'Billing-side mirror of auth.users. id === auth.users.id === JWT sub claim.';

-- ── credits ────────────────────────────────────────────────────────────────
-- balance_tokens is the authoritative gate for whether work may proceed.
-- reserved_tokens holds tokens that an in-flight extraction has claimed but
-- not yet spent; available = balance_tokens - reserved_tokens. Without the
-- reservation column two concurrent uploads could both pass a balance check
-- and overdraw the account.
create table if not exists public.credits (
  user_id         uuid primary key references public.users (id) on delete cascade,
  balance_tokens  bigint        not null default 0 check (balance_tokens  >= 0),
  reserved_tokens bigint        not null default 0 check (reserved_tokens >= 0),
  balance_inr     numeric(14,4) not null default 0 check (balance_inr     >= 0),
  updated_at      timestamptz   not null default now()
);

comment on column public.credits.reserved_tokens is
  'Tokens claimed by in-flight extractions. Spendable balance is balance_tokens - reserved_tokens.';

-- ── credit_holds ───────────────────────────────────────────────────────────
-- One row per in-flight extraction. Created by fn_reserve_credits, closed by
-- fn_settle_hold. expires_at exists so a crashed process cannot strand
-- reserved tokens forever — see fn_expire_stale_holds.
create table if not exists public.credit_holds (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  tokens      bigint not null check (tokens > 0),
  pdf_id      text,
  status      text not null default 'held' check (status in ('held', 'settled', 'released', 'expired')),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '15 minutes',
  settled_at  timestamptz
);

create index if not exists idx_credit_holds_open
  on public.credit_holds (user_id) where status = 'held';
create index if not exists idx_credit_holds_expiry
  on public.credit_holds (expires_at) where status = 'held';

-- ── usage_log ──────────────────────────────────────────────────────────────
-- Immutable record of every metered call. cost_* is what Anthropic charged us;
-- billed_tokens is what the user was charged. The gap between them is margin,
-- and keeping both is what makes that measurable.
create table if not exists public.usage_log (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users (id) on delete cascade,
  pdf_id           text,
  model            text,
  input_tokens     integer not null default 0,
  output_tokens    integer not null default 0,
  billed_tokens    bigint  not null default 0,
  estimated_tokens bigint,
  cost_inr         numeric(14,6) not null default 0,
  cost_usd         numeric(14,8) not null default 0,
  status           text not null check (status in ('success', 'failed')),
  error            text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_usage_log_user_time on public.usage_log (user_id, created_at desc);
create index if not exists idx_usage_log_pdf       on public.usage_log (pdf_id);

-- ── payments ───────────────────────────────────────────────────────────────
-- A row is created when the Razorpay order is created, then updated when the
-- webhook confirms payment. The unique constraint on razorpay_order_id plus
-- the status check inside fn_credit_payment is what makes webhook retries
-- safe: Razorpay retries aggressively, and double-crediting is real money.
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users (id) on delete cascade,
  razorpay_order_id   text not null unique,
  razorpay_payment_id text unique,
  amount_inr          numeric(12,2) not null check (amount_inr > 0),
  credited_tokens     bigint not null default 0,
  status              text not null default 'created'
                        check (status in ('created', 'paid', 'failed', 'refunded')),
  notes               jsonb,
  created_at          timestamptz not null default now(),
  credited_at         timestamptz
);

create index if not exists idx_payments_user on public.payments (user_id, created_at desc);

-- ── webhook_events ─────────────────────────────────────────────────────────
-- Second idempotency layer, keyed on Razorpay's own event id. Catches replays
-- that carry a different order (e.g. refund events) before they reach any
-- balance-mutating code.
create table if not exists public.webhook_events (
  id           text primary key,
  event_type   text,
  payload      jsonb,
  processed_at timestamptz not null default now()
);

-- ── platform_usage ─────────────────────────────────────────────────────────
-- Account-wide spend per calendar month, used for the MONTHLY_SPEND_CAP_USD
-- backstop. This is a blunt platform-wide kill switch, deliberately
-- independent of any individual user's balance.
create table if not exists public.platform_usage (
  period        text primary key,          -- 'YYYY-MM' in UTC
  spend_usd     numeric(14,6) not null default 0,
  spend_inr     numeric(14,4) not null default 0,
  request_count bigint not null default 0,
  updated_at    timestamptz not null default now()
);

comment on table public.platform_usage is
  'Backstop only. The authoritative spend limit belongs in the Anthropic Console.';

-- ═══════════════════════════════════════════════════════════════════════════
--  Row Level Security
--  The service role key bypasses RLS entirely; these policies exist so that a
--  browser holding a user JWT can read its own billing state and nothing else.
--  There are deliberately NO insert/update/delete policies for end users.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.users          enable row level security;
alter table public.credits        enable row level security;
alter table public.credit_holds   enable row level security;
alter table public.usage_log      enable row level security;
alter table public.payments       enable row level security;
alter table public.webhook_events enable row level security;
alter table public.platform_usage enable row level security;

drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select to authenticated using (id = (select auth.uid()));

drop policy if exists credits_select_own on public.credits;
create policy credits_select_own on public.credits
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists usage_select_own on public.usage_log;
create policy usage_select_own on public.usage_log
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
  for select to authenticated using (user_id = (select auth.uid()));

-- webhook_events and platform_usage carry no user-facing rows: RLS on with no
-- policy means only the service role can see them.

-- ── auto-provision on signup ───────────────────────────────────────────────
-- Every authenticated user needs a users row and a zero-balance credits row.
-- Doing it in a trigger means no code path can ever hit a missing row.
create or replace function public.fn_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, phone)
  values (new.id, new.email, new.phone)
  on conflict (id) do nothing;

  insert into public.credits (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.fn_handle_new_auth_user();
