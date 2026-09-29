-- ============================================================================
-- A farmer's payout details are not part of their public profile
--
-- host_profiles is publicly readable — it has to be, a farm page shows the
-- family's name and their story. But the same row carries the UPI id, the bank
-- IFSC, the account's last four digits, the phone number and the admin's
-- verification note, and a policy that admits the row admits all of it. The
-- public listing query selected host_profiles(*), so every one of those fields
-- travelled into the HTML of a public page, and anyone holding the publishable
-- key could read them straight out of PostgREST.
--
-- Row-level security is the wrong tool here: the row should be visible, some of
-- its columns should not. That is what column privileges are for. Selecting a
-- column nobody granted is an error, not an empty value, so this cannot fail
-- open the way a forgotten `.select()` list can.
--
-- The application keeps working because nothing outside the admin screen ever
-- displayed these: the host's own dashboard shows bookings and earnings, and
-- onboarding writes payout details without reading them back. The admin screen
-- reads them through the service role, which column privileges do not apply to.
--
-- APPLY THIS AFTER DEPLOYING THE CODE THAT NAMES ITS COLUMNS. `select *` on a
-- table you hold only column privileges on is an error, not a filtered result,
-- so a deployment still asking for host_profiles(*) starts failing the moment
-- this runs. The order is: deploy, then migrate. The reverse order breaks every
-- farm page until the deploy catches up.
-- ============================================================================

revoke select on public.host_profiles from anon, authenticated;

grant select (
  id, user_id, farm_name, host_name, bio, region_id, district, village,
  land_acres, languages, verification_status, verified_at, hosting_since,
  created_at, updated_at
) on public.host_profiles to anon, authenticated;

-- Insert and update are unchanged: a farmer still writes their own phone and
-- payout details through onboarding, and the owner-or-admin policy decides
-- which row they may write.

comment on column public.host_profiles.payout_upi is
  'Not selectable by anon or authenticated — see 20260919120000_host_private_columns.sql. Read it with the service role.';
comment on column public.host_profiles.phone is
  'Not selectable by anon or authenticated. The farmer''s number reaches a guest after a booking is confirmed, not from a public page.';
