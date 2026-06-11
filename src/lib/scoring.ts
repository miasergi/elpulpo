export interface ScoringRules {
  exact: number;
  /** Deprecated: the goal-difference tier was removed (migration 0010). */
  diff?: number;
  result: number;
}

/** x2 when the match involves a double-points team (España) or the player's
 *  underdog pick. TS mirror of the multiplier in group_standings (0005). */
export function matchMultiplier(
  home: { id: string; double_points?: boolean } | null,
  away: { id: string; double_points?: boolean } | null,
  underdogTeamId: string | null
): number {
  const doubles =
    home?.double_points ||
    away?.double_points ||
    (underdogTeamId != null && (home?.id === underdogTeamId || away?.id === underdogTeamId));
  return doubles ? 2 : 1;
}

/** TS mirror of the SQL prediction_points() function. Two tiers: exact, or
 *  correct result (1X2, includes draws). Goal-difference tier removed (0010). */
export function predictionPoints(
  ph: number,
  pa: number,
  ah: number | null,
  aa: number | null,
  pts: { exact: number; result: number }
): number {
  if (ah == null || aa == null) return 0;
  if (ph === ah && pa === aa) return pts.exact;
  if (Math.sign(ph - pa) === Math.sign(ah - aa)) return pts.result;
  return 0;
}
