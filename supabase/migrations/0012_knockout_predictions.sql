-- Knockout predictions: draw picks must choose who advances, and correct
-- advancing team earns +1 point before any x2 match multiplier.

alter table public.matches
  add column if not exists winner_team_id uuid references public.teams (id) on delete set null;

alter table public.predictions
  add column if not exists winner_team_id uuid references public.teams (id) on delete set null;

create or replace function public.enforce_prediction_lock()
returns trigger language plpgsql security definer set search_path = public as $$
declare m public.matches;
begin
  select * into m from public.matches where id = new.match_id;
  if m.status <> 'scheduled' or m.kickoff_at <= now() then
    raise exception 'Predictions are locked for this match';
  end if;
  if new.home_score = new.away_score then
    if new.winner_team_id is not null and new.winner_team_id not in (m.home_team_id, m.away_team_id) then
      raise exception 'Knockout winner must be one of the match teams';
    end if;
  else
    new.winner_team_id := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.prediction_advancing_team(
  ph int, pa int,
  home_team_id uuid, away_team_id uuid,
  picked_winner_team_id uuid
) returns uuid language sql immutable as $$
  select case
    when ph > pa then home_team_id
    when ph < pa then away_team_id
    else picked_winner_team_id
  end;
$$;

create or replace function public.match_advancing_team(
  ah int, aa int,
  home_team_id uuid, away_team_id uuid,
  winner_team_id uuid
) returns uuid language sql immutable as $$
  select case
    when ah is null or aa is null then null
    when ah > aa then home_team_id
    when ah < aa then away_team_id
    else winner_team_id
  end;
$$;

create or replace function public.prediction_points(
  ph int, pa int, ah int, aa int,
  p_exact int, p_diff int, p_result int,
  predicted_winner_team_id uuid default null,
  actual_winner_team_id uuid default null,
  home_team_id uuid default null,
  away_team_id uuid default null,
  p_award_advance boolean default false
) returns int language sql immutable as $$
  select case
    when ah is null or aa is null then 0
    else
      (case
        when ph = ah and pa = aa then p_exact
        when sign(ph - pa) = sign(ah - aa) then p_result
        else 0
      end)
      +
      (case
        when p_award_advance
         and public.prediction_advancing_team(ph, pa, home_team_id, away_team_id, predicted_winner_team_id)
             is not null
         and public.prediction_advancing_team(ph, pa, home_team_id, away_team_id, predicted_winner_team_id)
             = public.match_advancing_team(ah, aa, home_team_id, away_team_id, actual_winner_team_id)
        then 1
        else 0
      end)
  end;
$$;

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
    sum(public.prediction_points(
          p.home_score, p.away_score, m.home_score, m.away_score,
          g.pts_exact, g.pts_goal_diff, g.pts_result,
          p.winner_team_id, m.winner_team_id, m.home_team_id, m.away_team_id,
          m.stage !~* 'grupo|group'
        )
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
