import { createClient } from "@/lib/supabase/server";
import { predictionPoints, matchMultiplier, awardsAdvanceBonus } from "@/lib/scoring";

export interface PlayerStats {
  played: number;        // finished matches the user predicted
  exacts: number;        // exact scoreline hits
  results: number;       // correct 1X2 (includes exacts)
  goalDiffs: number;     // correct goal difference (not exact)
  accuracy: number;      // results / played (0..1)
  points: number;        // using default 5/3/2 scoring
  bestStreak: number;    // longest run of correct results (chronological)
  currentStreak: number; // ongoing run of correct results
}

const DEFAULTS = { exact: 5, result: 2 };

/** Aggregate stats for a player in one group, across finished matches they predicted. */
export async function getPlayerStats(userId: string, groupId: string | null): Promise<PlayerStats> {
  if (!groupId) {
    return { played: 0, exacts: 0, results: 0, goalDiffs: 0, accuracy: 0, points: 0, bestStreak: 0, currentStreak: 0 };
  }
  const supabase = await createClient();
  const [{ data }, { data: membership }] = await Promise.all([
    supabase
      .from("predictions")
      .select(
        "home_score, away_score, winner_team_id, match:matches(kickoff_at, status, home_score, away_score, winner_team_id, home_team_id, away_team_id, stage, home:teams!matches_home_team_id_fkey(id,double_points), away:teams!matches_away_team_id_fkey(id,double_points))"
      )
      .eq("user_id", userId)
      .eq("group_id", groupId),
    supabase
      .from("group_members")
      .select("underdog_team_id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  const underdog = membership?.underdog_team_id ?? null;

  const rows = (data ?? [])
    .map((p) => {
      const m = Array.isArray(p.match) ? p.match[0] : p.match;
      return { ph: p.home_score, pa: p.away_score, winnerTeamId: p.winner_team_id ?? null, m };
    })
    .filter((r) => r.m && r.m.status === "finished" && r.m.home_score != null && r.m.away_score != null)
    .sort((a, b) => new Date(a.m!.kickoff_at).getTime() - new Date(b.m!.kickoff_at).getTime());

  let exacts = 0, results = 0, points = 0;
  const goalDiffs = 0;
  let bestStreak = 0, currentStreak = 0, run = 0;

  for (const { ph, pa, winnerTeamId, m } of rows) {
    const ah = m!.home_score!;
    const aa = m!.away_score!;
    const one = (v: unknown) => (Array.isArray(v) ? v[0] ?? null : v ?? null);
    const home = one(m!.home) as { id?: string; double_points?: boolean } | null;
    const away = one(m!.away) as { id?: string; double_points?: boolean } | null;
    const mult = matchMultiplier(home ? { id: m!.home_team_id!, double_points: home.double_points } : null, away ? { id: m!.away_team_id!, double_points: away.double_points } : null, underdog);
    const sameResult = Math.sign(ph - pa) === Math.sign(ah - aa);
    points +=
      predictionPoints(
        ph,
        pa,
        ah,
        aa,
        DEFAULTS,
        winnerTeamId,
        m!.winner_team_id,
        m!.home_team_id,
        m!.away_team_id,
        awardsAdvanceBonus((m as { stage?: string | null }).stage ?? null)
      ) * mult;
    if (ph === ah && pa === aa) {
      exacts++; results++;
    } else if (sameResult) {
      results++;
    }
    if (sameResult) {
      run++;
      bestStreak = Math.max(bestStreak, run);
    } else {
      run = 0;
    }
    currentStreak = run;
  }

  const played = rows.length;
  return {
    played,
    exacts,
    results,
    goalDiffs,
    accuracy: played ? results / played : 0,
    points,
    bestStreak,
    currentStreak,
  };
}
