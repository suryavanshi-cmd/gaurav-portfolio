-- ============================================================================
-- Triggers and helpers
-- ============================================================================

-- ─── updated_at ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'host_profiles', 'listings', 'bookings'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ─── a profile for every account ────────────────────────────────────────────
-- The portal a person signs up on passes role in the sign-up metadata, so a
-- farmer who signs up on shetkari.* lands with role = 'host' already set.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, phone, email, preferred_language)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'traveler')::user_role,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.phone, new.raw_user_meta_data ->> 'phone'),
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'preferred_language', ''), 'en')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── role helpers ───────────────────────────────────────────────────────────
-- security definer, so a policy on profiles can ask about profiles without the
-- policy re-entering itself.
create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

create or replace function public.owns_host_profile(host uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.host_profiles h
    where h.id = host and h.user_id = auth.uid()
  );
$$;

create or replace function public.owns_listing(listing uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.listings l
    join public.host_profiles h on h.id = l.host_id
    where l.id = listing and h.user_id = auth.uid()
  );
$$;

-- ─── booking codes ──────────────────────────────────────────────────────────
-- CTN-7K2M4Q. Short enough to read out over a phone call, which is how most of
-- these bookings actually get confirmed.
create or replace function public.generate_booking_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ACDEFGHJKLMNPQRTUVWXY34679';
  candidate text;
begin
  loop
    candidate := 'CTN-' || (
      select string_agg(substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1), '')
      from generate_series(1, 6)
    );
    exit when not exists (select 1 from public.bookings where code = candidate);
  end loop;
  return candidate;
end;
$$;

create or replace function public.set_booking_code()
returns trigger
language plpgsql
as $$
begin
  if new.code is null or new.code = '' then
    new.code := public.generate_booking_code();
  end if;
  return new;
end;
$$;

drop trigger if exists set_booking_code on public.bookings;
create trigger set_booking_code before insert on public.bookings
  for each row execute function public.set_booking_code();

-- ─── the platform's cut ─────────────────────────────────────────────────────
-- 8%, and the split is stored on the row rather than recomputed later, so a
-- change of rate never rewrites what a past guest was told.
create or replace function public.split_booking_amount()
returns trigger
language plpgsql
as $$
begin
  if new.platform_fee is null or new.platform_fee = 0 then
    new.platform_fee := round(new.total_amount * 0.08, 2);
  end if;
  new.farmer_amount := new.total_amount - new.platform_fee;
  return new;
end;
$$;

drop trigger if exists split_booking_amount on public.bookings;
create trigger split_booking_amount before insert on public.bookings
  for each row execute function public.split_booking_amount();

-- ─── a payout scheduled with every confirmed booking ────────────────────────
create or replace function public.schedule_payout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  host uuid;
begin
  if new.status = 'confirmed' and (tg_op = 'INSERT' or old.status is distinct from 'confirmed') then
    select l.host_id into host from public.listings l where l.id = new.listing_id;
    if host is not null then
      insert into public.payouts (host_id, booking_id, amount, status)
      values (host, new.id, new.farmer_amount, 'scheduled')
      on conflict (booking_id) do update set amount = excluded.amount;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists schedule_payout on public.bookings;
create trigger schedule_payout after insert or update of status on public.bookings
  for each row execute function public.schedule_payout();

-- ─── ratings ────────────────────────────────────────────────────────────────
create or replace function public.refresh_listing_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.listing_id, old.listing_id);
begin
  update public.listings l
  set rating = coalesce(stats.avg_rating, 0),
      review_count = coalesce(stats.n, 0)
  from (
    select round(avg(rating)::numeric, 2) as avg_rating, count(*) as n
    from public.reviews where listing_id = target
  ) stats
  where l.id = target;
  return null;
end;
$$;

drop trigger if exists refresh_listing_rating on public.reviews;
create trigger refresh_listing_rating after insert or update or delete on public.reviews
  for each row execute function public.refresh_listing_rating();

-- ─── availability ───────────────────────────────────────────────────────────
-- True when every night from check-in to check-out is open and unbooked.
create or replace function public.listing_is_available(listing uuid, from_date date, to_date date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    not exists (
      select 1
      from generate_series(from_date, to_date - 1, interval '1 day') d
      left join public.availability a
        on a.listing_id = listing and a.date = d::date
      where a.id is null or a.is_available = false
    )
    and not exists (
      select 1 from public.bookings b
      where b.listing_id = listing
        and b.status in ('pending', 'confirmed')
        and b.start_date < to_date
        and b.end_date > from_date
    );
$$;

-- Listings open across a window, used by search when a date filter is applied.
create or replace function public.search_available_listings(from_date date, to_date date)
returns setof public.listings
language sql
stable
as $$
  select l.* from public.listings l
  where l.status = 'published'
    and public.listing_is_available(l.id, from_date, to_date);
$$;
