-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Official squads (synced from the FIFA API)                        ║
-- ╚══════════════════════════════════════════════════════════════════╝
create table if not exists public.players (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams (id) on delete cascade,
  external_id text not null,            -- FIFA IdPlayer
  name        text not null,
  number      int,
  position    text,                     -- Portero | Defensa | Centrocampista | Delantero
  birth_date  date,
  photo_url   text,
  updated_at  timestamptz not null default now(),
  unique (team_id, external_id)
);

create index if not exists players_team_idx on public.players (team_id);

alter table public.players enable row level security;
drop policy if exists "players_select" on public.players;
create policy "players_select" on public.players for select using (true);
-- writes via service role only
