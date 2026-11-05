-- ============================================================================
-- The payment ledger, and a log of every step a payment takes.
--
-- Until Razorpay is switched on, a booking is confirmed straight away and
-- marked payment_status = 'demo'. That left nothing behind to say what was
-- paid, how, or when. Two tables now carry it:
--
--   payments        one row per payment: amount, method, status, a reference
--                   the guest can quote, and the gateway's ids once there is a
--                   gateway.
--   payment_events  an append-only log: the booking being made, checkout
--                   opening, a method being chosen, the payment starting and
--                   succeeding, the booking being confirmed.
--
-- Neither table can be written by anon or by a signed-in user directly. Rows
-- arrive through two security-definer functions, which check that the booking
-- is the caller's, and — for record_test_payment — that the server itself
-- marked it as a test booking. A guest therefore cannot use them to mark a
-- real booking paid, and cannot write arbitrary text into the log: the event
-- names they may add are a fixed list, and the only detail kept is the method.
--
-- Written to re-run, like the rest of the migrations.
-- ============================================================================

-- ─── payments ───────────────────────────────────────────────────────────────
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  traveler_id uuid references public.profiles (id) on delete set null,
  -- 'test' until a gateway is configured; nothing moves money in test mode.
  provider text not null check (provider in ('test', 'razorpay')),
  method text check (method in ('upi', 'card', 'netbanking')),
  amount numeric(10, 2) not null check (amount >= 0),
  currency text not null default 'INR',
  status text not null check (status in ('created', 'succeeded', 'failed', 'refunded')),
  reference text not null unique,
  provider_order_id text,
  provider_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_booking_idx on public.payments (booking_id, created_at desc);
create index if not exists payments_created_idx on public.payments (created_at desc);

drop trigger if exists set_updated_at on public.payments;
create trigger set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- ─── payment_events ─────────────────────────────────────────────────────────
create table if not exists public.payment_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  payment_id uuid references public.payments (id) on delete cascade,
  event text not null,
  detail jsonb not null default '{}'::jsonb,
  actor uuid,
  created_at timestamptz not null default now()
);

create index if not exists payment_events_booking_idx
  on public.payment_events (booking_id, created_at, id);

-- ─── who can see them ───────────────────────────────────────────────────────
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;

drop policy if exists payments_read on public.payments;
create policy payments_read on public.payments
  for select using (traveler_id = auth.uid() or public.is_admin());

drop policy if exists payment_events_read on public.payment_events;
create policy payment_events_read on public.payment_events
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.bookings b
      where b.id = payment_events.booking_id and b.traveler_id = auth.uid()
    )
  );

-- Two locks, as in the rls migration: no grants at all, then exactly the one
-- this needs. There are no insert, update or delete policies either, so even a
-- stray grant would not let a guest write here.
revoke all on public.payments, public.payment_events from anon, authenticated;
grant select on public.payments, public.payment_events to authenticated;

-- ─── the checkout log ───────────────────────────────────────────────────────
create or replace function public.log_checkout_event(booking_code text, event_name text, pay_method text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  target public.bookings%rowtype;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if event_name not in ('checkout.opened', 'checkout.method_selected', 'checkout.cancelled') then
    raise exception 'unknown_event' using errcode = '22023';
  end if;

  select * into target from public.bookings where code = booking_code and traveler_id = uid;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0002';
  end if;

  insert into public.payment_events (booking_id, event, detail, actor)
  values (
    target.id,
    event_name,
    case
      when pay_method in ('upi', 'card', 'netbanking') then jsonb_build_object('method', pay_method)
      else '{}'::jsonb
    end,
    uid
  );
end;
$$;

-- ─── a test payment ─────────────────────────────────────────────────────────
-- Records a successful payment against a booking the server marked as a test
-- booking, and logs each step of it. Calling it twice for the same booking
-- returns the payment already made rather than taking a second one.
create or replace function public.record_test_payment(booking_code text, pay_method text)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  target public.bookings%rowtype;
  paid public.payments%rowtype;
  ref text;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if pay_method not in ('upi', 'card', 'netbanking') then
    raise exception 'unknown_method' using errcode = '22023';
  end if;

  select * into target from public.bookings
  where code = booking_code and traveler_id = uid
  for update;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0002';
  end if;

  -- Only a booking the server created in test mode. A booking waiting on a
  -- real gateway is 'unpaid', and this must never be the way it becomes paid.
  if target.payment_status <> 'demo' then
    raise exception 'not_a_test_booking' using errcode = '42501';
  end if;

  select * into paid from public.payments
  where booking_id = target.id and status = 'succeeded'
  order by created_at desc limit 1;
  if found then
    return paid;
  end if;

  if not exists (
    select 1 from public.payment_events where booking_id = target.id and event = 'booking.created'
  ) then
    insert into public.payment_events (booking_id, event, detail, actor, created_at)
    values (
      target.id, 'booking.created',
      jsonb_build_object(
        'code', target.code, 'amount', target.total_amount,
        'guests', target.guest_count, 'start_date', target.start_date
      ),
      uid, target.created_at
    );
  end if;

  loop
    ref := 'TEST-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    exit when not exists (select 1 from public.payments where reference = ref);
  end loop;

  insert into public.payments (booking_id, traveler_id, provider, method, amount, status, reference)
  values (target.id, uid, 'test', pay_method, target.total_amount, 'succeeded', ref)
  returning * into paid;

  -- clock_timestamp rather than now(): now() is fixed for the transaction, and
  -- a log whose steps all share one instant cannot be read in order.
  insert into public.payment_events (booking_id, payment_id, event, detail, actor, created_at) values
    (target.id, paid.id, 'payment.initiated',
       jsonb_build_object('method', pay_method, 'amount', paid.amount, 'currency', paid.currency),
       uid, clock_timestamp()),
    (target.id, paid.id, 'payment.succeeded',
       jsonb_build_object('reference', ref, 'provider', 'test'),
       uid, clock_timestamp()),
    (target.id, paid.id, 'booking.confirmed',
       jsonb_build_object('status', target.status),
       uid, clock_timestamp());

  return paid;
end;
$$;

revoke all on function public.log_checkout_event(text, text, text) from public, anon;
revoke all on function public.record_test_payment(text, text) from public, anon;
grant execute on function public.log_checkout_event(text, text, text) to authenticated;
grant execute on function public.record_test_payment(text, text) to authenticated;
