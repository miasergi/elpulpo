import { createClient } from "@/lib/supabase/server";
import { getMatches, type MatchRow } from "@/lib/queries";
import { isLocked, dayKey } from "@/lib/format";
import { predictionPoints, matchMultiplier, awardsAdvanceBonus } from "@/lib/scoring";

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
// HEAD TO HEAD — compare two members across all played matches.
// ─────────────────────────────────────────────────────────────────────
export interface H2HSide {
  id: string;
  name: string;
  avatar_url: string | null;
  total: number;
  wins: number; // matches where this player scored more than the other
  exacts: number;
}
export interface H2HMatch {
  match: MatchRow;
  aHome: number | null;
  aAway: number | null;
  aPts: number;
  bHome: number | null;
  bAway: number | null;
  bPts: number;
  winner: "a" | "b" | "tie";
}
export interface HeadToHead {
  a: H2HSide;
  b: H2HSide;
  draws: number;
  matches: H2HMatch[];
}

export async function getHeadToHead(
  group: { id: string; competition_id: string; pts_exact: number; pts_result: number },
  aId: string,
  bId: string
): Promise<HeadToHead | null> {
  const supabase = await createClient();
  const [{ data: profiles }, { data: memberRows }, matchesAll] = await Promise.all([
    supabase.from("profiles").select("id, display_name, avatar_url").in("id", [aId, bId]),
    supabase.from("group_members").select("user_id, underdog_team_id").eq("group_id", group.id).in("user_id", [aId, bId]),
    getMatches(group.competition_id),
  ]);
  const profMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  if (!profMap.has(aId) || !profMap.has(bId)) return null;
  const underdogOf = new Map((memberRows ?? []).map((r) => [r.user_id, r.underdog_team_id]));

  const played = matchesAll
    .filter((m) => (m.status === "finished" || m.status === "live") && m.home_score != null && m.away_score != null)
    .sort((x, y) => new Date(y.kickoff_at).getTime() - new Date(x.kickoff_at).getTime());

  const { data: preds } = await supabase
    .from("predictions")
    .select("match_id, user_id, home_score, away_score, winner_team_id")
    .eq("group_id", group.id)
    .in("user_id", [aId, bId])
    .in("match_id", played.map((m) => m.id));

  const predOf = new Map<string, { h: number; a: number; winnerTeamId: string | null }>(); // `${matchId}:${uid}`
  for (const p of preds ?? [])
    predOf.set(`${p.match_id}:${p.user_id}`, {
      h: p.home_score,
      a: p.away_score,
      winnerTeamId: p.winner_team_id ?? null,
    });

  const pts = { exact: group.pts_exact, result: group.pts_result };
  const side = (id: string): H2HSide => ({
    id,
    name: profMap.get(id)?.display_name ?? "Jugador",
    avatar_url: profMap.get(id)?.avatar_url ?? null,
    total: 0,
    wins: 0,
    exacts: 0,
  });
  const a = side(aId);
  const b = side(bId);
  let draws = 0;
  const matches: H2HMatch[] = [];

  for (const m of played) {
    const pa = predOf.get(`${m.id}:${aId}`);
    const pb = predOf.get(`${m.id}:${bId}`);
    if (!pa && !pb) continue; // neither predicted → skip
    const aPts = pa
      ? predictionPoints(
          pa.h,
          pa.a,
          m.home_score,
          m.away_score,
          pts,
          pa.winnerTeamId,
          m.winner_team_id,
          m.home_team?.id ?? null,
          m.away_team?.id ?? null,
          awardsAdvanceBonus(m.stage)
        ) * matchMultiplier(m.home_team, m.away_team, underdogOf.get(aId) ?? null)
      : 0;
    const bPts = pb
      ? predictionPoints(
          pb.h,
          pb.a,
          m.home_score,
          m.away_score,
          pts,
          pb.winnerTeamId,
          m.winner_team_id,
          m.home_team?.id ?? null,
          m.away_team?.id ?? null,
          awardsAdvanceBonus(m.stage)
        ) * matchMultiplier(m.home_team, m.away_team, underdogOf.get(bId) ?? null)
      : 0;
    a.total += aPts;
    b.total += bPts;
    if (pa && m.home_score === pa.h && m.away_score === pa.a) a.exacts++;
    if (pb && m.home_score === pb.h && m.away_score === pb.a) b.exacts++;
    const winner = aPts > bPts ? "a" : bPts > aPts ? "b" : "tie";
    if (winner === "a") a.wins++;
    else if (winner === "b") b.wins++;
    else draws++;
    matches.push({ match: m, aHome: pa?.h ?? null, aAway: pa?.a ?? null, aPts, bHome: pb?.h ?? null, bAway: pb?.a ?? null, bPts, winner });
  }

  return { a, b, draws, matches };
}

