-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Scoring: drop the "goal difference" tier. Only exact + result.    ║
-- ╚══════════════════════════════════════════════════════════════════╝
-- A correct (non-exact) prediction now always scores p_result — including
-- draws (which previously fell into the goal-difference tier). The p_diff
-- argument is kept for signature compatibility but ignored.
create or replace function public.prediction_points(
  ph int, pa int, ah int, aa int,
  p_exact int, p_diff int, p_result int
) returns int language sql immutable as $$
  select case
    when ah is null or aa is null then 0
    when ph = ah and pa = aa then p_exact
    when sign(ph - pa) = sign(ah - aa) then p_result
    else 0
  end;
$$;
