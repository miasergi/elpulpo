import { createClient } from "@/lib/supabase/server";
import { getMatches, type MatchRow } from "@/lib/queries";
import { isLocked } from "@/lib/format";
import { predictionPoints, matchMultiplier } from "@/lib/scoring";

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
    const { data: preds } = await supabase
      .from("predictions")
      .select("match_id, home_score, away_score, author:profiles(display_name, avatar_url)")
      .eq("group_id", groupId)
      .in("match_id", matchList.map((m) => m.id));

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

// ─────────────────────────────────────────────────────────────────────
// POINTS TIMELINE — per-match breakdown with running totals + rank moves.
// ─────────────────────────────────────────────────────────────────────
export interface TimelinePlayer {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  home: number | null;
  away: number | null;
  predicted: boolean;
  points: number; // earned this match (with x2 multiplier)
  mult: number;
  total: number; // cumulative match points after this match
  rank: number; // standing after this match
  rankDelta: number; // positions gained (>0 up, <0 down)
}

export interface TimelineEntry {
  match: MatchRow;
  live: boolean;
  topPoints: number; // best single-match haul (to crown the round winner)
  players: TimelinePlayer[];
}

function ranksByTotal(totals: Map<string, number>): Map<string, number> {
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const ranks = new Map<string, number>();
  let rank = 0;
  let prev: number | null = null;
  sorted.forEach(([id, total], i) => {
    if (prev === null || total !== prev) rank = i + 1;
    prev = total;
    ranks.set(id, rank);
  });
  return ranks;
}

/** Chronological points progression: each played match with everyone's
 *  prediction, points earned, new running total and rank movement. */
export async function getGroupPointsTimeline(
  group: { id: string; competition_id: string; pts_exact: number; pts_result: number },
  members: { id: string; display_name: string; avatar_url: string | null }[]
): Promise<TimelineEntry[]> {
  const supabase = await createClient();
  const matches = await getMatches(group.competition_id);
  const played = matches
    .filter(
      (m) =>
        (m.status === "finished" || m.status === "live") &&
        m.home_score != null &&
        m.away_score != null
    )
    .sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime());
  if (played.length === 0 || members.length === 0) return [];

  const memberIds = members.map((m) => m.id);
  const [{ data: preds }, { data: memberRows }] = await Promise.all([
    supabase
      .from("predictions")
      .select("match_id, user_id, home_score, away_score")
      .eq("group_id", group.id)
      .in("match_id", played.map((m) => m.id))
      .in("user_id", memberIds),
    supabase.from("group_members").select("user_id, underdog_team_id").eq("group_id", group.id),
  ]);

  const underdogOf = new Map((memberRows ?? []).map((r) => [r.user_id, r.underdog_team_id]));
  const predByMatch = new Map<string, Map<string, { h: number; a: number }>>();
  for (const p of preds ?? []) {
    if (!predByMatch.has(p.match_id)) predByMatch.set(p.match_id, new Map());
    predByMatch.get(p.match_id)!.set(p.user_id, { h: p.home_score, a: p.away_score });
  }

  const pts = { exact: group.pts_exact, result: group.pts_result };
  const totals = new Map<string, number>(members.map((m) => [m.id, 0]));
  const entries: TimelineEntry[] = [];

  for (const m of played) {
    const prevRanks = ranksByTotal(totals);
    const mp = predByMatch.get(m.id) ?? new Map<string, { h: number; a: number }>();
    const rows: TimelinePlayer[] = [];
    let topPoints = 0;

    for (const mem of members) {
      const pr = mp.get(mem.id);
      const mult = matchMultiplier(m.home_team, m.away_team, underdogOf.get(mem.id) ?? null);
      const points = pr ? predictionPoints(pr.h, pr.a, m.home_score, m.away_score, pts) * mult : 0;
      totals.set(mem.id, (totals.get(mem.id) ?? 0) + points);
      if (pr && points > topPoints) topPoints = points;
      rows.push({
        user_id: mem.id,
        display_name: mem.display_name,
        avatar_url: mem.avatar_url,
        home: pr?.h ?? null,
        away: pr?.a ?? null,
        predicted: !!pr,
        points,
        mult,
        total: 0,
        rank: 0,
        rankDelta: 0,
      });
    }

    const newRanks = ranksByTotal(totals);
    for (const r of rows) {
      r.total = totals.get(r.user_id) ?? 0;
      r.rank = newRanks.get(r.user_id) ?? 0;
      r.rankDelta = (prevRanks.get(r.user_id) ?? r.rank) - r.rank;
    }
    rows.sort((a, b) => b.points - a.points || b.total - a.total || a.rank - b.rank);
    entries.push({ match: m, live: m.status === "live", topPoints, players: rows });
  }

  return entries.reverse(); // most recent first
}

export interface GroupUpcomingMatch {
  match: MatchRow;
  /** Member ids who already predicted; null if unknown (RPC not available). */
  predictedIds: string[] | null;
}

export interface GroupRecentMatch {
  match: MatchRow;
  /** One entry per member prediction, sorted by points desc. */
  predictions: { user_id: string; home: number; away: number; points: number }[];
}

/** Matchboard for a group: who has predicted the next matches (existence
 *  only, no scores) and everyone's predictions + points for locked ones. */
