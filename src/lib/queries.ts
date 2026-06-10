import { createClient } from "@/lib/supabase/server";
import type { MatchWithTeams } from "@/components/match/prediction-card";

const TEAM_SELECT =
  "home_team:teams!matches_home_team_id_fkey(id,name,short_name,code,flag_url)," +
  "away_team:teams!matches_away_team_id_fkey(id,name,short_name,code,flag_url)";

/** The active competition the app is centred on (World Cup 2026 to start). */
export async function getActiveCompetition() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("competitions")
    .select("*")
    .eq("is_active", true)
    .order("start_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

export type MatchRow = MatchWithTeams & { competition_id: string };

export async function getMatches(competitionId: string): Promise<MatchRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select(`id,competition_id,kickoff_at,status,minute,home_score,away_score,stage,${TEAM_SELECT}`)
    .eq("competition_id", competitionId)
    .order("kickoff_at", { ascending: true });
  // Supabase returns related rows as arrays for some shapes; normalise to single.
  return (data ?? []).map((m) => normaliseMatch(m as unknown as Record<string, unknown>));
}

export async function getUserPredictions(userId: string, matchIds: string[]) {
  if (matchIds.length === 0) return new Map<string, { home: number; away: number }>();
  const supabase = await createClient();
  const { data } = await supabase
    .from("predictions")
    .select("match_id,home_score,away_score")
    .eq("user_id", userId)
    .in("match_id", matchIds);
  const map = new Map<string, { home: number; away: number }>();
  for (const p of data ?? []) {
    map.set(p.match_id, { home: p.home_score, away: p.away_score });
  }
  return map;
}

export async function getMyGroups(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_members")
    .select("role, group:groups(id,name,icon,color,invite_code,competition_id)")
    .eq("user_id", userId);
  return (data ?? [])
    .map((r) => ({ role: r.role, ...(Array.isArray(r.group) ? r.group[0] : r.group) }))
    .filter((g) => g && g.id);
}

function normaliseMatch(m: Record<string, unknown>): MatchRow {
  const one = (v: unknown) => (Array.isArray(v) ? v[0] ?? null : v ?? null);
  return {
    ...(m as unknown as MatchRow),
    home_team: one(m.home_team) as MatchRow["home_team"],
    away_team: one(m.away_team) as MatchRow["away_team"],
  };
}
