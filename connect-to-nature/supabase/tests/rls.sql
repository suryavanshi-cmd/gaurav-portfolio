-- ============================================================================
-- Row-level security, exercised rather than assumed.
--
-- Runs as anon and then as a signed-in traveller against the seeded database,
-- and asserts what each of them can and cannot see. Every failure here is a
-- data leak that would otherwise be found in production.
-- ============================================================================

-- A traveller who exists but has booked nothing, and someone else's booking.
insert into auth.users (id, email, raw_user_meta_data)
values ('11111111-1111-4111-a111-111111111111', 'traveller@example.com', '{"role":"traveler"}'::jsonb)
on conflict (id) do nothing;

insert into public.profiles (id, role, full_name, email)
values ('11111111-1111-4111-a111-111111111111', 'traveler', 'Test traveller', 'traveller@example.com')
on conflict (id) do nothing;

-- ─── as an anonymous visitor ────────────────────────────────────────────────
set role anon;
-- Session-scoped rather than transaction-scoped: psql commits between
-- statements, and a local setting would be gone before the next block runs.
\o /dev/null
select set_config('request.jwt.claim.sub', '', false);
\o

do $$
declare
  n integer;
  denied boolean;
begin
  select count(*) into n from public.listings;
  assert n = 12, format('anon should see the 12 published farms, saw %s', n);

  select count(*) into n from public.reviews;
  assert n = 8, format('reviews are public, expected 8, saw %s', n);

  select count(*) into n from public.availability where is_available;
  assert n > 0, 'anon should be able to read open dates';

  -- These three are not merely filtered to nothing for an anonymous visitor:
  -- the grant is not there, so the table cannot be read at all.
  denied := false;
  begin
    perform 1 from public.bookings limit 1;
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'anon was able to read bookings';

  denied := false;
  begin
    perform 1 from public.profiles limit 1;
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'anon was able to read profiles';

  denied := false;
  begin
    perform 1 from public.host_leads limit 1;
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'anon was able to read the farmer lead list';
end $$;

-- A farmer leaving their number is the one write an anonymous visitor may make.
insert into public.host_leads (code, name, phone) values ('CTN-HTEST', 'Anon farmer', '+91 90000 11111');

do $$
declare failed boolean := false;
begin
  begin
    insert into public.bookings (
      listing_id, start_date, end_date, guest_count, guest_name, guest_phone,
      total_amount, farmer_amount, platform_fee
    )
    select id, current_date + 5, current_date + 7, 2, 'Anon', '+91 90000 00000', 1000, 0, 0
    from public.listings limit 1;
  exception when others then
    failed := true;
  end;
  assert failed, 'an anonymous visitor was able to create a booking';
end $$;

reset role;

-- ─── as a signed-in traveller ───────────────────────────────────────────────
-- Someone else's completed booking, stashed in session settings while still
-- superuser so the test can name a row the traveller cannot see. (psql does not
-- substitute its own variables inside a dollar-quoted block, which is why this
-- goes through set_config rather than \gset.)
\o /dev/null
select
  set_config('ctn_test.other_booking', id::text, false),
  set_config('ctn_test.other_listing', listing_id::text, false)
from public.bookings where status = 'completed' limit 1;
\o

set role authenticated;
\o /dev/null
select set_config('request.jwt.claim.sub', '11111111-1111-4111-a111-111111111111', false);
\o

do $$
declare n integer; failed boolean := false;
begin
  select count(*) into n from public.profiles;
  assert n = 1, format('a traveller should see exactly their own profile, saw %s', n);

  select count(*) into n from public.bookings;
  assert n = 0, format('a traveller must not see other people''s bookings, saw %s', n);

  -- A review against somebody else's completed booking is refused by the
  -- policy, not merely filtered out.
  begin
    insert into public.reviews (booking_id, listing_id, traveler_id, rating, comment)
    values (
      current_setting('ctn_test.other_booking')::uuid,
      current_setting('ctn_test.other_listing')::uuid,
      '11111111-1111-4111-a111-111111111111', 5, '{"en":"not mine"}'::jsonb
    );
  exception when others then
    failed := true;
  end;
  assert failed, 'a traveller was able to review a stay that was not theirs';
end $$;

reset role;

-- The hardening migration revokes execute on the trigger functions. The four
-- helpers that policies name must stay callable, or every policy that uses one
-- fails closed and nobody can read their own rows.
set role authenticated;
do $$
declare ok boolean;
begin
  select public.is_admin() into ok;
  assert ok = false, 'is_admin() should be false for a traveller';
  perform public.owns_listing('00000000-0000-0000-0000-000000000000'::uuid);
  perform public.owns_host_profile('00000000-0000-0000-0000-000000000000'::uuid);
  perform public.listing_is_available(
    (select id from public.listings limit 1), current_date + 200, current_date + 202);
end $$;
reset role;

do $$ begin raise notice 'row-level security assertions passed'; end $$;
