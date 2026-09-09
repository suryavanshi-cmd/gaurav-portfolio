#!/usr/bin/env bash
#
# Applies the migrations to a throwaway PostgreSQL server, in order, failing on
# the first error. A broken migration is only ever caught by a real server —
# tsc and next build have no opinion about SQL.
#
# The migrations reference Supabase-managed schemas (auth, storage) and the
# supabase_realtime publication, none of which exist on a bare Postgres. Those
# are stubbed below so the rest of the DDL — tables, constraints, indexes,
# policies, functions — is genuinely exercised.

set -euo pipefail

cd "$(dirname "$0")/.."

psql -v ON_ERROR_STOP=1 <<'SQL'
create extension if not exists pgcrypto;

-- Supabase ships these roles; a bare server does not, and the grants in
-- 0002 reference them by name.
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin; exception when duplicate_object then null; end $$;

-- Stand-ins for what Supabase provides.
create schema if not exists auth;
create schema if not exists storage;

create table if not exists auth.users (
  id uuid primary key,
  email text
);

create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;

create table if not exists storage.buckets (
  id text primary key,
  name text,
  public boolean,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text,
  name text
);
alter table storage.objects enable row level security;

create or replace function storage.foldername(name text) returns text[]
  language sql immutable as $$ select string_to_array(name, '/') $$;

drop publication if exists supabase_realtime;
create publication supabase_realtime;
SQL

for migration in supabase/migrations/*.sql; do
  echo "→ $migration"
  psql -v ON_ERROR_STOP=1 -f "$migration"
done

echo "all migrations applied"
