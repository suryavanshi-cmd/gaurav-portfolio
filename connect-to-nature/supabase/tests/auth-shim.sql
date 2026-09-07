-- ============================================================================
-- A minimal stand-in for the parts of Supabase the migrations depend on.
--
-- Applied only when checking the SQL against a plain PostgreSQL server — the
-- script in scripts/check-sql.sh, and the same step in CI. A real Supabase
-- project already has all of this and must never have this file applied to it.
-- ============================================================================

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon');
$$;

do $$ begin
  create role anon;
exception when duplicate_object then null; end $$;

do $$ begin
  create role authenticated;
exception when duplicate_object then null; end $$;

do $$ begin
  create role service_role;
exception when duplicate_object then null; end $$;
