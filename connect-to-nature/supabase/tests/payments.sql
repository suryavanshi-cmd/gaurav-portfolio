-- ============================================================================
-- The payment ledger, exercised rather than assumed.
--
-- What matters most here is what the two functions refuse: someone else's
-- booking, a booking waiting on a real gateway, a second payment for the same
-- booking, an event name that is not on the list, and any direct write to
-- either table.
-- ============================================================================

-- Two travellers, and three bookings: a test booking of the first traveller's,
-- a booking of theirs waiting on a real gateway, and the second traveller's
-- test booking.
insert into auth.users (id, email) values
  ('22222222-2222-4222-a222-222222222222', 'payer@example.com'),
  ('33333333-3333-4333-a333-333333333333', 'someone-else@example.com')
on conflict (id) do nothing;

insert into public.profiles (id, role, full_name, email) values
  ('22222222-2222-4222-a222-222222222222', 'traveler', 'Payer', 'payer@example.com'),
  ('33333333-3333-4333-a333-333333333333', 'traveler', 'Someone else', 'someone-else@example.com')
on conflict (id) do nothing;

insert into public.bookings (
  code, traveler_id, listing_id, start_date, end_date, guest_count, guest_name, guest_phone,
  total_amount, farmer_amount, platform_fee, status, payment_status
)
select v.code, v.traveler::uuid, (select id from public.listings order by slug limit 1),
  current_date + 30, current_date + 32, 2, 'Test', '+91 90000 22222',
  4800, 0, 0, v.status::booking_status, v.payment::payment_status
from (values
  ('CTN-PAYT01', '22222222-2222-4222-a222-222222222222', 'confirmed', 'demo'),
  ('CTN-PAYT02', '22222222-2222-4222-a222-222222222222', 'pending', 'unpaid'),
  ('CTN-PAYT03', '33333333-3333-4333-a333-333333333333', 'confirmed', 'demo')
) as v(code, traveler, status, payment);

-- ─── anon ───────────────────────────────────────────────────────────────────
set role anon;
\o /dev/null
select set_config('request.jwt.claim.sub', '', false);
\o
do $$
declare denied boolean;
begin
  denied := false;
  begin perform 1 from public.payments limit 1;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'anon was able to read payments';

  denied := false;
  begin perform 1 from public.payment_events limit 1;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'anon was able to read the payment log';

  denied := false;
  begin perform public.record_test_payment('CTN-PAYT01', 'upi');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'anon was able to record a payment';
end $$;
reset role;

-- ─── the paying traveller ───────────────────────────────────────────────────
set role authenticated;
\o /dev/null
select set_config('request.jwt.claim.sub', '22222222-2222-4222-a222-222222222222', false);
\o
do $$
declare
  first_ref text;
  again_ref text;
  n integer;
  events text[];
  failed text;
begin
  perform public.log_checkout_event('CTN-PAYT01', 'checkout.opened');
  perform public.log_checkout_event('CTN-PAYT01', 'checkout.method_selected', 'upi');

  select reference into first_ref from public.record_test_payment('CTN-PAYT01', 'upi');
  assert first_ref like 'TEST-%', format('unexpected reference %s', first_ref);

  -- Paying twice returns the first payment rather than taking a second.
  select reference into again_ref from public.record_test_payment('CTN-PAYT01', 'card');
  assert again_ref = first_ref, 'a second call took a second payment';

  select count(*) into n from public.payments;
  assert n = 1, format('traveller should see exactly their one payment, saw %s', n);

  select array_agg(e.event order by e.created_at, e.id) into events
  from public.payment_events e join public.bookings b on b.id = e.booking_id
  where b.code = 'CTN-PAYT01';
  assert events = array['booking.created', 'checkout.opened', 'checkout.method_selected',
                        'payment.initiated', 'payment.succeeded', 'booking.confirmed'],
    format('unexpected log: %s', events);

  -- The method is the only detail a guest can put in the log.
  select count(*) into n from public.payment_events
  where event = 'checkout.method_selected' and detail = '{"method":"upi"}'::jsonb;
  assert n = 1, 'method was not logged as expected';

  failed := null;
  begin perform public.record_test_payment('CTN-PAYT02', 'upi');
  exception when others then failed := sqlerrm; end;
  assert failed = 'not_a_test_booking',
    format('a booking waiting on a real gateway was marked paid (%s)', failed);

  failed := null;
  begin perform public.record_test_payment('CTN-PAYT03', 'upi');
  exception when others then failed := sqlerrm; end;
  assert failed = 'booking_not_found', format('paid for someone else''s booking (%s)', failed);

  failed := null;
  begin perform public.log_checkout_event('CTN-PAYT01', 'payment.succeeded');
  exception when others then failed := sqlerrm; end;
  assert failed = 'unknown_event', format('a guest wrote a payment event directly (%s)', failed);

  failed := null;
  begin
    insert into public.payments (booking_id, provider, amount, status, reference)
    select id, 'test', 1, 'succeeded', 'FORGED' from public.bookings where code = 'CTN-PAYT02';
  exception when insufficient_privilege then failed := 'denied'; end;
  assert failed = 'denied', 'a guest inserted a payment row directly';

  failed := null;
  begin
    update public.payments set amount = 0;
  exception when insufficient_privilege then failed := 'denied'; end;
  assert failed = 'denied', 'a guest edited a payment row';
end $$;
reset role;

-- ─── the other traveller sees none of it ────────────────────────────────────
set role authenticated;
\o /dev/null
select set_config('request.jwt.claim.sub', '33333333-3333-4333-a333-333333333333', false);
\o
do $$
declare n integer;
begin
  select count(*) into n from public.payments;
  assert n = 0, format('another traveller could see %s payments', n);
  select count(*) into n from public.payment_events;
  assert n = 0, format('another traveller could see %s log entries', n);
end $$;
reset role;

do $$ begin raise notice 'payment ledger assertions passed'; end $$;
