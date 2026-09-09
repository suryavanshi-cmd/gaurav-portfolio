-- Reel Analyzer — core schema.
--
-- A reel is the thing the user gave us (a link to their own Instagram reel, or
-- an uploaded .mp4). A job tracks the one long-running request that fetches,
-- transcribes and analyses it. Transcripts and analyses are the two artefacts
-- that request produces, each stored once per reel.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  credits_remaining int not null default 5,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

do $$ begin
  create type job_status as enum ('queued','fetching','transcribing','analyzing','done','failed');
exception
  when duplicate_object then null;
end $$;

create table if not exists reels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  source text not null check (source in ('link','upload')),
  instagram_url text,
  caption text,
  author_handle text,
  like_count bigint,
  comment_count bigint,
  view_count bigint,
  duration_seconds numeric,
  video_storage_path text,
  thumbnail_url text,
  created_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null references reels(id) on delete cascade,
  status job_status not null default 'queued',
  error_message text,
  started_at timestamptz,
  finished_at timestamptz
);

create table if not exists transcripts (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null references reels(id) on delete cascade,
  full_text text not null,
  segments jsonb,
  language text
);

create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null references reels(id) on delete cascade,
  summary text not null,
  hook_analysis text,
  structure_breakdown jsonb,
  tone text,
  target_audience text,
  virality_factors jsonb,
  actionable_takeaways jsonb,
  raw_model_output jsonb,
  model_version text,
  created_at timestamptz not null default now()
);

-- One transcript and one analysis per reel; re-running a job overwrites rather
-- than accumulating, which is what upsert-on-conflict below relies on.
create unique index if not exists transcripts_reel_id_key on transcripts (reel_id);
create unique index if not exists analyses_reel_id_key on analyses (reel_id);

create index if not exists reels_user_id_created_at_idx on reels (user_id, created_at desc);
create index if not exists jobs_reel_id_idx on jobs (reel_id);
create index if not exists jobs_status_idx on jobs (status);

alter table profiles enable row level security;
alter table reels enable row level security;
alter table jobs enable row level security;
alter table transcripts enable row level security;
alter table analyses enable row level security;

create policy "own profile" on profiles for select using (auth.uid() = id);

-- `for all` covers INSERT too, and an INSERT is checked by WITH CHECK rather
-- than USING — without the second clause every client-side insert would fail.
create policy "own reels" on reels for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own jobs" on jobs for select using (
  exists (select 1 from reels where reels.id = jobs.reel_id and reels.user_id = auth.uid())
);
create policy "own transcripts" on transcripts for select using (
  exists (select 1 from reels where reels.id = transcripts.reel_id and reels.user_id = auth.uid())
);
create policy "own analyses" on analyses for select using (
  exists (select 1 from reels where reels.id = analyses.reel_id and reels.user_id = auth.uid())
);

-- Writes to jobs/transcripts/analyses happen with the service-role key from the
-- processing route, which bypasses RLS entirely. No write policies by design.
