import { createClient } from "@/lib/supabase/server";

export interface StandingRow {
  user_id: string;
  total_points: number;
  match_points: number;
  bonus_points: number;
  played: number;
  exacts: number;
  correct_results: number;
  rank: number;
  display_name: string;
  username: string;
  avatar_url: string | null;
}

export async function getGroup(groupId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("groups")
    .select("*, competition:competitions(id,name,slug)")
    .eq("id", groupId)
    .maybeSingle();
  return data;
}

export interface GroupMember {
  role: string;
  nickname: string | null;
  joined_at: string;
  profile: { id: string; username: string; display_name: string; avatar_url: string | null } | null;
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_members")
    .select("role, nickname, joined_at, profile:profiles(id,username,display_name,avatar_url)")
    .eq("group_id", groupId);
  return (data ?? []).map((m) => ({
    ...m,
    profile: Array.isArray(m.profile) ? m.profile[0] ?? null : m.profile ?? null,
  })) as unknown as GroupMember[];
}

/** Standings rows merged with profile info and ranked (dense). */
export async function getStandings(groupId: string): Promise<StandingRow[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("group_standings")
    .select("*")
    .eq("group_id", groupId);

  if (!rows || rows.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id,username,display_name,avatar_url")
    .in("id", rows.map((r) => r.user_id));

  const pMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const sorted = [...rows].sort(
    (a, b) =>
      b.total_points - a.total_points ||
      b.exacts - a.exacts ||
      a.user_id.localeCompare(b.user_id)
  );

  let rank = 0;
  let prev: number | null = null;
  return sorted.map((r, i) => {
    if (prev === null || r.total_points !== prev) rank = i + 1;
    prev = r.total_points;
    const p = pMap.get(r.user_id);
    return {
      ...r,
      rank,
      display_name: p?.display_name ?? "Jugador",
      username: p?.username ?? "",
      avatar_url: p?.avatar_url ?? null,
    };
  });
}

/** My rank + points inside a group (or null if not yet ranked). */
export async function getMyStanding(groupId: string, userId: string) {
  const standings = await getStandings(groupId);
  const total = standings.length;
  const me = standings.find((s) => s.user_id === userId);
  return me ? { ...me, total } : null;
}
