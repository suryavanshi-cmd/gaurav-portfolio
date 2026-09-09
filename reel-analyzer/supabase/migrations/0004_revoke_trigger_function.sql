-- handle_new_user is a trigger function, but being SECURITY DEFINER and living
-- in `public` it is also exposed at /rest/v1/rpc/handle_new_user. Calling it
-- directly would fail for want of a NEW record — it should not be reachable at
-- all. The trigger itself runs as the table owner and is unaffected.
--
-- Flagged by the Supabase database linter:
-- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

revoke all on function public.handle_new_user() from public, anon, authenticated;
