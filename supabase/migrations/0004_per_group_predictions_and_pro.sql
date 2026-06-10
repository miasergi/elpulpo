-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Per-group predictions (Biwenger-style active group) + Pro tier    ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────
-- 1. PROFILES: pro flag + active group
-- ─────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_pro boolean not null default false,
  add column if not exists active_group_id uuid references public.groups (id) on delete set null;

-- Users may update their own profile (RLS), but: is_pro is admin-only and
-- active_group_id must point to a group they belong to.
create or replace function public.enforce_profile_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'authenticated' then
    if new.is_pro is distinct from old.is_pro then
      raise exception 'is_pro can only be changed by an admin';
    end if;
    if new.active_group_id is not null
       and new.active_group_id is distinct from old.active_group_id
       and not public.is_group_member(new.active_group_id) then
      raise exception 'Not a member of that group';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.enforce_profile_guard();

-- ─────────────────────────────────────────────────────────────────────
-- 2. PREDICTIONS: one per (user, match, group)
-- ─────────────────────────────────────────────────────────────────────
alter table public.predictions
  add column if not exists group_id uuid references public.groups (id) on delete cascade;

-- Data migration below must bypass the kickoff locks.
alter table public.predictions disable trigger predictions_lock_check;
alter table public.predictions disable trigger predictions_delete_lock_check;

-- Drop unique (user_id, match_id) BEFORE replicating: a user in N groups
-- gets N rows for the same match.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.predictions'::regclass and contype = 'u'
  loop
    execute format('alter table public.predictions drop constraint %I', c);
  end loop;
end $$;

-- Replicate every existing (global) prediction into each of the user's groups.
insert into public.predictions (user_id, match_id, group_id, home_score, away_score, created_at, updated_at)
select p.user_id, p.match_id, gm.group_id, p.home_score, p.away_score, p.created_at, p.updated_at
from public.predictions p
join public.group_members gm on gm.user_id = p.user_id
where p.group_id is null;

-- Predictions from users without any group have nowhere to live.
delete from public.predictions where group_id is null;

alter table public.predictions alter column group_id set not null;

alter table public.predictions
  add constraint predictions_user_match_group_key unique (user_id, match_id, group_id);
create index if not exists predictions_group_idx on public.predictions (group_id);

alter table public.predictions enable trigger predictions_lock_check;
alter table public.predictions enable trigger predictions_delete_lock_check;

-- ─────────────────────────────────────────────────────────────────────
-- 3. BONUS PREDICTIONS: one per (user, market, group)
-- ─────────────────────────────────────────────────────────────────────
alter table public.bonus_predictions
  add column if not exists group_id uuid references public.groups (id) on delete cascade;

alter table public.bonus_predictions disable trigger bonus_predictions_lock_check;

do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.bonus_predictions'::regclass and contype = 'u'
  loop
    execute format('alter table public.bonus_predictions drop constraint %I', c);
  end loop;
end $$;

insert into public.bonus_predictions (user_id, market_id, group_id, team_id, answer_text, created_at, updated_at)
select bp.user_id, bp.market_id, gm.group_id, bp.team_id, bp.answer_text, bp.created_at, bp.updated_at
from public.bonus_predictions bp
join public.group_members gm on gm.user_id = bp.user_id
where bp.group_id is null;

delete from public.bonus_predictions where group_id is null;

alter table public.bonus_predictions alter column group_id set not null;

alter table public.bonus_predictions
  add constraint bonus_predictions_user_market_group_key unique (user_id, market_id, group_id);
create index if not exists bonus_predictions_group_idx on public.bonus_predictions (group_id);

alter table public.bonus_predictions enable trigger bonus_predictions_lock_check;

-- ─────────────────────────────────────────────────────────────────────
-- 4. RLS: visibility scoped to the prediction's group
-- ─────────────────────────────────────────────────────────────────────
drop policy if exists "predictions_select" on public.predictions;
create policy "predictions_select" on public.predictions for select using (
  user_id = auth.uid()
  or (
    public.is_group_member(group_id)
    and exists (
      select 1 from public.matches m
      where m.id = predictions.match_id
        and (m.status <> 'scheduled' or m.kickoff_at <= now())
    )
  )
);

drop policy if exists "predictions_insert_own" on public.predictions;
create policy "predictions_insert_own" on public.predictions for insert
  with check (user_id = auth.uid() and public.is_group_member(group_id));

drop policy if exists "predictions_update_own" on public.predictions;
create policy "predictions_update_own" on public.predictions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_group_member(group_id));

drop policy if exists "bonus_pred_select" on public.bonus_predictions;
create policy "bonus_pred_select" on public.bonus_predictions for select using (
  user_id = auth.uid()
  or (
    public.is_group_member(group_id)
    and exists (
      select 1 from public.bonus_markets bm
      where bm.id = bonus_predictions.market_id
        and bm.closes_at is not null and bm.closes_at <= now()
    )
  )
);