// ─────────────────────────────────────────────────────────────────────
// TODAY / LIVE — today's matches with the group's live points race.
// ─────────────────────────────────────────────────────────────────────
export interface TodayScorer {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  home: number;
  away: number;
  points: number;
}
export interface TodayMatch {
  match: MatchRow;
  locked: boolean;
  live: boolean;
  finished: boolean;
  iPredicted: boolean;
  scorers: TodayScorer[]; // locked matches only, sorted by points desc
}

export async function getTodayLive(
  group: { id: string; competition_id: string; pts_exact: number; pts_result: number },
  members: { id: string; display_name: string; avatar_url: string | null }[],
  currentUserId: string
): Promise<TodayMatch[]> {
  const supabase = await createClient();
  const matches = await getMatches(group.competition_id);
  const today = dayKey(new Date().toISOString());
  const todays = matches
    .filter((m) => dayKey(m.kickoff_at) === today)
    .sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime());
  if (todays.length === 0 || members.length === 0) return [];

  const memberIds = members.map((m) => m.id);
  const [{ data: preds }, { data: memberRows }] = await Promise.all([
    supabase
      .from("predictions")
      .select("match_id, user_id, home_score, away_score, winner_team_id")
      .eq("group_id", group.id)
      .in("match_id", todays.map((m) => m.id))
      .in("user_id", memberIds),
    supabase.from("group_members").select("user_id, underdog_team_id").eq("group_id", group.id),
  ]);
  const underdogOf = new Map((memberRows ?? []).map((r) => [r.user_id, r.underdog_team_id]));
  const profileById = new Map(members.map((m) => [m.id, m]));
  const pts = { exact: group.pts_exact, result: group.pts_result };

  const byMatch = new Map<string, typeof preds>();
  for (const p of preds ?? []) {
    if (!byMatch.has(p.match_id)) byMatch.set(p.match_id, []);
    byMatch.get(p.match_id)!.push(p);
  }

  return todays.map((m) => {
    const locked = isLocked(m.status, m.kickoff_at);
    const mine = (byMatch.get(m.id) ?? []).find((p) => p.user_id === currentUserId);
    const scorers: TodayScorer[] =
      locked
        ? (byMatch.get(m.id) ?? [])
            .map((p) => {
              const prof = profileById.get(p.user_id);
              const points =
                m.home_score != null
                  ? predictionPoints(
                      p.home_score,
                      p.away_score,
                      m.home_score,
                      m.away_score,
                      pts,
                      p.winner_team_id ?? null,
                      m.winner_team_id,
                      m.home_team?.id ?? null,
                      m.away_team?.id ?? null,
                      awardsAdvanceBonus(m.stage)
                    ) *
                    matchMultiplier(m.home_team, m.away_team, underdogOf.get(p.user_id) ?? null)
                  : 0;
              return {
                user_id: p.user_id,
                display_name: prof?.display_name ?? "Jugador",
                avatar_url: prof?.avatar_url ?? null,
                home: p.home_score,
                away: p.away_score,
                points,
              };
            })
            .sort((a, b) => b.points - a.points)
        : [];
    return {
      match: m,
      locked,
      live: m.status === "live",
      finished: m.status === "finished",
      iPredicted: !!mine,
      scorers,
    };
  });
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

export interface BonusTimelinePlayer {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  answer: string | null;
  points: number;
  correct: boolean;
}