export async function getGroupMatchboard(
  group: { id: string; competition_id: string; pts_exact: number; pts_goal_diff: number; pts_result: number },
  memberIds: string[]
): Promise<{ upcoming: GroupUpcomingMatch[]; recent: GroupRecentMatch[] }> {
  const supabase = await createClient();
  const matches = await getMatches(group.competition_id);

  const open = matches.filter((m) => !isLocked(m.status, m.kickoff_at)).slice(0, 6);
  const locked = matches
    .filter((m) => isLocked(m.status, m.kickoff_at))
    .sort((a, b) => new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime())
    .slice(0, 10);

  const [{ data: who, error: whoError }, { data: preds }, { data: memberRows }] = await Promise.all([
    open.length > 0
      ? supabase.rpc("predicted_user_ids", { gid: group.id, mids: open.map((m) => m.id) })
      : Promise.resolve({ data: [], error: null }),
    locked.length > 0
      ? supabase
          .from("predictions")
          .select("match_id, user_id, home_score, away_score")
          .eq("group_id", group.id)
          .in("match_id", locked.map((m) => m.id))
          .in("user_id", memberIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("group_members").select("user_id, underdog_team_id").eq("group_id", group.id),
  ]);
  const underdogOf = new Map((memberRows ?? []).map((r) => [r.user_id, r.underdog_team_id]));

  const memberSet = new Set(memberIds);
  const whoByMatch = new Map<string, string[]>();
  for (const r of (who as { match_id: string; user_id: string }[] | null) ?? []) {
    if (!memberSet.has(r.user_id)) continue;
    if (!whoByMatch.has(r.match_id)) whoByMatch.set(r.match_id, []);
    whoByMatch.get(r.match_id)!.push(r.user_id);
  }

  const pts = { exact: group.pts_exact, diff: group.pts_goal_diff, result: group.pts_result };
  const predsByMatch = new Map<string, GroupRecentMatch["predictions"]>();
  for (const p of preds ?? []) {
    const m = locked.find((x) => x.id === p.match_id);
    if (!m) continue;
    if (!predsByMatch.has(p.match_id)) predsByMatch.set(p.match_id, []);
    predsByMatch.get(p.match_id)!.push({
      user_id: p.user_id,
      home: p.home_score,
      away: p.away_score,
      points:
        predictionPoints(p.home_score, p.away_score, m.home_score, m.away_score, pts) *
        matchMultiplier(m.home_team, m.away_team, underdogOf.get(p.user_id) ?? null),
    });
  }

  return {
    upcoming: open.map((match) => ({
      match,
      // If the RPC is missing (migration not applied yet) degrade to "unknown".
      predictedIds: whoError ? null : whoByMatch.get(match.id) ?? [],
    })),
    recent: locked.map((match) => ({
      match,
      predictions: (predsByMatch.get(match.id) ?? []).sort((a, b) => b.points - a.points),
    })),
  };
}

export interface MemberBonusAnswer {
  label: string;
  points: number;
  answer: string;
  status: "pending" | "correct" | "wrong";
}

export interface MemberBonusInfo {
  underdog: { id: string; name: string; code: string | null; flag_url: string | null } | null;
  answers: MemberBonusAnswer[];
  /** Markets this member answered that the caller can't see yet (pre-close). */
  answered: number;
  totalMarkets: number;
}

/** Each member's underdog pick + bonus answers, as far as RLS lets the
 *  caller see them (own always; others' once markets close). */
export async function getGroupBonusBoard(
  groupId: string,
  competitionId: string
): Promise<Record<string, MemberBonusInfo>> {
  const supabase = await createClient();

  const [{ data: markets }, { data: preds }, { data: members }] = await Promise.all([
    supabase
      .from("bonus_markets")
      .select("id,label,kind,points,resolved,correct_team_id,correct_text")
      .eq("competition_id", competitionId)
      .order("points", { ascending: false }),
    supabase
      .from("bonus_predictions")
      .select("user_id, market_id, answer_text, team:teams(id,name,short_name)")
      .eq("group_id", groupId),
    supabase
      .from("group_members")
      .select("user_id, underdog:teams!group_members_underdog_team_id_fkey(id,name,code,flag_url)")
      .eq("group_id", groupId),
  ]);

  // Hand-authored DB types don't know the embedded FK joins; normalise here.
  type UnderdogTeam = { id: string; name: string; code: string | null; flag_url: string | null };
  type AnswerTeam = { id: string; name: string; short_name: string | null };
  const memberRows = (members ?? []) as unknown as {
    user_id: string;
    underdog: UnderdogTeam | UnderdogTeam[] | null;
  }[];
  const predRows = (preds ?? []) as unknown as {
    user_id: string;
    market_id: string;
    answer_text: string | null;
    team: AnswerTeam | AnswerTeam[] | null;
  }[];

  const marketById = new Map((markets ?? []).map((m) => [m.id, m]));
  const board: Record<string, MemberBonusInfo> = {};
  const one = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] ?? null : v ?? null);

  for (const m of memberRows) {
    board[m.user_id] = {
      underdog: one(m.underdog),
      answers: [],
      answered: 0,
      totalMarkets: markets?.length ?? 0,
    };
  }

  for (const p of predRows) {
    const market = marketById.get(p.market_id);
    const entry = board[p.user_id];
    if (!market || !entry) continue;
    const team = one(p.team);
    const answer = market.kind === "team" ? team?.short_name ?? team?.name : p.answer_text;
    if (!answer) continue;
    let status: MemberBonusAnswer["status"] = "pending";
    if (market.resolved) {
      const ok =
        market.kind === "team"
          ? team?.id === market.correct_team_id
          : (market.correct_text ?? "")
              .split("|")
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean)
              .includes((p.answer_text ?? "").trim().toLowerCase());
      status = ok ? "correct" : "wrong";
    }
    entry.answers.push({ label: market.label, points: market.points, answer, status });
    entry.answered += 1;
  }

  for (const info of Object.values(board)) {
    info.answers.sort((a, b) => b.points - a.points);
  }
  return board;
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
