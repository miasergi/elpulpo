-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Bonus text answers: allow several valid answers ('a|b|c')         ║
-- ╚══════════════════════════════════════════════════════════════════╝
-- The admin resolves text markets by picking which of the players' answers
-- are valid; they are stored pipe-separated in bonus_markets.correct_text.

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
      (bm.kind = 'text' and lower(trim(bp.answer_text)) in (
        select lower(trim(x)) from unnest(string_to_array(bm.correct_text, '|')) as x
      ))
    )
) bonus on true
where public.is_group_member(gm.group_id);
