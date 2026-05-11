-- Project Fyndra: initial schema
create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  intent text,
  schema_json jsonb,
  summary text,
  flow_data jsonb,
  status text not null default 'planning'
    check (status in ('planning','scraping','synthesizing','ready','failed')),
  created_at timestamptz not null default now()
);

create table if not exists stickers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  entity_key text,
  content jsonb not null,
  value_history jsonb not null default '{}'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  source_meta jsonb not null,
  sentiment_score float,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists stickers_session_idx on stickers(session_id);
create index if not exists stickers_session_entity_idx on stickers(session_id, entity_key);

create table if not exists scrape_jobs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  url text not null,
  tool text not null,
  attempt int not null default 1,
  status text not null default 'pending'
    check (status in ('pending','success','failed')),
  error text,
  raw_md text,
  created_at timestamptz not null default now()
);
create index if not exists scrape_jobs_session_idx on scrape_jobs(session_id);
create index if not exists scrape_jobs_session_status_idx on scrape_jobs(session_id, status);

create table if not exists artifacts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  kind text not null check (kind in ('summary','matrix','chart','flow')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists artifacts_session_kind_idx on artifacts(session_id, kind);

-- Keep updated_at fresh on stickers
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists stickers_set_updated_at on stickers;
create trigger stickers_set_updated_at before update on stickers
  for each row execute function set_updated_at();

-- Realtime publication
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table stickers;
alter publication supabase_realtime add table artifacts;
alter publication supabase_realtime add table scrape_jobs;

-- Permissive RLS for single-user MVP. Replace policies once auth lands.
alter table sessions enable row level security;
alter table stickers enable row level security;
alter table scrape_jobs enable row level security;
alter table artifacts enable row level security;

drop policy if exists "mvp_all" on sessions;
drop policy if exists "mvp_all" on stickers;
drop policy if exists "mvp_all" on scrape_jobs;
drop policy if exists "mvp_all" on artifacts;

create policy "mvp_all" on sessions for all using (true) with check (true);
create policy "mvp_all" on stickers for all using (true) with check (true);
create policy "mvp_all" on scrape_jobs for all using (true) with check (true);
create policy "mvp_all" on artifacts for all using (true) with check (true);
