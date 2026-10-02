-- Agent Forge: a self-learning, data-grounded agent platform.
--
-- The design rule behind every table here: an answer must be traceable to a
-- row someone actually uploaded. There is no table of "things the model
-- believes" -- only ingested source text, and corrections a human made to it.

create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- Agents. One agent is one collection of knowledge plus the behaviour that
-- reads it. Multiple agents live in one database, isolated by agent_id on
-- every row, which is what makes the multi-agent system a config change
-- rather than a deployment.
-- ---------------------------------------------------------------------------
create table public.agents (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  name              text not null,
  description       text,
  -- Prepended to the grounding contract, never replaces it: an agent can be
  -- told to answer tersely or in Marathi, but not to answer from outside its
  -- own data.
  persona           text,
  -- A chunk must be at least this cosine-similar to the question to be
  -- allowed into the context. Below it the agent refuses before it ever calls
  -- a model: the cheapest and strongest anti-hallucination control there is,
  -- because no evidence means no LLM call, no invented answer, no token cost.
  -- Measured on the fixture corpus in test/pipeline.e2e.test.js: an off-topic
  -- question's best match scores 0.044, a hard paraphrase sharing no content
  -- word with its answer scores 0.274, a direct match 0.537. 0.20 sits in the
  -- gap with room on both sides.
  --
  -- Not 0.35, which is the figure quoted for MiniLM *sentence similarity*.
  -- That is a symmetric task; question-to-passage retrieval is asymmetric and
  -- scores systematically lower, so the symmetric number silently refuses
  -- correct answers. Raise this per agent if a corpus turns out to be noisy.
  min_similarity    real not null default 0.20,
  max_context_chunks int not null default 8,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Documents. content_hash is the dedupe key: re-uploading the same workbook
-- is a no-op rather than a second copy that splits retrieval scores between
-- two identical chunks.
-- ---------------------------------------------------------------------------
create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  agent_id      uuid not null references public.agents(id) on delete cascade,
  title         text not null,
  source_kind   text not null,
  source_ref    text,
  content_hash  text not null,
  bytes         bigint,
  metadata      jsonb not null default '{}'::jsonb,
  chunk_count   int not null default 0,
  created_at    timestamptz not null default now(),
  unique (agent_id, content_hash)
);
create index documents_agent_idx on public.documents (agent_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Chunks: the retrievable unit, and the only thing an answer may quote.
--
-- `locator` carries enough to cite precisely -- {"sheet":"Q3","rows":[14,19]}
-- for a spreadsheet, {"page":7} for a PDF -- so a user can open the source and
-- land on the row that produced the claim.
-- ---------------------------------------------------------------------------
create table public.chunks (
  id             bigserial primary key,
  agent_id       uuid not null references public.agents(id) on delete cascade,
  document_id    uuid not null references public.documents(id) on delete cascade,
  ordinal        int not null,
  text           text not null,
  locator        jsonb not null default '{}'::jsonb,
  token_estimate int,
  embedding      extensions.vector(384),
  -- Learned re-ranking weight, moved by human feedback. Starts neutral at 1.0
  -- and is clamped in reinforce_chunks() so a run of votes can never let one
  -- chunk dominate every query.
  boost          real not null default 1.0,
  hit_count      int not null default 0,
  tsv            tsvector generated always as (to_tsvector('english', text)) stored,
  created_at     timestamptz not null default now()
);
create index chunks_agent_idx on public.chunks (agent_id);
create index chunks_document_idx on public.chunks (document_id);
create index chunks_tsv_idx on public.chunks using gin (tsv);
-- HNSW rather than IVFFlat: IVFFlat needs a training set to build its lists
-- and degrades badly when built on a near-empty table, which is exactly the
-- state every new agent starts in.
create index chunks_embedding_idx on public.chunks
  using hnsw (embedding extensions.vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- Learned facts: the self-learning layer that is *not* just more documents.
--
-- When a human corrects an answer, the correction is stored here and searched
-- alongside the chunks on every later question. A correction that matches the
-- question closely is injected ahead of the source text, so the agent stops
-- repeating a mistake without anyone re-uploading or editing the source file.
-- ---------------------------------------------------------------------------
create table public.learned_facts (
  id                  bigserial primary key,
  agent_id            uuid not null references public.agents(id) on delete cascade,
  question            text,
  answer              text not null,
  kind                text not null default 'correction'
                      check (kind in ('correction', 'fact', 'alias')),
  embedding           extensions.vector(384),
  confidence          real not null default 1.0,
  supersedes_chunk_id bigint references public.chunks(id) on delete set null,
  created_at          timestamptz not null default now()
);
create index learned_facts_agent_idx on public.learned_facts (agent_id);
create index learned_facts_embedding_idx on public.learned_facts
  using hnsw (embedding extensions.vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- Interactions and feedback. Every answer is logged with what it cited and
-- whether it was grounded at all, which turns the refusals into a report:
-- "these are the questions your data cannot answer yet".
-- ---------------------------------------------------------------------------
create table public.interactions (
  id              bigserial primary key,
  agent_id        uuid not null references public.agents(id) on delete cascade,
  question        text not null,
  answer          text,
  grounded        boolean not null default false,
  mode            text,
  cited_chunk_ids bigint[] not null default '{}',
  top_score       real,
  latency_ms      int,
  created_at      timestamptz not null default now()
);
create index interactions_agent_idx on public.interactions (agent_id, created_at desc);
create index interactions_ungrounded_idx on public.interactions (agent_id)
  where not grounded;

create table public.feedback (
  id             bigserial primary key,
  interaction_id bigint references public.interactions(id) on delete cascade,
  agent_id       uuid not null references public.agents(id) on delete cascade,
  verdict        text not null check (verdict in ('up', 'down')),
  correction     text,
  created_at     timestamptz not null default now()
);
create index feedback_agent_idx on public.feedback (agent_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Hybrid retrieval, fused in one round trip.
--
-- Note what this function does NOT do: it ranks, it does not gate. RRF scores
-- by position in the pool, so the nearest of three irrelevant chunks still
-- ranks first. `similarity` is returned alongside the fused score precisely so
-- the caller can admit on absolute evidence and order on fused rank.
--
-- Vector search alone misses exact tokens -- an invoice number, a SKU, a
-- surname -- because an embedding of a rare literal string is noise. Lexical
-- search alone misses paraphrase: "turnaround time" against "how long does it
-- take" shares no term and scores zero. Reciprocal rank fusion needs no score
-- calibration between the two, which matters because ts_rank_cd and cosine
-- distance are not on comparable scales.
-- ---------------------------------------------------------------------------
create or replace function public.hybrid_search(
  p_agent_id        uuid,
  p_query_embedding extensions.vector(384),
  p_query_text      text,
  p_limit           int default 8,
  p_pool            int default 40,
  p_rrf_k           int default 60
)
returns table (
  id            bigint,
  document_id   uuid,
  text          text,
  locator       jsonb,
  similarity    real,
  vector_rank   int,
  lexical_rank  int,
  boost         real,
  score         real
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with v as (
    select c.id,
           row_number() over (order by c.embedding <=> p_query_embedding) as rank,
           (1 - (c.embedding <=> p_query_embedding))::real as similarity
    from public.chunks c
    where c.agent_id = p_agent_id and c.embedding is not null
    order by c.embedding <=> p_query_embedding
    limit p_pool
  ),
  l as (
    select c.id,
           row_number() over (
             order by ts_rank_cd(c.tsv, websearch_to_tsquery('english', p_query_text)) desc, c.id
           ) as rank
    from public.chunks c
    where c.agent_id = p_agent_id
      and coalesce(p_query_text, '') <> ''
      and c.tsv @@ websearch_to_tsquery('english', p_query_text)
    limit p_pool
  ),
  fused as (
    select coalesce(v.id, l.id) as id,
           v.similarity,
           v.rank as vector_rank,
           l.rank as lexical_rank,
           coalesce(1.0 / (p_rrf_k + v.rank), 0) + coalesce(1.0 / (p_rrf_k + l.rank), 0) as rrf
    from v full outer join l on v.id = l.id
  )
  select c.id, c.document_id, c.text, c.locator,
         coalesce(f.similarity, 0)::real,
         f.vector_rank::int, f.lexical_rank::int, c.boost,
         (f.rrf * c.boost)::real as score
  from fused f
  join public.chunks c on c.id = f.id
  order by score desc
  limit p_limit;
$$;

-- Corrections are matched by meaning only: there are few of them, and a
-- correction that fires on the wrong question is worse than one that misses.
create or replace function public.match_learned_facts(
  p_agent_id        uuid,
  p_query_embedding extensions.vector(384),
  p_limit           int default 3
)
returns table (
  id          bigint,
  question    text,
  answer      text,
  kind        text,
  confidence  real,
  similarity  real
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select f.id, f.question, f.answer, f.kind, f.confidence,
         (1 - (f.embedding <=> p_query_embedding))::real as similarity
  from public.learned_facts f
  where f.agent_id = p_agent_id and f.embedding is not null
  order by f.embedding <=> p_query_embedding
  limit p_limit;
$$;

-- Feedback moves the weight of whatever the answer cited. Clamped to
-- [0.5, 2.0]: a chunk that many people liked should surface earlier, but it
-- must never outrank a chunk that actually matches a different question.
create or replace function public.reinforce_chunks(
  p_chunk_ids bigint[],
  p_delta     real
)
returns void
language sql
volatile
security invoker
set search_path = public
as $$
  update public.chunks
  set boost = least(2.0, greatest(0.5, boost * (1 + p_delta))),
      hit_count = hit_count + 1
  where id = any(p_chunk_ids);
$$;

-- ---------------------------------------------------------------------------
-- RLS on with no permissive policy: every table is unreachable with an anon or
-- publishable key. All access goes through the server with the service role
-- key, which is the only place the grounding rules can be enforced. A browser
-- that could read chunks directly could also read another tenant's data.
-- ---------------------------------------------------------------------------
alter table public.agents        enable row level security;
alter table public.documents     enable row level security;
alter table public.chunks        enable row level security;
alter table public.learned_facts enable row level security;
alter table public.interactions  enable row level security;
alter table public.feedback      enable row level security;

-- ---------------------------------------------------------------------------
-- Routing: which agent should answer this?
--
-- An agent's claim on a question is not a description someone wrote when they
-- created it -- descriptions go stale the moment a new file is ingested. It is
-- the best evidence the agent actually holds, scored at query time. Routing is
-- therefore self-maintaining: teach an agent a new subject and it starts
-- winning questions about it, with nothing to update.
--
-- The HAVING clause is what makes this a filter rather than a ranking: an agent
-- with no chunk above its own gate is not returned at all, so a question no one
-- holds data on produces an empty set and the team refuses.
-- ---------------------------------------------------------------------------
create or replace function public.route_agents(
  p_query_embedding extensions.vector(384),
  p_limit           int default 5
)
returns table (
  agent_id        uuid,
  slug            text,
  name            text,
  min_similarity  real,
  best_similarity real,
  supporting      int
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with scored as (
    select c.agent_id,
           (1 - (c.embedding <=> p_query_embedding))::real as similarity
    from public.chunks c
    where c.embedding is not null
  )
  select a.id, a.slug, a.name, a.min_similarity,
         max(s.similarity)::real as best_similarity,
         -- One lucky match is a weaker claim than a body of supporting material.
         count(*) filter (where s.similarity >= a.min_similarity)::int as supporting
  from scored s
  join public.agents a on a.id = s.agent_id
  group by a.id, a.slug, a.name, a.min_similarity
  having max(s.similarity) >= a.min_similarity
  order by best_similarity desc
  limit p_limit;
$$;
