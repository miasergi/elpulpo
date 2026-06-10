-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  El Pulpo — Football predictions with friends                      ║
-- ║  Initial schema: profiles, competitions, teams, matches,           ║
-- ║  groups, members, predictions, bonus markets, chat, push.          ║
-- ╚══════════════════════════════════════════════════════════════════╝

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────
-- PROFILES  (1:1 with auth.users)
-- ─────────────────────────────────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text unique not null,
  display_name  text not null,
  avatar_url    text,
  favorite_team text,
  created_at    timestamptz not null default now()
);

-- Auto-create a profile row when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  base_username := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'username',
             split_part(new.email, '@', 1)),
    '[^a-z0-9_]', '', 'g'));
  if base_username = '' then base_username := 'pulpo'; end if;
  final_username := base_username;
  while exists (select 1 from public.profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'display_name',
             new.raw_user_meta_data->>'full_name',
             final_username),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────
-- COMPETITIONS  (World Cup 2026, LaLiga, Champions, ...)
-- ─────────────────────────────────────────────────────────────────────
create table public.competitions (
  id          uuid primary key default gen_random_uuid(),
  external_id int unique,                 -- API-Football league id
  slug        text unique not null,
  name        text not null,
  season      int not null,
  logo_url    text,
  type        text not null default 'cup',  -- 'cup' | 'league'
  start_date  date,
  end_date    date,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────
-- TEAMS
-- ─────────────────────────────────────────────────────────────────────
create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  external_id int unique,                 -- API-Football team id
  name        text not null,
  short_name  text,
  code        text,                       -- 3-letter (ESP, FRA)
  flag_url    text,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────
-- MATCHES
-- ─────────────────────────────────────────────────────────────────────
create type match_status as enum ('scheduled', 'live', 'finished', 'postponed', 'cancelled');

create table public.matches (
  id             uuid primary key default gen_random_uuid(),
  external_id    int unique,              -- API-Football fixture id
  competition_id uuid not null references public.competitions (id) on delete cascade,
  home_team_id   uuid references public.teams (id),
  away_team_id   uuid references public.teams (id),
  kickoff_at     timestamptz not null,
  status         match_status not null default 'scheduled',
  minute         int,                     -- live clock
  home_score     int,
  away_score     int,
  stage          text,                    -- 'Group A', 'Round of 16', 'Final'...
  round          text,
  venue          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index matches_competition_kickoff_idx on public.matches (competition_id, kickoff_at);
create index matches_status_idx on public.matches (status);

-- Predictions lock at kickoff.
create or replace function public.match_is_locked(m public.matches)
returns boolean language sql immutable as $$
  select m.status <> 'scheduled' or m.kickoff_at <= now();
$$;

-- ─────────────────────────────────────────────────────────────────────
-- GROUPS  (a "porra" of friends)
-- ─────────────────────────────────────────────────────────────────────
create table public.groups (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  description    text,
  invite_code    text unique not null,
  owner_id       uuid not null references public.profiles (id) on delete cascade,
  competition_id uuid not null references public.competitions (id),
  color          text not null default '#7c3aed',
  icon           text not null default '🐙',
  is_public      boolean not null default false,
  -- Scoring rules (Kicktipp-style)
  pts_exact      int not null default 5,   -- exact scoreline
  pts_goal_diff  int not null default 3,   -- correct goal difference (not exact)
  pts_result     int not null default 2,   -- correct 1X2 tendency only
  created_at     timestamptz not null default now()
);

create table public.group_members (
  group_id  uuid not null references public.groups (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      text not null default 'member',   -- 'owner' | 'admin' | 'member'
  nickname  text,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_members_user_idx on public.group_members (user_id);

-- Helper: is the current user a member of a group?
create or replace function public.is_group_member(gid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

create or replace function public.is_group_admin(gid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid() and role in ('owner','admin')
  );
$$;

-- ─────────────────────────────────────────────────────────────────────
-- PREDICTIONS  (one per user per match, shared across all their groups)
-- ─────────────────────────────────────────────────────────────────────
create table public.predictions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  match_id   uuid not null references public.matches (id) on delete cascade,
  home_score int not null check (home_score >= 0 and home_score <= 99),
  away_score int not null check (away_score >= 0 and away_score <= 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);

create index predictions_match_idx on public.predictions (match_id);

-- Reject inserts/updates after the match is locked (defence in depth; UI also enforces).
create or replace function public.enforce_prediction_lock()
returns trigger language plpgsql security definer set search_path = public as $$
declare m public.matches;
begin
  select * into m from public.matches where id = new.match_id;
  if m.status <> 'scheduled' or m.kickoff_at <= now() then
    raise exception 'Predictions are locked for this match';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger predictions_lock_check
  before insert or update on public.predictions
  for each row execute function public.enforce_prediction_lock();

-- Points earned by a prediction under a given group's scoring rules.
create or replace function public.prediction_points(
  ph int, pa int, ah int, aa int,
  p_exact int, p_diff int, p_result int
) returns int language sql immutable as $$
  select case
    when ah is null or aa is null then 0
    when ph = ah and pa = aa then p_exact
    when sign(ph - pa) = sign(ah - aa) and (ph - pa) = (ah - aa) then p_diff
    when sign(ph - pa) = sign(ah - aa) then p_result
    else 0
  end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- BONUS MARKETS  (champion, top scorer, ...) — resolved at tournament end
-- ─────────────────────────────────────────────────────────────────────
create table public.bonus_markets (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id) on delete cascade,
  key            text not null,           -- 'champion' | 'top_scorer' | 'finalist'
  label          text not null,
  kind           text not null default 'team',  -- 'team' | 'text'
  points         int not null default 10,
  closes_at      timestamptz,
  resolved       boolean not null default false,
  correct_team_id uuid references public.teams (id),
  correct_text   text,
  created_at     timestamptz not null default now(),
  unique (competition_id, key)
);

create table public.bonus_predictions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  market_id  uuid not null references public.bonus_markets (id) on delete cascade,
  team_id    uuid references public.teams (id),
  answer_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, market_id)
);

-- ─────────────────────────────────────────────────────────────────────
-- CHAT
-- ─────────────────────────────────────────────────────────────────────
create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_group_idx on public.messages (group_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────
-- PUSH SUBSCRIPTIONS
-- ─────────────────────────────────────────────────────────────────────
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
