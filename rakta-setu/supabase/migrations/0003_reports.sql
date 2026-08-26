-- ═══════════════════════════════════════════════════════════════════════════
--  रक्त-सेतू · report storage
--  0003 — patients, reports, deliveries, questions, audit
-- ═══════════════════════════════════════════════════════════════════════════
--
--  Mirrors the local SQLite schema in src/db.js so the app can run either
--  against a file on the lab PC or against Postgres when deployed.
--
--  Serverless hosting is why this exists: Vercel's filesystem is ephemeral, so
--  a SQLite file there would lose every report on each deploy and would not be
--  shared between concurrent function instances.
--
--  These tables hold patient health data. Unlike the billing tables there are
--  NO end-user policies at all — patients are not Supabase Auth users, they
--  authenticate with a capability token plus a PIN at the application layer.
--  Only the service role can read or write any of this.

create extension if not exists pgcrypto;

-- ── patients ───────────────────────────────────────────────────────────────
create table if not exists public.patients (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  phone       text,
  age         integer,
  sex         text check (sex in ('male', 'female') or sex is null),
  created_at  timestamptz not null default now()
);

create index if not exists idx_patients_phone on public.patients (phone);

-- ── reports ────────────────────────────────────────────────────────────────
-- `lab_id` ties a report to the account that uploaded it, so one deployment
-- can serve several labs without them seeing each other's patients.
create table if not exists public.reports (
  id                  uuid primary key default gen_random_uuid(),
  token               text not null unique,
  patient_id          uuid not null references public.patients (id) on delete cascade,
  lab_id              uuid references public.users (id) on delete set null,
  lab_no              text,
  source_file         text,
  source_hash         text unique,
  collected_at        text,
  reported_at         text,
  doctor              text,
  measurements        jsonb not null,
  interpretation      jsonb not null,
  pin_hash            text,
  status              text not null default 'pending',
  expires_at          timestamptz,
  first_opened_at     timestamptz,
  open_count          integer not null default 0,
  created_at          timestamptz not null default now()
);

create index if not exists idx_reports_lab     on public.reports (lab_id, created_at desc);
create index if not exists idx_reports_status  on public.reports (status);
create index if not exists idx_reports_created on public.reports (created_at desc);

-- ── deliveries ─────────────────────────────────────────────────────────────
create table if not exists public.deliveries (
  id                  uuid primary key default gen_random_uuid(),
  report_id           uuid not null references public.reports (id) on delete cascade,
  driver              text not null,
  to_phone            text,
  status              text not null,
  provider_message_id text,
  error               text,
  attempt             integer not null default 1,
  created_at          timestamptz not null default now()
);

create index if not exists idx_deliveries_report on public.deliveries (report_id);

