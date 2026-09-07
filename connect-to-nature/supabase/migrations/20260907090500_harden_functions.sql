-- ============================================================================
-- Hardening, from the Supabase database linter
--
-- Three findings, none of them theoretical:
--
--   1. Several functions had a mutable search_path. A function without one
--      resolves unqualified names through whatever the caller's search_path
--      says, which is how a definer function gets tricked into calling
--      somebody else's table.
--
--   2. citext was installed into the public schema, where PostgREST exposes it.
--      The only thing using it was profiles.email, and Supabase already
--      normalises the addresses it writes there, so the column becomes text and
--      the extension goes away.
--
--   3. Every SECURITY DEFINER function was callable over /rest/v1/rpc by anyone
--      with the publishable key. The trigger functions have no business being
--      called directly — triggers do not check the caller's EXECUTE — so their
--      grants are revoked. The four helpers that policies name are left
--      executable on purpose: a policy expression runs as the querying role, so
--      revoking those would lock everyone out of their own rows.
-- ============================================================================

-- ─── 1. pin the search_path ─────────────────────────────────────────────────
alter function public.set_updated_at() set search_path = public;
alter function public.generate_booking_code() set search_path = public;
alter function public.set_booking_code() set search_path = public;
alter function public.split_booking_amount() set search_path = public;
alter function public.search_available_listings(date, date) set search_path = public;

-- ─── 2. no extension in the exposed schema ──────────────────────────────────
do $$
begin
  if exists (
    select 1 from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'citext' and n.nspname = 'public'
  ) then
    alter table public.profiles alter column email type text;
    drop extension citext;
  end if;
end $$;

-- ─── 3. take the trigger functions off the public API ───────────────────────
-- PostgreSQL grants EXECUTE on a new function to PUBLIC, so revoking from anon
-- and authenticated alone changes nothing: they still hold it through PUBLIC.
-- Every one of these is revoked from PUBLIC first and then granted back only
-- where something actually needs it.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.schedule_payout() from public, anon, authenticated;
revoke execute on function public.refresh_listing_rating() from public, anon, authenticated;
revoke execute on function public.set_review_author() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.set_booking_code() from public, anon, authenticated;
revoke execute on function public.split_booking_amount() from public, anon, authenticated;
revoke execute on function public.generate_booking_code() from public, anon, authenticated;

-- Triggers do not check the caller's EXECUTE, so the functions above keep
-- working for every insert and update while being uncallable over
-- /rest/v1/rpc.

-- current_user_role is only ever called from inside is_admin(), which is a
-- definer function and so does not need the caller to hold execute on it.
revoke execute on function public.current_user_role() from public, anon, authenticated;

-- These four stay callable on purpose, and are granted rather than left to
-- PUBLIC so the intent is written down:
--   is_admin(), owns_listing(), owns_host_profile() are named by policies, and
--     a policy expression evaluates as the querying role — revoke these and
--     every policy that uses one fails closed;
--   listing_is_available() is called as an RPC by the booking route and is
--     useful to a visitor checking dates.
-- All four answer only about the caller's own session or about a published
-- farm, so being reachable over /rest/v1/rpc discloses nothing.
revoke execute on function public.is_admin() from public;
revoke execute on function public.owns_listing(uuid) from public;
revoke execute on function public.owns_host_profile(uuid) from public;
revoke execute on function public.listing_is_available(uuid, date, date) from public;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.owns_listing(uuid) to anon, authenticated;
grant execute on function public.owns_host_profile(uuid) to anon, authenticated;
grant execute on function public.listing_is_available(uuid, date, date) to anon, authenticated;