drop policy if exists "bonus_pred_write_own" on public.bonus_predictions;
create policy "bonus_pred_write_own" on public.bonus_predictions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_group_member(group_id));

-- ─────────────────────────────────────────────────────────────────────
-- 5. STANDINGS: count only the predictions made *in* each group
-- ─────────────────────────────────────────────────────────────────────
create or replace view public.group_standings
with (security_invoker = off) as
select
  gm.group_id,
  gm.user_id,
  coalesce(match_pts.points, 0) + coalesce(bonus.bonus_pts, 0) as total_points,
  coalesce(match_pts.points, 0)        as match_points,
  coalesce(bonus.bonus_pts, 0)         as bonus_points,
  coalesce(match_pts.played, 0)        as played,
  coalesce(match_pts.exacts, 0)        as exacts,
  coalesce(match_pts.results, 0)       as correct_results
from public.group_members gm
join public.groups g on g.id = gm.group_id
left join lateral (
  select
    sum(public.prediction_points(p.home_score, p.away_score, m.home_score, m.away_score,
                                 g.pts_exact, g.pts_goal_diff, g.pts_result)) as points,
    count(p.id)                                                              as played,
    count(*) filter (where p.home_score = m.home_score
                       and p.away_score = m.away_score)                      as exacts,
    count(*) filter (where sign(p.home_score - p.away_score)
                         = sign(m.home_score - m.away_score))                as results
  from public.matches m
  join public.predictions p
    on p.match_id = m.id and p.user_id = gm.user_id and p.group_id = gm.group_id
  where m.competition_id = g.competition_id
    and m.status in ('finished', 'live')
    and m.home_score is not null and m.away_score is not null
) match_pts on true
left join lateral (
  select sum(bm.points) as bonus_pts
  from public.bonus_predictions bp
  join public.bonus_markets bm on bm.id = bp.market_id
  where bp.user_id = gm.user_id
    and bp.group_id = gm.group_id
    and bm.competition_id = g.competition_id
    and bm.resolved
    and (
      (bm.kind = 'team' and bp.team_id = bm.correct_team_id) or
      (bm.kind = 'text' and lower(trim(bp.answer_text)) = lower(trim(bm.correct_text)))
    )
) bonus on true
where public.is_group_member(gm.group_id);

-- ─────────────────────────────────────────────────────────────────────
-- 6. Who-has-predicted RPC, now per group
-- ─────────────────────────────────────────────────────────────────────
drop function if exists public.predicted_user_ids(uuid[]);
create or replace function public.predicted_user_ids(gid uuid, mids uuid[])
returns table (match_id uuid, user_id uuid)
language sql security definer stable set search_path = public as $$
  select p.match_id, p.user_id
  from public.predictions p
  where p.group_id = gid
    and p.match_id = any(mids)
    and public.is_group_member(gid);
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 7. Joining/creating a group makes it the active one
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.join_group_by_code(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  select id into gid from public.groups
  where upper(invite_code) = upper(trim(code));

  if gid is null then
    raise exception 'Código de invitación no válido' using errcode = 'P0002';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (gid, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;

  update public.profiles set active_group_id = gid where id = auth.uid();

  return gid;
end;
$$;

create or replace function public.create_group(
  p_name text,
  p_competition_id uuid,
  p_invite_code text,
  p_description text default null,
  p_color text default '#7c3aed',
  p_icon text default '🐙',
  p_pts_exact int default 5,
  p_pts_goal_diff int default 3,
  p_pts_result int default 2
) returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  insert into public.groups (name, competition_id, invite_code, description, color, icon,
                             owner_id, pts_exact, pts_goal_diff, pts_result)
  values (p_name, p_competition_id, upper(p_invite_code), p_description, p_color, p_icon,
          auth.uid(), p_pts_exact, p_pts_goal_diff, p_pts_result)
  returning id into gid;

  insert into public.group_members (group_id, user_id, role)
  values (gid, auth.uid(), 'owner');

  update public.profiles set active_group_id = gid where id = auth.uid();

  return gid;
end;
$$;

-- Leaving (or being kicked from) the active group clears the selection.
create or replace function public.clear_active_group()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set active_group_id = null
  where id = old.user_id and active_group_id = old.group_id;
  return old;
end;
$$;

drop trigger if exists group_members_clear_active on public.group_members;
create trigger group_members_clear_active
  after delete on public.group_members
  for each row execute function public.clear_active_group();

-- ─────────────────────────────────────────────────────────────────────
-- 8. Backfill: existing users get their oldest group as active
-- ─────────────────────────────────────────────────────────────────────
update public.profiles pr
set active_group_id = (
  select gm.group_id from public.group_members gm
  where gm.user_id = pr.id
  order by gm.joined_at
  limit 1
)
where pr.active_group_id is null;
