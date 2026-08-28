-- ═══════════════════════════════════════════════════════════════════════════
--  रक्त-सेतू · pay-per-use credit system
--  0002 — atomic operations
-- ═══════════════════════════════════════════════════════════════════════════
--
--  Every balance mutation lives in here rather than in application code,
--  because each one needs a row lock to be correct under concurrency.
--  Read-modify-write from Node over three separate queries is a race; a single
--  plpgsql function holding `select ... for update` is not.
--
--  All functions are SECURITY DEFINER with a pinned search_path and are
--  callable only by the service role.

-- ───────────────────────────────────────────────────────────────────────────
--  fn_reserve_credits — the pre-flight gate
--
--  Takes an estimate and places a hold on it. `for update` serialises
--  concurrent requests for the same user, so two simultaneous uploads cannot
--  both see the same balance and both proceed. Returns ok=false rather than
--  raising, so the caller can turn it into a clean 402.
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.fn_reserve_credits(
  p_user_id uuid,
  p_tokens  bigint,
  p_pdf_id  text default null
)
returns table (ok boolean, hold_id uuid, available_tokens bigint, current_balance bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance   bigint;
  v_reserved  bigint;
  v_available bigint;
  v_hold      uuid;
begin
  if p_tokens is null or p_tokens <= 0 then
    raise exception 'reserve amount must be positive, got %', p_tokens;
  end if;

  -- A user with no credits row has never paid; treat as zero rather than error.
  insert into credits (user_id) values (p_user_id) on conflict (user_id) do nothing;

  select c.balance_tokens, c.reserved_tokens
    into v_balance, v_reserved
    from credits c
   where c.user_id = p_user_id
     for update;                                   -- ← serialises this user

  v_available := v_balance - v_reserved;

  if v_available < p_tokens then
    return query select false, null::uuid, v_available, v_balance;
    return;
  end if;

  update credits
     set reserved_tokens = reserved_tokens + p_tokens,
         updated_at      = now()
   where user_id = p_user_id;

  insert into credit_holds (user_id, tokens, pdf_id)
  values (p_user_id, p_tokens, p_pdf_id)
  returning id into v_hold;

  return query select true, v_hold, v_available - p_tokens, v_balance;
end;
$$;

-- ───────────────────────────────────────────────────────────────────────────
--  fn_settle_hold — post-call reconciliation
--
--  Releases the reservation and charges what was actually used. Handles both
--  outcomes: a successful call charges billed_tokens, a failed one charges
--  nothing but still writes a usage_log row so failures stay visible.
--
--  Idempotent: settling an already-settled hold is a no-op that returns the
--  current balance, so a retried request cannot double-charge.
--
--  Actual usage can exceed the estimate. When it does we charge the real
--  amount and clamp at zero rather than letting the balance go negative —
--  the overshoot is the platform's loss, which is the correct place for it.
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.fn_settle_hold(
  p_hold_id        uuid,
  p_status         text,
  p_input_tokens   integer,
  p_output_tokens  integer,
  p_billed_tokens  bigint,
  p_cost_inr       numeric,
  p_cost_usd       numeric,
  p_tokens_per_inr numeric,
  p_model          text default null,
  p_error          text default null
)
returns table (ok boolean, already_settled boolean, new_balance_tokens bigint, new_balance_inr numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hold    credit_holds%rowtype;
  v_charge  bigint;
  v_inr     numeric(14,4);
  v_balance bigint;
  v_bal_inr numeric(14,4);
begin
  select * into v_hold from credit_holds where id = p_hold_id for update;

  if not found then
    raise exception 'unknown credit hold %', p_hold_id;
  end if;

  if v_hold.status <> 'held' then
    -- Already closed by an earlier attempt. Report the current balance.
    select c.balance_tokens, c.balance_inr into v_balance, v_bal_inr
      from credits c where c.user_id = v_hold.user_id;
    return query select true, true, v_balance, v_bal_inr;
    return;
  end if;

  v_charge := case when p_status = 'success' then greatest(coalesce(p_billed_tokens, 0), 0) else 0 end;
  v_inr    := case when p_tokens_per_inr > 0 then v_charge::numeric / p_tokens_per_inr else 0 end;

  update credits
     set reserved_tokens = greatest(0, credits.reserved_tokens - v_hold.tokens),
         balance_tokens  = greatest(0, credits.balance_tokens - v_charge),
         balance_inr     = greatest(0, credits.balance_inr - v_inr),
         updated_at      = now()
   where user_id = v_hold.user_id
  returning credits.balance_tokens, credits.balance_inr into v_balance, v_bal_inr;

  update credit_holds
     set status     = case when p_status = 'success' then 'settled' else 'released' end,
         settled_at = now()
   where id = p_hold_id;

  insert into usage_log (
    user_id, pdf_id, model, input_tokens, output_tokens,
    billed_tokens, estimated_tokens, cost_inr, cost_usd, status, error
  ) values (
    v_hold.user_id, v_hold.pdf_id, p_model,
    coalesce(p_input_tokens, 0), coalesce(p_output_tokens, 0),
    v_charge, v_hold.tokens, coalesce(p_cost_inr, 0), coalesce(p_cost_usd, 0),
    p_status, p_error
  );

  return query select true, false, v_balance, v_bal_inr;
end;
$$;

-- ───────────────────────────────────────────────────────────────────────────
--  fn_expire_stale_holds — crash recovery
--
--  If the Node process dies between reserve and settle, those reserved tokens
--  are stranded and the user cannot spend them. Run this periodically
--  (pg_cron, or on server boot) to hand them back.
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.fn_expire_stale_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hold  record;
  v_count integer := 0;
begin
  for v_hold in
    select * from credit_holds
     where status = 'held' and expires_at < now()
     order by created_at
     for update skip locked
  loop
    update credits
       set reserved_tokens = greatest(0, reserved_tokens - v_hold.tokens),
           updated_at      = now()
     where user_id = v_hold.user_id;

    update credit_holds
       set status = 'expired', settled_at = now()
     where id = v_hold.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ───────────────────────────────────────────────────────────────────────────
--  fn_credit_payment — the only path that adds credit
--
--  Idempotent on razorpay_order_id. Razorpay retries webhooks until it gets a
--  2xx, and it is entirely normal to receive the same event several times.
--  The `for update` plus the status check means only the first one credits.
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.fn_credit_payment(
  p_order_id   text,
  p_payment_id text,
  p_amount_inr numeric,
  p_tokens     bigint
)
returns table (ok boolean, already_credited boolean, credited_user_id uuid, new_balance_tokens bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment payments%rowtype;
  v_balance bigint;
begin
  select * into v_payment from payments where razorpay_order_id = p_order_id for update;

  if not found then
    -- An order we never created. Refuse rather than inventing a user to credit.
    return query select false, false, null::uuid, null::bigint;
    return;
  end if;

  if v_payment.status = 'paid' then
    select c.balance_tokens into v_balance from credits c where c.user_id = v_payment.user_id;
    return query select true, true, v_payment.user_id, v_balance;
    return;
  end if;

  update payments
     set status              = 'paid',
         razorpay_payment_id = coalesce(p_payment_id, razorpay_payment_id),
         credited_tokens     = p_tokens,
         credited_at         = now()
   where razorpay_order_id = p_order_id;

  insert into credits (user_id) values (v_payment.user_id) on conflict (user_id) do nothing;

  update credits
     set balance_tokens = credits.balance_tokens + p_tokens,
         balance_inr    = credits.balance_inr + p_amount_inr,
         updated_at     = now()
   where user_id = v_payment.user_id
  returning credits.balance_tokens into v_balance;

  return query select true, false, v_payment.user_id, v_balance;
end;
$$;

-- ───────────────────────────────────────────────────────────────────────────
--  fn_mark_payment_failed — record a failed attempt without touching balance
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.fn_mark_payment_failed(
  p_order_id   text,
  p_payment_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update payments
     set status              = 'failed',
         razorpay_payment_id = coalesce(p_payment_id, razorpay_payment_id)
   where razorpay_order_id = p_order_id
     and status = 'created';                 -- never downgrade a paid order
  return found;
end;
$$;

-- ───────────────────────────────────────────────────────────────────────────
--  Platform-wide spend cap (backstop)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.fn_record_platform_spend(
  p_period text,
  p_usd    numeric,
  p_inr    numeric
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
begin
  insert into platform_usage (period, spend_usd, spend_inr, request_count)
  values (p_period, coalesce(p_usd, 0), coalesce(p_inr, 0), 1)
  on conflict (period) do update
    set spend_usd     = platform_usage.spend_usd + coalesce(p_usd, 0),
        spend_inr     = platform_usage.spend_inr + coalesce(p_inr, 0),
        request_count = platform_usage.request_count + 1,
        updated_at    = now()
  returning spend_usd into v_total;

  return v_total;
end;
$$;

create or replace function public.fn_platform_spend(p_period text)
returns numeric
language sql
security definer
set search_path = public
as $$
  select coalesce((select spend_usd from platform_usage where period = p_period), 0);
$$;

-- ───────────────────────────────────────────────────────────────────────────
--  fn_user_balance — one round trip for GET /api/user/balance
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.fn_user_balance(p_user_id uuid)
returns table (
  balance_tokens  bigint,
  reserved_tokens bigint,
  available_tokens bigint,
  balance_inr     numeric,
  updated_at      timestamptz
)
language sql
security definer
set search_path = public
as $$
  select c.balance_tokens,
         c.reserved_tokens,
         c.balance_tokens - c.reserved_tokens as available_tokens,
         c.balance_inr,
         c.updated_at
    from credits c
   where c.user_id = p_user_id;
$$;

-- ───────────────────────────────────────────────────────────────────────────
--  Lock down execution. Only the service role — i.e. our server — may call
--  these. A leaked anon key must not be able to mint credit.
-- ───────────────────────────────────────────────────────────────────────────
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'fn_reserve_credits(uuid,bigint,text)',
    'fn_settle_hold(uuid,text,integer,integer,bigint,numeric,numeric,numeric,text,text)',
    'fn_expire_stale_holds()',
    'fn_credit_payment(text,text,numeric,bigint)',
    'fn_mark_payment_failed(text,text)',
    'fn_record_platform_spend(text,numeric,numeric)',
    'fn_platform_spend(text)',
    'fn_user_balance(uuid)'
  ]
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', fn);
    execute format('grant execute on function public.%s to service_role', fn);
  end loop;
end;
$$;
