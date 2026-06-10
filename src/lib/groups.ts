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

export type ActivityItem =
  | {
      type: "result";
      at: string;
      home: string;
      away: string;
      homeScore: number;
      awayScore: number;
      exactHitters: { name: string; avatar_url: string | null }[];
    }
  | { type: "join"; at: string; name: string; avatar_url: string | null };

/** Recent group activity: finished results (with who nailed them) + new members. */
export async function getGroupActivity(groupId: string, competitionId: string): Promise<ActivityItem[]> {
  const supabase = await createClient();

  const [{ data: members }, { data: matches }] = await Promise.all([
    supabase
      .from("group_members")
      .select("joined_at, profile:profiles(display_name, avatar_url)")
      .eq("group_id", groupId)
      .order("joined_at", { ascending: false })
      .limit(10),
    supabase
      .from("matches")
      .select("id, kickoff_at, home_score, away_score, home:teams!matches_home_team_id_fkey(name,short_name), away:teams!matches_away_team_id_fkey(name,short_name)")
      .eq("competition_id", competitionId)
      .eq("status", "finished")
      .not("home_score", "is", null)
      .order("kickoff_at", { ascending: false })
      .limit(8),
  ]);

  const items: ActivityItem[] = [];

  // Member joins
  for (const m of members ?? []) {
    const p = Array.isArray(m.profile) ? m.profile[0] : m.profile;
    items.push({ type: "join", at: m.joined_at, name: p?.display_name ?? "Jugador", avatar_url: p?.avatar_url ?? null });
  }

  // Results with exact hitters among group members
  const matchList = matches ?? [];
  if (matchList.length > 0) {
    const memberIds = (
      await supabase.from("group_members").select("user_id").eq("group_id", groupId)
    ).data?.map((r) => r.user_id) ?? [];

    const { data: preds } = await supabase
      .from("predictions")
      .select("match_id, home_score, away_score, author:profiles(display_name, avatar_url)")
      .in("match_id", matchList.map((m) => m.id))
      .in("user_id", memberIds);

    for (const m of matchList) {
      const home = Array.isArray(m.home) ? m.home[0] : m.home;
      const away = Array.isArray(m.away) ? m.away[0] : m.away;
      const hitters = (preds ?? [])
        .filter((p) => p.match_id === m.id && p.home_score === m.home_score && p.away_score === m.away_score)
        .map((p) => {
          const a = Array.isArray(p.author) ? p.author[0] : p.author;
          return { name: a?.display_name ?? "Jugador", avatar_url: a?.avatar_url ?? null };
        });
      items.push({
        type: "result",
        at: m.kickoff_at,
        home: home?.short_name ?? home?.name ?? "?",
        away: away?.short_name ?? away?.name ?? "?",
        homeScore: m.home_score!,
        awayScore: m.away_score!,
        exactHitters: hitters,
      });
    }
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

/** My rank + points in several groups at once (one query, no N+1). */
export async function getMyStandings(groupIds: string[], userId: string) {
  const result = new Map<string, { rank: number; total: number; total_points: number }>();
  if (groupIds.length === 0) return result;

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("group_standings")
    .select("group_id,user_id,total_points,exacts")
    .in("group_id", groupIds);

  const byGroup = new Map<string, NonNullable<typeof rows>>();
  for (const r of rows ?? []) {
    if (!byGroup.has(r.group_id)) byGroup.set(r.group_id, []);
    byGroup.get(r.group_id)!.push(r);
  }

  for (const [groupId, members] of byGroup) {
    const sorted = [...members].sort(
      (a, b) =>
        b.total_points - a.total_points ||
        b.exacts - a.exacts ||
        a.user_id.localeCompare(b.user_id)
    );
    let rank = 0;
    let prev: number | null = null;
    sorted.forEach((r, i) => {
      if (prev === null || r.total_points !== prev) rank = i + 1;
      prev = r.total_points;
      if (r.user_id === userId) {
        result.set(groupId, { rank, total: sorted.length, total_points: r.total_points });
      }
    });
  }
  return result;
}