export interface BonusTimelineEntry {
  id: string;
  label: string;
  points: number;
  correctAnswer: string;
  /** Group-winner markets are shown apart from the headline bonus ones. */
  isGroupWinner: boolean;
  players: BonusTimelinePlayer[];
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
      .select("match_id, user_id, home_score, away_score, winner_team_id")
      .eq("group_id", group.id)
      .in("match_id", played.map((m) => m.id))
      .in("user_id", memberIds),
    supabase.from("group_members").select("user_id, underdog_team_id").eq("group_id", group.id),
  ]);

  const underdogOf = new Map((memberRows ?? []).map((r) => [r.user_id, r.underdog_team_id]));
  const predByMatch = new Map<string, Map<string, { h: number; a: number; winnerTeamId: string | null }>>();
  for (const p of preds ?? []) {
    if (!predByMatch.has(p.match_id)) predByMatch.set(p.match_id, new Map());
    predByMatch.get(p.match_id)!.set(p.user_id, {
      h: p.home_score,
      a: p.away_score,
      winnerTeamId: p.winner_team_id ?? null,
    });
  }

  const pts = { exact: group.pts_exact, result: group.pts_result };
  const totals = new Map<string, number>(members.map((m) => [m.id, 0]));
  const entries: TimelineEntry[] = [];

  for (const m of played) {
    const prevRanks = ranksByTotal(totals);
    const mp = predByMatch.get(m.id) ?? new Map<string, { h: number; a: number; winnerTeamId: string | null }>();
    const rows: TimelinePlayer[] = [];
    let topPoints = 0;

    for (const mem of members) {
      const pr = mp.get(mem.id);
      const mult = matchMultiplier(m.home_team, m.away_team, underdogOf.get(mem.id) ?? null);
      const points = pr
        ? predictionPoints(
            pr.h,
            pr.a,
            m.home_score,
            m.away_score,
            pts,
            pr.winnerTeamId,
            m.winner_team_id,
            m.home_team?.id ?? null,
            m.away_team?.id ?? null,
            awardsAdvanceBonus(m.stage)
          ) * mult
        : 0;
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

export async function getGroupBonusTimeline(
  groupId: string,
  competitionId: string,
  members: { id: string; display_name: string; avatar_url: string | null }[]
): Promise<BonusTimelineEntry[]> {
  if (members.length === 0) return [];
  const supabase = await createClient();
  const memberIds = members.map((m) => m.id);
  const [{ data: markets }, { data: preds }, { data: teams }] = await Promise.all([
    supabase
      .from("bonus_markets")
      .select("id,key,label,kind,points,correct_team_id,correct_team_ids,correct_text")
      .eq("competition_id", competitionId)
      .eq("resolved", true)
      .order("points", { ascending: false })
      .order("key", { ascending: true }),
    supabase
      .from("bonus_predictions")
      .select("user_id, market_id, team_id, answer_text")
      .eq("group_id", groupId)
      .in("user_id", memberIds),
    supabase.from("teams").select("id,name,short_name"),
  ]);

  const byMarketUser = new Map<string, NonNullable<typeof preds>[number]>();
  for (const p of preds ?? []) byMarketUser.set(`${p.market_id}:${p.user_id}`, p);
  const profileById = new Map(members.map((m) => [m.id, m]));
  const teamById = new Map((teams ?? []).map((t) => [t.id, t]));

  return (markets ?? []).map((m) => {
    // Mirrors the scoring in group_standings: team markets accept the single
    // correct_team_id or any of correct_team_ids, text ones any pipe-separated
    // alternative. Keep the two in sync or the timeline lies about the points.
    const correctTeamIds = [m.correct_team_id, ...(m.correct_team_ids ?? [])].filter(
      (id): id is string => !!id
    );
    const correctTexts = (m.correct_text ?? "")
      .split("|")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const teamNames = correctTeamIds
      .map((id) => teamById.get(id))
      .map((t) => t?.short_name ?? t?.name)
      .filter(Boolean);
    const correctAnswer =
      (m.kind === "team" ? teamNames.join(", ") : "") || m.correct_text || "Resuelto";
    const players = memberIds.map((id) => {
      const prof = profileById.get(id);
      const pred = byMarketUser.get(`${m.id}:${id}`);
      const predTeam = pred?.team_id ? teamById.get(pred.team_id) : null;
      const answer = predTeam?.short_name ?? predTeam?.name ?? pred?.answer_text ?? null;
      const correct =
        m.kind === "team"
          ? !!pred?.team_id && correctTeamIds.includes(pred.team_id)
          : correctTexts.includes((pred?.answer_text ?? "").trim().toLowerCase());
      return {
        user_id: id,
        display_name: prof?.display_name ?? "Jugador",
        avatar_url: prof?.avatar_url ?? null,
        answer,
        correct,
        points: correct ? m.points : 0,
      };
    });
    return {
      id: m.id,
      label: m.label,
      points: m.points,
      correctAnswer,
      isGroupWinner: m.key.startsWith("group_winner_"),
      players: players.sort((a, b) => b.points - a.points || a.display_name.localeCompare(b.display_name)),
    };
  });
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
          .select("match_id, user_id, home_score, away_score, winner_team_id")
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
        predictionPoints(
          p.home_score,
          p.away_score,
          m.home_score,
          m.away_score,
          pts,
          p.winner_team_id ?? null,
          m.winner_team_id,
          m.home_team?.id ?? null,
          m.away_team?.id ?? null,
          awardsAdvanceBonus(m.stage)
        ) *
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
      .select("id,label,kind,points,resolved,correct_team_id,correct_team_ids,correct_text")
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
          ? !!team &&
            (team.id === market.correct_team_id ||
              (market.correct_team_ids ?? []).includes(team.id))
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
