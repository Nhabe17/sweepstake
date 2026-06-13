-- World Cup Sweepstake — Supabase/Postgres schema.
-- Run this in the Supabase SQL editor (or via the CLI) before seeding.
--
-- Design notes:
--  * Primary keys are TEXT (e.g. 'p-yiannis', 't-bra') so seed data is deterministic and
--    idempotent to re-seed. This intentionally differs from the original uuid spec.
--  * Public (anon) clients may READ everything. They have NO write policy, so all writes
--    must go through the server using the service-role key (Next.js server actions),
--    which bypasses RLS. This matches the "no admin gate for MVP" decision while still
--    keeping the browser unable to mutate data directly.

create table if not exists players (
  id           text primary key,
  name         text not null,
  display_code text not null,
  email        text,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists teams (
  id              text primary key,
  name            text not null,
  country_code    text,
  group_letter    text not null,
  pot             integer,
  owner_player_id text references players(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists matches (
  id                   text primary key,
  external_id          text,
  group_letter         text,
  stage                text not null,
  home_team_id         text references teams(id),
  away_team_id         text references teams(id),
  kickoff_at           timestamptz not null,
  status               text not null,
  home_score           integer,
  away_score           integer,
  home_pens            integer,
  away_pens            integer,
  api_home_score       integer,
  api_away_score       integer,
  override_home_score  integer,
  override_away_score  integer,
  override_home_pens   integer,
  override_away_pens   integer,
  has_manual_override  boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- One row per setting key. The app stores everything under key = 'app'.
create table if not exists settings (
  id         text primary key,
  key        text unique not null,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- Optional: audit trail for future real-API syncs.
create table if not exists sync_logs (
  id         text primary key,
  provider   text,
  sync_type  text,
  status     text,
  message    text,
  created_at timestamptz not null default now()
);

-- Row Level Security: public read, no public write.
alter table players  enable row level security;
alter table teams    enable row level security;
alter table matches  enable row level security;
alter table settings enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'players' and policyname = 'public_read') then
    create policy public_read on players  for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'teams' and policyname = 'public_read') then
    create policy public_read on teams    for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'matches' and policyname = 'public_read') then
    create policy public_read on matches  for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'settings' and policyname = 'public_read') then
    create policy public_read on settings for select using (true);
  end if;
end $$;
