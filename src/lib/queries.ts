import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { MatchWithTeams } from "@/components/match/prediction-card";

const TEAM_SELECT =
  "home_team:teams!matches_home_team_id_fkey(id,name,short_name,code,flag_url,double_points,is_underdog)," +
  "away_team:teams!matches_away_team_id_fkey(id,name,short_name,code,flag_url,double_points,is_underdog)";

/** The active competition the app is centred on (World Cup 2026 to start).
 *  Per-request memoised: layout + page share one query. */
export const getActiveCompetition = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("competitions")
    .select("*")
    .eq("is_active", true)
    .order("start_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
});

export type MatchRow = MatchWithTeams & { competition_id: string };

export const getMatches = cache(async (competitionId: string): Promise<MatchRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select(`id,competition_id,kickoff_at,status,minute,home_score,away_score,stage,${TEAM_SELECT}`)
    .eq("competition_id", competitionId)
    .order("kickoff_at", { ascending: true });
  // Supabase returns related rows as arrays for some shapes; normalise to single.
  return (data ?? []).map((m) => normaliseMatch(m as unknown as Record<string, unknown>));
});

export async function getMatchById(id: string): Promise<MatchRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select(`id,competition_id,kickoff_at,status,minute,home_score,away_score,stage,${TEAM_SELECT}`)
    .eq("id", id)
    .maybeSingle();
  return data ? normaliseMatch(data as unknown as Record<string, unknown>) : null;
}

export interface MatchPrediction {
  user_id: string;
  home_score: number;
  away_score: number;
  display_name: string;
  avatar_url: string | null;
}

/** The user's membership row in a group (role + underdog pick). */
export const getMyMembership = cache(async (userId: string, groupId: string | null) => {
  if (!groupId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_members")
    .select("role, underdog_team_id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
});

/** The user's active group (Biwenger-style context all predictions live in). */
export const getActiveGroup = cache(async (activeGroupId: string | null) => {
  if (!activeGroupId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("groups")
    .select("*")
    .eq("id", activeGroupId)
    .maybeSingle();
  return data;
});

/** Predictions for a match within one group (own + group-mates once locked, via RLS). */
export async function getMatchPredictions(
  matchId: string,
  currentUserId: string,
  groupId: string
): Promise<MatchPrediction[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("predictions")
    .select("user_id, home_score, away_score, author:profiles(display_name, avatar_url)")
    .eq("match_id", matchId)
    .eq("group_id", groupId);

  return (data ?? [])
    .map((p) => {
      const a = Array.isArray(p.author) ? p.author[0] : p.author;
      return {
        user_id: p.user_id,
        home_score: p.home_score,
        away_score: p.away_score,
        display_name: a?.display_name ?? "Jugador",
        avatar_url: a?.avatar_url ?? null,
      };
    })
    .sort((a, b) => (a.user_id === currentUserId ? -1 : b.user_id === currentUserId ? 1 : 0));
}

/** The user's match predictions in one group, as a map by match id.
 *  Per-request memoised: the nav badge, dashboard and matches page share it. */
export const getMyPredictions = cache(async (userId: string, groupId: string | null) => {
  const map = new Map<string, { home: number; away: number }>();
  if (!groupId) return map;
  const supabase = await createClient();
  const { data } = await supabase
    .from("predictions")
    .select("match_id,home_score,away_score")
    .eq("user_id", userId)
    .eq("group_id", groupId);
  for (const p of data ?? []) {
    map.set(p.match_id, { home: p.home_score, away: p.away_score });
  }
  return map;
});

/** How many bonus questions the user has answered in a group (for onboarding). */
export const getMyBonusCount = cache(async (userId: string, groupId: string | null) => {
  if (!groupId) return 0;
  const supabase = await createClient();
  const { count } = await supabase
    .from("bonus_predictions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("group_id", groupId);
  return count ?? 0;
});

export const getMyGroups = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_members")
    .select("role, group:groups(id,name,icon,color,invite_code,competition_id)")
    .eq("user_id", userId);
  return (data ?? [])
    .map((r) => ({ role: r.role, ...(Array.isArray(r.group) ? r.group[0] : r.group) }))
    .filter((g) => g && g.id);
});

function normaliseMatch(m: Record<string, unknown>): MatchRow {
  const one = (v: unknown) => (Array.isArray(v) ? v[0] ?? null : v ?? null);
  return {
    ...(m as unknown as MatchRow),
    home_team: one(m.home_team) as MatchRow["home_team"],
    away_team: one(m.away_team) as MatchRow["away_team"],
  };
}
