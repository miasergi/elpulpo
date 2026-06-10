-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Standings view, helper RPCs, and Row Level Security policies       ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────
-- Do two users share at least one group?
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.shares_group(target uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from public.group_members a
    join public.group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = target
  );
$$;

-- ─────────────────────────────────────────────────────────────────────
-- LIVE STANDINGS  — computed across all members (definer), but only
-- rows for groups the caller belongs to are returned.
-- Counts finished + live matches (live = provisional points).
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
    on p.match_id = m.id and p.user_id = gm.user_id
  where m.competition_id = g.competition_id
    and m.status in ('finished', 'live')
    and m.home_score is not null and m.away_score is not null
) match_pts on true
left join lateral (
  select sum(bm.points) as bonus_pts
  from public.bonus_predictions bp
  join public.bonus_markets bm on bm.id = bp.market_id
  where bp.user_id = gm.user_id
    and bm.competition_id = g.competition_id
    and bm.resolved
    and (
      (bm.kind = 'team' and bp.team_id = bm.correct_team_id) or
      (bm.kind = 'text' and lower(trim(bp.answer_text)) = lower(trim(bm.correct_text)))
    )
) bonus on true
where public.is_group_member(gm.group_id);

-- ─────────────────────────────────────────────────────────────────────
-- RPC: join a group by invite code (bypasses broad SELECT on groups)
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

  return gid;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- RPC: create a group + add owner as member, atomically
-- ─────────────────────────────────────────────────────────────────────
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

  return gid;
end;
$$;

-- ═════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═════════════════════════════════════════════════════════════════════
alter table public.profiles          enable row level security;
alter table public.competitions      enable row level security;
alter table public.teams             enable row level security;
alter table public.matches           enable row level security;
alter table public.groups            enable row level security;
alter table public.group_members     enable row level security;
alter table public.predictions       enable row level security;
alter table public.bonus_markets     enable row level security;
alter table public.bonus_predictions enable row level security;
alter table public.messages          enable row level security;
alter table public.push_subscriptions enable row level security;

-- PROFILES: world-readable, self-writable
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid());

-- REFERENCE DATA: world-readable (writes via service role only)
create policy "competitions_select" on public.competitions for select using (true);
create policy "teams_select" on public.teams for select using (true);
create policy "matches_select" on public.matches for select using (true);
create policy "bonus_markets_select" on public.bonus_markets for select using (true);

-- GROUPS
create policy "groups_select" on public.groups for select
  using (is_public or public.is_group_member(id) or owner_id = auth.uid());
create policy "groups_update_admin" on public.groups for update
  using (public.is_group_admin(id));
create policy "groups_delete_owner" on public.groups for delete
  using (owner_id = auth.uid());
-- inserts go through create_group() RPC (security definer)

-- GROUP MEMBERS
create policy "members_select" on public.group_members for select
  using (public.is_group_member(group_id));
create policy "members_leave" on public.group_members for delete
  using (user_id = auth.uid() or public.is_group_admin(group_id));
create policy "members_admin_update" on public.group_members for update
  using (public.is_group_admin(group_id));

-- PREDICTIONS: own always; others only once the match is locked
create policy "predictions_select" on public.predictions for select using (
  user_id = auth.uid()
  or (
    public.shares_group(user_id)
    and exists (
      select 1 from public.matches m
      where m.id = predictions.match_id
        and (m.status <> 'scheduled' or m.kickoff_at <= now())
    )
  )
);
create policy "predictions_insert_own" on public.predictions for insert
  with check (user_id = auth.uid());
create policy "predictions_update_own" on public.predictions for update
  using (user_id = auth.uid());
create policy "predictions_delete_own" on public.predictions for delete
  using (user_id = auth.uid());

-- BONUS PREDICTIONS: own always; others once the market closes
create policy "bonus_pred_select" on public.bonus_predictions for select using (
  user_id = auth.uid()
  or (
    public.shares_group(user_id)
    and exists (
      select 1 from public.bonus_markets bm
      where bm.id = bonus_predictions.market_id
        and bm.closes_at is not null and bm.closes_at <= now()
    )
  )
);
create policy "bonus_pred_write_own" on public.bonus_predictions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- MESSAGES: members only
create policy "messages_select" on public.messages for select
  using (public.is_group_member(group_id));
create policy "messages_insert" on public.messages for insert
  with check (public.is_group_member(group_id) and user_id = auth.uid());
create policy "messages_delete_own" on public.messages for delete
  using (user_id = auth.uid() or public.is_group_admin(group_id));

-- PUSH SUBSCRIPTIONS: own only
create policy "push_own" on public.push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Realtime publication for live UX
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.predictions;
