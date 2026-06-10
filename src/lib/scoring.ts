/** TS mirror of the SQL prediction_points() function (migration 0001). */
export function predictionPoints(
  ph: number,
  pa: number,
  ah: number | null,
  aa: number | null,
  pts: { exact: number; diff: number; result: number }
): number {
  if (ah == null || aa == null) return 0;
  if (ph === ah && pa === aa) return pts.exact;
  const sameResult = Math.sign(ph - pa) === Math.sign(ah - aa);
  if (sameResult && ph - pa === ah - aa) return pts.diff;
  if (sameResult) return pts.result;
  return 0;
}