-- ── questions ──────────────────────────────────────────────────────────────
create table if not exists public.questions (
  id         uuid primary key default gen_random_uuid(),
  report_id  uuid not null references public.reports (id) on delete cascade,
  question   text not null,
  answer     text not null,
  source     text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_questions_report on public.questions (report_id, created_at);

-- ── audit ──────────────────────────────────────────────────────────────────
create table if not exists public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  report_id  uuid references public.reports (id) on delete cascade,
  event      text not null,
  meta       jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_report on public.audit_log (report_id, created_at desc);

-- ── lab API keys ───────────────────────────────────────────────────────────
-- The watcher runs on the lab's own PC and pushes finished reports to the
-- deployment. It cannot hold a user's browser JWT, so it authenticates with a
-- long-lived key. Only the SHA-256 hash is stored — a leaked database row must
-- not yield a usable credential.
create table if not exists public.lab_api_keys (
  id           uuid primary key default gen_random_uuid(),
  lab_id       uuid not null references public.users (id) on delete cascade,
  name         text,
  key_hash     text not null unique,
  key_prefix   text not null,
  last_used_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists idx_lab_keys_hash on public.lab_api_keys (key_hash) where revoked_at is null;

-- ── RLS: service role only ─────────────────────────────────────────────────
alter table public.patients     enable row level security;
alter table public.reports      enable row level security;
alter table public.deliveries   enable row level security;
alter table public.questions    enable row level security;
alter table public.audit_log    enable row level security;
alter table public.lab_api_keys enable row level security;
-- No policies are defined on purpose. RLS enabled with no policy means only
-- the service role reaches these rows; a leaked anon key sees nothing.

-- ═══════════════════════════════════════════════════════════════════════════
--  fn_create_report — patient + report in one transaction
--
--  A crash between the two inserts would otherwise leave a report the patient
--  could open but staff could not see. Returns null on a duplicate source
--  hash so re-processing the same analyzer file is a no-op, matching the
--  SQLite path's behaviour.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.fn_create_report(
  p_token          text,
  p_patient        jsonb,
  p_measurements   jsonb,
  p_interpretation jsonb,
  p_pin_hash       text default null,
  p_lab_id         uuid default null,
  p_lab_no         text default null,
  p_source_file    text default null,
  p_source_hash    text default null,
  p_collected_at   text default null,
  p_reported_at    text default null,
  p_doctor         text default null,
  p_expires_at     timestamptz default null
)
returns table (report_id uuid, patient_id uuid, duplicate boolean, existing_token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient uuid;
  v_report  uuid;
  v_existing record;
begin
  if p_source_hash is not null then
    select r.id, r.token into v_existing from reports r where r.source_hash = p_source_hash;
    if found then
      return query select v_existing.id, null::uuid, true, v_existing.token;
      return;
    end if;
  end if;

  insert into patients (name, phone, age, sex)
  values (
    nullif(p_patient->>'name', ''),
    nullif(p_patient->>'phone', ''),
    nullif(p_patient->>'age', '')::integer,
    nullif(p_patient->>'sex', '')
  )
  returning id into v_patient;

  insert into reports (
    token, patient_id, lab_id, lab_no, source_file, source_hash,
    collected_at, reported_at, doctor, measurements, interpretation,
    pin_hash, status, expires_at
  ) values (
    p_token, v_patient, p_lab_id, p_lab_no, p_source_file, p_source_hash,
    p_collected_at, p_reported_at, p_doctor, p_measurements, p_interpretation,
    p_pin_hash, 'pending', p_expires_at
  )
  returning id into v_report;

  insert into audit_log (report_id, event, meta)
  values (v_report, 'report.created',
          jsonb_build_object('measurements', jsonb_array_length(p_measurements)));

  return query select v_report, v_patient, false, null::text;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
--  fn_get_report_by_token — one round trip for the patient page
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.fn_get_report_by_token(p_token text)
returns table (
  id uuid, token text, lab_no text, source_file text,
  collected_at text, reported_at text, doctor text, status text,
  expires_at timestamptz, open_count integer, first_opened_at timestamptz,
  created_at timestamptz, pin_hash text,
  measurements jsonb, interpretation jsonb,
  patient_id uuid, patient_name text, patient_phone text,
  patient_age integer, patient_sex text
)
language sql
security definer
set search_path = public
as $$
  select r.id, r.token, r.lab_no, r.source_file,
         r.collected_at, r.reported_at, r.doctor, r.status,
         r.expires_at, r.open_count, r.first_opened_at,
         r.created_at, r.pin_hash,
         r.measurements, r.interpretation,
         p.id, p.name, p.phone, p.age, p.sex
    from reports r
    join patients p on p.id = r.patient_id
   where r.token = p_token;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
--  fn_record_report_open — bump the counter, advance the status
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.fn_record_report_open(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update reports
     set open_count      = reports.open_count + 1,
         first_opened_at = coalesce(reports.first_opened_at, now()),
         status          = case when reports.status = 'sent' then 'opened' else reports.status end
   where id = p_report_id;

  insert into audit_log (report_id, event) values (p_report_id, 'report.opened');
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
--  fn_verify_lab_key — resolve a watcher's API key to a lab id
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.fn_verify_lab_key(p_key_hash text)
returns table (lab_id uuid, key_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
begin
  select k.id, k.lab_id into v
    from lab_api_keys k
   where k.key_hash = p_key_hash and k.revoked_at is null;

  if not found then
    return;
  end if;

  update lab_api_keys set last_used_at = now() where id = v.id;
  return query select v.lab_id, v.id;
end;
$$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'fn_create_report(text,jsonb,jsonb,jsonb,text,uuid,text,text,text,text,text,text,timestamptz)',
    'fn_get_report_by_token(text)',
    'fn_record_report_open(uuid)',
    'fn_verify_lab_key(text)'
  ]
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', fn);
    execute format('grant execute on function public.%s to service_role', fn);
  end loop;
end;
$$;
