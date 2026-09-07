-- What the migrations and the seed are supposed to have produced. Run by
-- scripts/check-sql.sh against a throwaway database.

do $$
declare
  n integer;
  ok boolean;
begin
  select count(*) into n from public.regions;
  assert n >= 2, format('expected at least 2 vibhags, found %s', n);

  select count(*) into n from public.listings where status = 'published';
  assert n = 12, format('expected 12 published farms, found %s', n);

  select count(*) into n from public.activities;
  assert n >= 30, format('expected the activity catalogue, found %s', n);

  select count(*) into n from public.trip_packages;
  assert n = 4, format('expected 4 packages, found %s', n);

  -- Every package points at a farm that exists.
  select count(*) into n from public.trip_packages p
  left join public.listings l on l.id = p.listing_id where l.id is null;
  assert n = 0, format('%s packages point at a missing farm', n);

  -- Every farm has activities and an open calendar.
  select count(*) into n from public.listings l
  where not exists (select 1 from public.listing_activities la where la.listing_id = l.id);
  assert n = 0, format('%s farms have no activities', n);

  select count(*) into n from public.listings l
  where not exists (select 1 from public.availability a where a.listing_id = l.id and a.is_available);
  assert n = 0, format('%s farms have no open dates', n);

  -- Reviews exist and are attached to completed bookings, which is the only
  -- shape the policy allows.
  select count(*) into n from public.reviews r
  join public.bookings b on b.id = r.booking_id
  where b.status <> 'completed';
  assert n = 0, format('%s reviews hang off a booking that did not complete', n);

  -- The booking triggers: a code and an 8% split, both set by the database.
  insert into public.bookings (
    listing_id, start_date, end_date, guest_count, guest_name, guest_phone, total_amount, farmer_amount, platform_fee
  )
  select id, current_date + 30, current_date + 32, 2, 'Assertion guest', '+91 90000 00000', 10000, 0, 0
  from public.listings where slug = 'amrai-wadi-pawas';

  select code is not null and platform_fee = 800 and farmer_amount = 9200 into ok
  from public.bookings where guest_name = 'Assertion guest';
  assert ok, 'booking code or 92/8 split not applied by the trigger';

  -- A payout is scheduled the moment a booking is confirmed.
  update public.bookings set status = 'confirmed' where guest_name = 'Assertion guest';
  select count(*) into n from public.payouts p
  join public.bookings b on b.id = p.booking_id where b.guest_name = 'Assertion guest';
  assert n = 1, 'confirming a booking did not schedule a payout';

  -- Availability says no once those dates are taken.
  select public.listing_is_available(
    (select id from public.listings where slug = 'amrai-wadi-pawas'),
    current_date + 30, current_date + 32
  ) into ok;
  assert ok = false, 'listing_is_available ignored an existing booking';

  -- And yes for a window nobody has booked.
  select public.listing_is_available(
    (select id from public.listings where slug = 'amrai-wadi-pawas'),
    current_date + 100, current_date + 102
  ) into ok;
  assert ok = true, 'listing_is_available refused an open window';

  -- Row-level security is on for every table that holds a person's data.
  select count(*) into n from pg_tables t
  where t.schemaname = 'public'
    and t.tablename in ('profiles','listings','bookings','reviews','payouts','availability','host_leads','wishlists')
    and not exists (
      select 1 from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
      where c.relname = t.tablename and ns.nspname = 'public' and c.relrowsecurity
    );
  assert n = 0, format('%s tables are missing row-level security', n);

  raise notice 'all assertions passed';
end $$;
