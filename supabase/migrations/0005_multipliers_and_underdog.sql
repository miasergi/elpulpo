-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Score multipliers: España always x2 + per-group underdog pick x2  ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────
-- 1. TEAM FLAGS
--    double_points: matches of this team always score double (España).
--    is_underdog:   eligible for the "tapado" pick.
-- ─────────────────────────────────────────────────────────────────────
alter table public.teams
  add column if not exists double_points boolean not null default false,
  add column if not exists is_underdog boolean not null default false;

update public.teams set double_points = (code = 'ESP');
update public.teams set is_underdog =
  (code in ('CUW','HAI','CPV','JOR','UZB','NZL','COD','IRQ','QAT','KSA'));

-- ─────────────────────────────────────────────────────────────────────
-- 2. UNDERDOG PICK — one per (member, group), editable until kickoff
--    of the tournament's first match.
-- ─────────────────────────────────────────────────────────────────────
alter table public.group_members
  add column if not exists underdog_team_id uuid references public.teams (id) on delete set null;

create or replace function public.set_underdog_pick(gid uuid, tid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare comp uuid;
begin
  if not public.is_group_member(gid) then
    raise exception 'No eres miembro de este grupo';
  end if;

  select competition_id into comp from public.groups where id = gid;

  if exists (
    select 1 from public.matches
    where competition_id = comp and kickoff_at <= now()
  ) then
    raise exception 'El torneo ya ha empezado: el tapado está cerrado';
  end if;

  if tid is not null and not exists (
    select 1 from public.teams where id = tid and is_underdog
  ) then
    raise exception 'Ese equipo no está entre las selecciones tapadas';
  end if;

  update public.group_members
  set underdog_team_id = tid
  where group_id = gid and user_id = auth.uid();
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 3. STANDINGS with multipliers: x2 if the match involves a
--    double_points team (España) or the member's underdog pick.
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
                                 g.pts_exact, g.pts_goal_diff, g.pts_result)
        * case when coalesce(ht.double_points, false)
                or coalesce(awt.double_points, false)
                or m.home_team_id = gm.underdog_team_id
                or m.away_team_id = gm.underdog_team_id
          then 2 else 1 end)                                               as points,
    count(p.id)                                                            as played,
    count(*) filter (where p.home_score = m.home_score
                       and p.away_score = m.away_score)                    as exacts,
    count(*) filter (where sign(p.home_score - p.away_score)
                         = sign(m.home_score - m.away_score))              as results
  from public.matches m
  join public.predictions p
    on p.match_id = m.id and p.user_id = gm.user_id and p.group_id = gm.group_id
  left join public.teams ht  on ht.id  = m.home_team_id
  left join public.teams awt on awt.id = m.away_team_id
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
