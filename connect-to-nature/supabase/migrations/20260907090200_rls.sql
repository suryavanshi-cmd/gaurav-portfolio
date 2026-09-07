-- ============================================================================
-- Row-level security
--
-- Both portals talk to PostgREST with the anon key and the signed-in user's
-- JWT, so these policies — not the application — decide what a traveler, a
-- host or an admin can see. The service-role key is used in exactly two
-- places on the server (admin approvals, the payment webhook) and bypasses
-- everything below by design.
-- ============================================================================

alter table public.profiles           enable row level security;
alter table public.regions            enable row level security;
alter table public.activities         enable row level security;
alter table public.host_profiles      enable row level security;
alter table public.listings           enable row level security;
alter table public.listing_photos     enable row level security;
alter table public.listing_activities enable row level security;
alter table public.availability       enable row level security;
alter table public.trip_packages      enable row level security;
alter table public.custom_itineraries enable row level security;
alter table public.bookings           enable row level security;
alter table public.payouts            enable row level security;
alter table public.reviews            enable row level security;
alter table public.wishlists          enable row level security;
alter table public.host_leads         enable row level security;

-- ─── profiles ───────────────────────────────────────────────────────────────
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_self_write on public.profiles;
create policy profiles_self_write on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ─── reference data: readable by anyone, written by admin ───────────────────
drop policy if exists regions_public_read on public.regions;
create policy regions_public_read on public.regions
  for select using (is_active or public.is_admin());

drop policy if exists regions_admin_write on public.regions;
create policy regions_admin_write on public.regions
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists activities_public_read on public.activities;
create policy activities_public_read on public.activities for select using (true);

drop policy if exists activities_admin_write on public.activities;
create policy activities_admin_write on public.activities
  for all using (public.is_admin()) with check (public.is_admin());

-- ─── host profiles ──────────────────────────────────────────────────────────
drop policy if exists host_profiles_read on public.host_profiles;
create policy host_profiles_read on public.host_profiles
  for select using (
    verification_status = 'approved'
    or user_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists host_profiles_insert on public.host_profiles;
create policy host_profiles_insert on public.host_profiles
  for insert with check (user_id = auth.uid());

drop policy if exists host_profiles_update on public.host_profiles;
create policy host_profiles_update on public.host_profiles
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ─── listings ───────────────────────────────────────────────────────────────
drop policy if exists listings_public_read on public.listings;
create policy listings_public_read on public.listings
  for select using (
    status = 'published'
    or public.owns_listing(id)
    or public.is_admin()
  );

drop policy if exists listings_host_insert on public.listings;
create policy listings_host_insert on public.listings
  for insert with check (public.owns_host_profile(host_id));

drop policy if exists listings_host_update on public.listings;
create policy listings_host_update on public.listings
  for update using (public.owns_listing(id) or public.is_admin())
  with check (public.owns_listing(id) or public.is_admin());

drop policy if exists listings_host_delete on public.listings;
create policy listings_host_delete on public.listings
  for delete using (public.owns_listing(id) or public.is_admin());

-- ─── photos and activities hang off the listing's visibility ────────────────
drop policy if exists listing_photos_read on public.listing_photos;
create policy listing_photos_read on public.listing_photos
  for select using (
    exists (select 1 from public.listings l where l.id = listing_id and l.status = 'published')
    or public.owns_listing(listing_id)
    or public.is_admin()
  );

drop policy if exists listing_photos_write on public.listing_photos;
create policy listing_photos_write on public.listing_photos
  for all using (public.owns_listing(listing_id) or public.is_admin())
  with check (public.owns_listing(listing_id) or public.is_admin());

drop policy if exists listing_activities_read on public.listing_activities;
create policy listing_activities_read on public.listing_activities
  for select using (
    exists (select 1 from public.listings l where l.id = listing_id and l.status = 'published')
    or public.owns_listing(listing_id)
    or public.is_admin()
  );

drop policy if exists listing_activities_write on public.listing_activities;
create policy listing_activities_write on public.listing_activities
  for all using (public.owns_listing(listing_id) or public.is_admin())
  with check (public.owns_listing(listing_id) or public.is_admin());

-- ─── availability ───────────────────────────────────────────────────────────
drop policy if exists availability_read on public.availability;
create policy availability_read on public.availability
  for select using (
    exists (select 1 from public.listings l where l.id = listing_id and l.status = 'published')
    or public.owns_listing(listing_id)
    or public.is_admin()
  );

drop policy if exists availability_write on public.availability;
create policy availability_write on public.availability
  for all using (public.owns_listing(listing_id) or public.is_admin())
  with check (public.owns_listing(listing_id) or public.is_admin());

-- ─── packages ───────────────────────────────────────────────────────────────
drop policy if exists packages_public_read on public.trip_packages;
create policy packages_public_read on public.trip_packages
  for select using (status = 'published' or public.is_admin());

drop policy if exists packages_admin_write on public.trip_packages;
create policy packages_admin_write on public.trip_packages
  for all using (public.is_admin()) with check (public.is_admin());

-- ─── itineraries ────────────────────────────────────────────────────────────
-- A planner result is saved before sign-in as an anonymous row (traveler_id
-- null); once the guest signs in to book, the checkout claims it.
drop policy if exists itineraries_read on public.custom_itineraries;
create policy itineraries_read on public.custom_itineraries
  for select using (traveler_id = auth.uid() or traveler_id is null or public.is_admin());

drop policy if exists itineraries_insert on public.custom_itineraries;
create policy itineraries_insert on public.custom_itineraries
  for insert with check (traveler_id = auth.uid() or traveler_id is null);

drop policy if exists itineraries_update on public.custom_itineraries;
create policy itineraries_update on public.custom_itineraries
  for update using (traveler_id = auth.uid() or traveler_id is null)
  with check (traveler_id = auth.uid());

-- ─── bookings ───────────────────────────────────────────────────────────────
-- Three ways to see a booking: you made it, you are the farm it is for, or you
-- are an admin.
drop policy if exists bookings_read on public.bookings;
create policy bookings_read on public.bookings
  for select using (
    traveler_id = auth.uid()
    or public.owns_listing(listing_id)
    or public.is_admin()
  );

drop policy if exists bookings_insert on public.bookings;
create policy bookings_insert on public.bookings
  for insert with check (traveler_id = auth.uid());

drop policy if exists bookings_update on public.bookings;
create policy bookings_update on public.bookings
  for update using (
    traveler_id = auth.uid()
    or public.owns_listing(listing_id)
    or public.is_admin()
  )
  with check (
    traveler_id = auth.uid()
    or public.owns_listing(listing_id)
    or public.is_admin()
  );

-- ─── payouts: the host's own money, and admin ───────────────────────────────
drop policy if exists payouts_read on public.payouts;
create policy payouts_read on public.payouts
  for select using (public.owns_host_profile(host_id) or public.is_admin());

drop policy if exists payouts_admin_write on public.payouts;
create policy payouts_admin_write on public.payouts
  for all using (public.is_admin()) with check (public.is_admin());

-- ─── reviews ────────────────────────────────────────────────────────────────
drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews for select using (true);

-- Verified by construction: the booking must be yours and must have completed.
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews
  for insert with check (
    traveler_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.traveler_id = auth.uid()
        and b.status = 'completed'
        and b.listing_id = reviews.listing_id
    )
  );

drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews
  for update using (traveler_id = auth.uid() or public.is_admin())
  with check (traveler_id = auth.uid() or public.is_admin());

-- ─── wishlists ──────────────────────────────────────────────────────────────
drop policy if exists wishlists_own on public.wishlists;
create policy wishlists_own on public.wishlists
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── host leads ─────────────────────────────────────────────────────────────
-- A farmer can leave their number without an account; only staff can read the
-- list back.
drop policy if exists host_leads_insert on public.host_leads;
create policy host_leads_insert on public.host_leads for insert with check (true);

drop policy if exists host_leads_admin_read on public.host_leads;
create policy host_leads_admin_read on public.host_leads
  for select using (public.is_admin());

-- ─── grants ─────────────────────────────────────────────────────────────────
-- Policies decide which rows; grants decide which verbs, and which tables an
-- anonymous visitor can name at all. A Supabase project grants new tables to
-- anon and authenticated by default, so the state is reset here first: nothing
-- is reachable until this file says it is. Two locks on the same door, and the
-- outer one does not depend on a policy being written correctly.
-- Named tables, not "all tables in schema public": this migration may be
-- applied to a project that already has tables of its own, and revoking their
-- grants from under them would take a working application offline.
revoke all on
  public.profiles, public.regions, public.activities, public.host_profiles,
  public.listings, public.listing_photos, public.listing_activities,
  public.availability, public.trip_packages, public.custom_itineraries,
  public.bookings, public.payouts, public.reviews, public.wishlists,
  public.host_leads
from anon, authenticated;

grant usage on schema public to anon, authenticated;

-- Public catalogue: the farm pages a traveller browses before signing in.
grant select on
  public.regions, public.activities, public.host_profiles, public.listings,
  public.listing_photos, public.listing_activities, public.availability,
  public.trip_packages, public.reviews
to anon, authenticated;

-- Signed in: your own rows, filtered further by the policies above.
grant select on public.profiles, public.bookings, public.payouts,
  public.custom_itineraries, public.wishlists
to authenticated;

grant insert, update on public.profiles, public.host_profiles, public.listings,
  public.listing_photos, public.listing_activities, public.availability,
  public.bookings, public.reviews to authenticated;

grant delete on public.listing_photos, public.listing_activities,
  public.availability, public.listings to authenticated;

grant insert, delete on public.wishlists to authenticated;

-- A planner result can be saved before signing in, and a farmer can leave a
-- phone number without an account. Neither can be read back by the anonymous
-- session that wrote it: there is no select grant on host_leads for anon.
grant insert on public.custom_itineraries to anon, authenticated;
grant insert on public.host_leads to anon, authenticated;
