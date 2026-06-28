import { createServiceClient } from "@/lib/supabase/server";
import {
  fetchWorldCupFixtures,
  WORLD_CUP_LEAGUE_ID,
  WORLD_CUP_SEASON,
} from "@/lib/api-football";
import { fetchWorldCupSportsDB } from "@/lib/sports-db";
import { translateTeam } from "@/lib/teams-es";
import type { MatchStatus } from "@/lib/database.types";

// Default tournament-wide bonus questions. Inserted once (existing rows are
// never touched, so admin edits/resolutions survive re-syncs).
const DEFAULT_BONUS_MARKETS: [key: string, label: string, kind: "team" | "text", points: number][] = [
  ["champion", "¿Quién ganará el Mundial?", "team", 15],
  ["finalist", "¿Quién será subcampeón?", "team", 8],
  ["top_scorer", "Máximo goleador (Bota de Oro)", "text", 10],
  ["best_player", "Mejor jugador (Balón de Oro)", "text", 8],
  ["best_keeper", "Mejor portero (Guante de Oro)", "text", 8],
  ["host_best", "¿Qué anfitrión llegará más lejos?", "team", 5],
  ...Array.from({ length: 12 }, (_, i) => {
    const letter = String.fromCharCode(65 + i);
    return [`group_winner_${letter}`, `Ganador del Grupo ${letter}`, "team", 3] as [string, string, "team", number];
  }),
];

async function ensureBonusMarkets(
  supabase: ReturnType<typeof createServiceClient>,
  competitionId: string,
  closesAt: string | null
) {
  // Refresh label/points/closes_at on every sync so the close time tracks the
  // real opening kickoff. Resolution fields (resolved, correct_team_id,
  // correct_text) aren't in the payload, so the admin's results are preserved.
  await supabase.from("bonus_markets").upsert(
    DEFAULT_BONUS_MARKETS.map(([key, label, kind, points]) => ({
      competition_id: competitionId,
      key,
      label,
      kind,
      points,
      closes_at: closesAt,
    })),
    { onConflict: "competition_id,key", ignoreDuplicates: false }
  );
}

function resolvedWinnerTeamId(
  homeTeamId: string | null | undefined,
  awayTeamId: string | null | undefined,
  homeScore: number | null,
  awayScore: number | null
) {
  if (homeScore == null || awayScore == null) return null;
  if (homeScore > awayScore) return homeTeamId ?? null;
  if (homeScore < awayScore) return awayTeamId ?? null;
  return null;
}

function openFootballWinnerTeamId(
  winner: string | null | undefined,
  team1: string,
  team2: string,
  id1: string,
  id2: string,
  homeTeamId: string,
  awayTeamId: string,
  homeScore: number | null,
  awayScore: number | null
) {
  if (winner === team1) return id1;
  if (winner === team2) return id2;
  return resolvedWinnerTeamId(homeTeamId, awayTeamId, homeScore, awayScore);
}

async function resolveGroupWinnerBonuses(
  supabase: ReturnType<typeof createServiceClient>,
  competitionId: string
) {
  const { data: matches } = await supabase
    .from("matches")
    .select("stage,status,home_score,away_score,home_team_id,away_team_id")
    .eq("competition_id", competitionId)
    .ilike("stage", "Grupo %");

  type Row = {
    stage: string | null;
    status: string;
    home_score: number | null;
    away_score: number | null;
    home_team_id: string | null;
    away_team_id: string | null;
  };
  type Standing = { id: string; points: number; gd: number; gf: number; name: string };
  const byGroup = new Map<string, Row[]>();
  for (const m of (matches ?? []) as Row[]) {
    if (!m.stage) continue;
    if (!byGroup.has(m.stage)) byGroup.set(m.stage, []);
    byGroup.get(m.stage)!.push(m);
  }

  const updates: Array<{ key: string; correct_team_id: string }> = [];
  for (const [stage, rows] of byGroup) {
    const letter = stage.replace(/^Grupo\s+/i, "").trim().toUpperCase();
    if (!/^[A-L]$/.test(letter)) continue;
    if (rows.length < 6) continue;
    if (rows.some((m) => m.status !== "finished" || m.home_score == null || m.away_score == null)) continue;

    const table = new Map<string, Standing>();
    const ensure = (id: string | null) => {
      if (!id) return null;
      if (!table.has(id)) table.set(id, { id, points: 0, gd: 0, gf: 0, name: id });
      return table.get(id)!;
    };
    for (const m of rows) {
      const h = ensure(m.home_team_id);
      const a = ensure(m.away_team_id);
      if (!h || !a || m.home_score == null || m.away_score == null) continue;
      h.gf += m.home_score;
      h.gd += m.home_score - m.away_score;
      a.gf += m.away_score;
      a.gd += m.away_score - m.home_score;
      if (m.home_score > m.away_score) h.points += 3;
      else if (m.away_score > m.home_score) a.points += 3;
      else {
        h.points += 1;
        a.points += 1;
      }
    }
    const winner = [...table.values()].sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.id.localeCompare(b.id))[0];
    if (winner) updates.push({ key: `group_winner_${letter}`, correct_team_id: winner.id });
  }

  if (updates.length === 0) return { resolved: 0 };

  await Promise.all(
    updates.map((u) =>
      supabase
        .from("bonus_markets")
        .update({ resolved: true, correct_team_id: u.correct_team_id })
        .eq("competition_id", competitionId)
        .eq("key", u.key)
    )
  );
  return { resolved: updates.length };
}

/**
 * Default sync: pulls real WC2026 fixtures + results from TheSportsDB (free),
 * upserts teams/matches by external_id, and removes leftover demo rows.
 */
export async function syncWorldCupSportsDB() {
  const supabase = createServiceClient();

  const { data: competition, error: compErr } = await supabase
    .from("competitions")
    .upsert(
      {
        slug: "world-cup-2026",
        name: "Mundial 2026",
        season: WORLD_CUP_SEASON,
        type: "cup",
        is_active: true,
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();
  if (compErr || !competition) throw new Error(`competition upsert failed: ${compErr?.message}`);

  const fixtures = await fetchWorldCupSportsDB();
  if (fixtures.length === 0) {
    return { source: "thesportsdb", competitionId: competition.id, teams: 0, matches: 0, note: "sin datos" };
  }

  // Upsert teams by external_id.
  const teamsByExt = new Map<number, { name: string; flag_url: string | null }>();
  for (const f of fixtures) {
    teamsByExt.set(f.home.external_id, { name: f.home.name, flag_url: f.home.flag_url });
    teamsByExt.set(f.away.external_id, { name: f.away.name, flag_url: f.away.flag_url });
  }
  const teamRows = [...teamsByExt.entries()].map(([external_id, t]) => {
    const tr = translateTeam(t.name);
    return {
      external_id,
      name: tr.name,
      short_name: tr.name,
      code: tr.code,
      flag_url: t.flag_url,
    };
  });
  await supabase.from("teams").upsert(teamRows, { onConflict: "external_id" });

  const { data: teams } = await supabase
    .from("teams")
    .select("id, external_id")
    .in("external_id", [...teamsByExt.keys()]);
  const idByExt = new Map((teams ?? []).map((t: { external_id: number | null; id: string }) => [t.external_id, t.id]));

  // Change-aware upsert: only write rows that are new or actually changed,
  // so `updated_at` reliably marks real updates (used for result notifications).
  const { data: existing } = await supabase
    .from("matches")
    .select("external_id, status, home_score, away_score, winner_team_id, kickoff_at, stage")
    .eq("competition_id", competition.id);
  const prev = new Map((existing ?? []).map((m) => [m.external_id, m]));

  const now = new Date().toISOString();
  const matchRows = fixtures
    .map((f) => {
      const p = prev.get(f.external_id);
      // Never downgrade a finished match — TheSportsDB sometimes returns stale
      // "scheduled" status for matches already patched via API-Football.
      if (p?.status === "finished" && f.status !== "finished") return null;
      const homeTeamId = idByExt.get(f.home.external_id) ?? null;
      const awayTeamId = idByExt.get(f.away.external_id) ?? null;
      const winnerTeamId = resolvedWinnerTeamId(homeTeamId, awayTeamId, f.home_score, f.away_score);
      const changed =
        !p ||
        p.status !== f.status ||
        p.home_score !== f.home_score ||
        p.away_score !== f.away_score ||
        p.winner_team_id !== winnerTeamId ||
        p.stage !== f.stage ||
        new Date(p.kickoff_at).getTime() !== new Date(f.kickoff_at).getTime();
      if (!changed) return null;
      return {
        external_id: f.external_id,
        competition_id: competition.id,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        kickoff_at: f.kickoff_at,
        status: f.status,
        home_score: f.home_score,
        away_score: f.away_score,
        winner_team_id: winnerTeamId,
        stage: f.stage,
        round: String(f.round),
        venue: f.venue,
        updated_at: now,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (matchRows.length > 0) {
    await supabase.from("matches").upsert(matchRows, { onConflict: "external_id" });
  }

  // Remove leftover demo data (rows without an external_id).
  await supabase.from("matches").delete().eq("competition_id", competition.id).is("external_id", null);
  await supabase.from("teams").delete().is("external_id", null);

  // Make sure the tournament-wide bonus questions exist (close at kick-off
  // of the opening match).
  const firstKickoff = fixtures.map((f) => f.kickoff_at).sort()[0] ?? null;
  await ensureBonusMarkets(supabase, competition.id, firstKickoff);

  return { source: "thesportsdb", competitionId: competition.id, teams: teamRows.length, matches: matchRows.length };
}

/**
 * Score patch via openfootball/worldcup.json (GitHub, no API key required).
 * Updates existing DB rows and inserts any missing rows for finished matches.
 * Matches by team UUID + date (neutral venue, so tries both home/away orderings).
 * Never downgrades finished→scheduled.
 */
export async function patchScoresFromOpenFootball() {
  const supabase = createServiceClient();

  const { data: competition } = await supabase
    .from("competitions")
    .select("id")
    .eq("slug", "world-cup-2026")
    .single();
  if (!competition) throw new Error("Competition not found");

  type OFMatch = {
    team1: string; team2: string; date: string;
    round?: string; group?: string; ground?: string;
    winner?: string | null;
    score?: { ft?: [number, number] | null };
  };
  let json: { matches: OFMatch[] };
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json",
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error(`openfootball ${res.status}`);
    json = await res.json();
  } catch {
    return { source: "openfootball", matches: 0, indexed: 0, note: "fetch-error" };
  }

  const [teamsRes, matchesRes] = await Promise.all([
    supabase.from("teams").select("id, name"),
    supabase
      .from("matches")
      .select("id, home_team_id, away_team_id, kickoff_at, status, home_score, away_score, winner_team_id")
      .eq("competition_id", competition.id),
  ]);

  const nameToId = new Map<string, string>();
  for (const t of (teamsRes.data ?? []) as { id: string; name: string }[]) {
    nameToId.set(t.name.toLowerCase().trim(), t.id);
  }
  function resolveTeamId(name: string): string | undefined {
    const tr = translateTeam(name);
    if (tr.code) {
      const id = nameToId.get(tr.name.toLowerCase().trim());
      if (id) return id;
    }
    return nameToId.get(name.toLowerCase().trim());
  }

  // Index by both orderings — World Cup matches are on neutral ground.
  type DbMatch = { id: string; home_team_id: string | null; away_team_id: string | null; kickoff_at: string; status: string; home_score: number | null; away_score: number | null; winner_team_id: string | null };
  const matchIndex = new Map<string, { m: DbMatch; rev: boolean }>();
  for (const m of (matchesRes.data ?? []) as DbMatch[]) {
    const d = m.kickoff_at?.slice(0, 10);
    if (m.home_team_id && m.away_team_id && d) {
      matchIndex.set(`${m.home_team_id}|${m.away_team_id}|${d}`, { m, rev: false });
      matchIndex.set(`${m.away_team_id}|${m.home_team_id}|${d}`, { m, rev: true });
    }
  }

  type MatchInsert = {
    competition_id: string;
    home_team_id: string;
    away_team_id: string;
    kickoff_at: string;
    status: MatchStatus;
    home_score: number | null;
    away_score: number | null;
    winner_team_id: string | null;
    stage: string;
    round: string;
    venue: string | null;
    updated_at: string;
  };

  const now = new Date().toISOString();
  let indexed = 0;
  const updates: Array<{
    id: string;
    status: MatchStatus;
    home_score: number | null;
    away_score: number | null;
    winner_team_id: string | null;
    stage: string;
    round: string;
    venue: string | null;
  }> = [];
  const inserts: MatchInsert[] = [];

  for (const f of json.matches) {
    const ft = f.score?.ft ?? null;
    const isFinished = Array.isArray(ft);
    const isKnockout = !f.group;
    if (!isFinished && !isKnockout) continue;

    const id1 = resolveTeamId(f.team1);
    const id2 = resolveTeamId(f.team2);
    if (!id1 || !id2) continue;

    // Try exact date AND next calendar day — TheSportsDB stores UTC timestamps
    // while openfootball uses local date, causing a 1-day offset for evening games in the Americas.
    const d1 = f.date;
    const d2 = new Date(`${f.date}T12:00:00Z`);
    d2.setUTCDate(d2.getUTCDate() + 1);
    const nextDate = d2.toISOString().slice(0, 10);
    const entry =
      matchIndex.get(`${id1}|${id2}|${d1}`) ??
      matchIndex.get(`${id2}|${id1}|${d1}`) ??
      matchIndex.get(`${id1}|${id2}|${nextDate}`) ??
      matchIndex.get(`${id2}|${id1}|${nextDate}`);
    const status: MatchStatus = ft ? "finished" : "scheduled";
    const stage = f.group ?? f.round ?? "Group Stage";
    const round = f.round ?? "Matchday";
    const homeScore = ft?.[0] ?? null;
    const awayScore = ft?.[1] ?? null;

    if (!entry) {
      // Row missing from DB — insert it so the app shows this match.
      inserts.push({
        competition_id: competition.id,
        home_team_id: id1,
        away_team_id: id2,
        kickoff_at: `${f.date}T12:00:00Z`,
        status,
        home_score: homeScore,
        away_score: awayScore,
        winner_team_id: openFootballWinnerTeamId(f.winner, f.team1, f.team2, id1, id2, id1, id2, homeScore, awayScore),
        stage,
        round,
        venue: f.ground ?? null,
        updated_at: now,
      });
      indexed++;
      continue;
    }

    indexed++;
    const { m, rev } = entry;
    if (m.status === "finished" && status !== "finished") continue;
    const hs = ft ? (rev ? ft[1] : ft[0]) : null;
    const as_ = ft ? (rev ? ft[0] : ft[1]) : null;
    const winnerTeamId = openFootballWinnerTeamId(
      f.winner,
      f.team1,
      f.team2,
      id1,
      id2,
      m.home_team_id ?? id1,
      m.away_team_id ?? id2,
      hs,
      as_
    );
    if (
      m.status === status &&
      m.home_score === hs &&
      m.away_score === as_ &&
      m.winner_team_id === winnerTeamId
    ) continue;
    updates.push({
      id: m.id,
      status,
      home_score: hs,
      away_score: as_,
      winner_team_id: winnerTeamId,
      stage,
      round,
      venue: f.ground ?? null,
    });
  }

  if (indexed === 0)
    return { source: "openfootball", matches: 0, indexed: 0, note: "name-mismatch" };

  await Promise.all([
    updates.length > 0
      ? Promise.all(
          updates.map((u) =>
            supabase
              .from("matches")
              .update({
                status: u.status,
                home_score: u.home_score,
                away_score: u.away_score,
                winner_team_id: u.winner_team_id,
                stage: u.stage,
                round: u.round,
                venue: u.venue,
                updated_at: now,
              })
              .eq("id", u.id)
          )
        )
      : Promise.resolve(),
    inserts.length > 0
      ? supabase.from("matches").insert(inserts)
      : Promise.resolve(),
  ]);

  const bonus = await resolveGroupWinnerBonuses(supabase, competition.id);

  return {
    source: "openfootball",
    matches: updates.length + inserts.length,
    indexed,
    inserted: inserts.length,
    bonus,
  };
}

/**
 * Fast score patch: fetches all fixtures from API-Football (1 HTTP call) and
 * updates only the score/status of existing matches, matched by team ID + date.
 * Never creates new match rows — safe to call without affecting predictions.
 */
export async function patchScoresFromAPIFootball() {
  const supabase = createServiceClient();

  const { data: competition } = await supabase
    .from("competitions")
    .select("id")
    .eq("slug", "world-cup-2026")
    .single();
  if (!competition) throw new Error("Competition not found");

  // Fetch API-Football fixtures + existing DB data in parallel.
  // Wrap fetchWorldCupFixtures in try/catch so a missing key falls through to TheSportsDB.
  let fixtures: Awaited<ReturnType<typeof fetchWorldCupFixtures>>;
  try {
    fixtures = await fetchWorldCupFixtures();
  } catch {
    return { source: "api-football", matches: 0, indexed: 0, note: "api-football-error" };
  }
  const [teamsRes, matchesRes] = await Promise.all([
    supabase.from("teams").select("id, name"),
    supabase
      .from("matches")
      .select("id, home_team_id, away_team_id, kickoff_at, status, home_score, away_score, winner_team_id")
      .eq("competition_id", competition.id),
  ]);

  if (fixtures.length === 0)
    return { source: "api-football", matches: 0, indexed: 0, note: "sin datos (plan o acceso)" };

  // Build team name → DB UUID lookup with two strategies:
  // 1. Translate API-Football English name to Spanish (TEAM_ES mapping)
  // 2. Fallback: match the raw English/any name directly against DB team names
  const nameToId = new Map<string, string>();
  for (const t of (teamsRes.data ?? []) as { id: string; name: string }[]) {
    nameToId.set(t.name.toLowerCase().trim(), t.id);
  }
  function resolveTeamId(apiName: string): string | undefined {
    const translated = translateTeam(apiName);
    // Strategy 1: translated Spanish name exists in TEAM_ES (code is non-null)
    if (translated.code) {
      const id = nameToId.get(translated.name.toLowerCase().trim());
      if (id) return id;
    }
    // Strategy 2: raw name match (handles English-stored teams or untranslated names)
    return nameToId.get(apiName.toLowerCase().trim());
  }

  // Build match index: "homeUUID|awayUUID|date" → match row
  type DbMatch = { id: string; home_team_id: string | null; away_team_id: string | null; kickoff_at: string; status: string; home_score: number | null; away_score: number | null; winner_team_id: string | null };
  const matchIndex = new Map<string, DbMatch>();
  for (const m of (matchesRes.data ?? []) as DbMatch[]) {
    const d = m.kickoff_at?.slice(0, 10);
    if (m.home_team_id && m.away_team_id && d)
      matchIndex.set(`${m.home_team_id}|${m.away_team_id}|${d}`, m);
  }

  // Find changed matches by team UUID + date.
  const now = new Date().toISOString();
  let indexed = 0;
  const updates: Array<{ id: string; status: string; home_score: number | null; away_score: number | null; winner_team_id: string | null }> = [];
  for (const f of fixtures) {
    const homeId = resolveTeamId(f.home.name);
    const awayId = resolveTeamId(f.away.name);
    if (!homeId || !awayId) continue;
    const date = f.kickoff_at.slice(0, 10);
    const existing = matchIndex.get(`${homeId}|${awayId}|${date}`);
    if (!existing) continue;
    indexed++;
    // Never downgrade a finished match back to scheduled.
    if (existing.status === "finished" && f.status === "scheduled") continue;
    const winnerTeamId =
      f.winner_external_id === f.home.external_id
        ? homeId
        : f.winner_external_id === f.away.external_id
          ? awayId
          : resolvedWinnerTeamId(existing.home_team_id, existing.away_team_id, f.home_score, f.away_score);
    if (existing.status === f.status && existing.home_score === f.home_score && existing.away_score === f.away_score && existing.winner_team_id === winnerTeamId) continue;
    updates.push({ id: existing.id, status: f.status, home_score: f.home_score, away_score: f.away_score, winner_team_id: winnerTeamId });
  }

  // If 0 DB matches were found (likely team name mismatch), signal for fallback.
  if (indexed === 0)
    return { source: "api-football", matches: 0, indexed: 0, note: "name-mismatch" };

  if (updates.length > 0) {
    await Promise.all(
      updates.map((u) =>
        supabase.from("matches").update({ status: u.status as "finished" | "live" | "scheduled", home_score: u.home_score, away_score: u.away_score, winner_team_id: u.winner_team_id, updated_at: now }).eq("id", u.id)
      )
    );
  }

  return { source: "api-football", matches: updates.length, indexed };
}

/** Automatic score updater used by cron/admin sync. OpenFootball is the broad
 * free source; API-Football runs afterwards to fill knockout penalty winners
 * when a tied fixture exposes teams.home/away.winner. */
export async function patchScoresAutomatically() {
  const openfootball = await patchScoresFromOpenFootball();
  const apiFootball = await patchScoresFromAPIFootball();
  return {
    source: "auto",
    matches: (openfootball.matches ?? 0) + (apiFootball.matches ?? 0),
    openfootball,
    apiFootball,
  };
}

/**
 * Syncs World Cup 2026 fixtures + results from API-Football into our DB.
 * Idempotent: upserts teams and matches by their external_id.
 */
export async function syncWorldCup() {
  const supabase = createServiceClient();

  // 1. Ensure the competition exists.
  const { data: competition, error: compErr } = await supabase
    .from("competitions")
    .upsert(
      {
        external_id: WORLD_CUP_LEAGUE_ID,
        slug: "world-cup-2026",
        name: "Mundial 2026",
        season: WORLD_CUP_SEASON,
        type: "cup",
        is_active: true,
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();
  if (compErr || !competition) throw new Error(`competition upsert failed: ${compErr?.message}`);

  // 2. Fetch fixtures.
  const fixtures = await fetchWorldCupFixtures();
  if (fixtures.length === 0) return { competitionId: competition.id, teams: 0, matches: 0 };

  // 3. Upsert teams.
  const teamsByExt = new Map<number, { name: string; flag_url: string }>();
  for (const f of fixtures) {
    teamsByExt.set(f.home.external_id, { name: f.home.name, flag_url: f.home.flag_url });
    teamsByExt.set(f.away.external_id, { name: f.away.name, flag_url: f.away.flag_url });
  }
  const teamRows = [...teamsByExt.entries()].map(([external_id, t]) => ({
    external_id,
    name: t.name,
    flag_url: t.flag_url,
  }));
  await supabase.from("teams").upsert(teamRows, { onConflict: "external_id" });

  const { data: teams } = await supabase
    .from("teams")
    .select("id, external_id")
    .in("external_id", [...teamsByExt.keys()]);
  const idByExt = new Map(
    (teams ?? []).map((t: { external_id: number | null; id: string }) => [t.external_id, t.id])
  );

  // 4. Upsert matches.
  const matchRows = fixtures.map((f) => ({
    external_id: f.external_id,
    competition_id: competition.id,
    home_team_id: idByExt.get(f.home.external_id) ?? null,
    away_team_id: idByExt.get(f.away.external_id) ?? null,
    kickoff_at: f.kickoff_at,
    status: f.status,
    minute: f.minute,
    home_score: f.home_score,
    away_score: f.away_score,
    winner_team_id:
      f.winner_external_id === f.home.external_id
        ? idByExt.get(f.home.external_id) ?? null
        : f.winner_external_id === f.away.external_id
          ? idByExt.get(f.away.external_id) ?? null
          : resolvedWinnerTeamId(
              idByExt.get(f.home.external_id) ?? null,
              idByExt.get(f.away.external_id) ?? null,
              f.home_score,
              f.away_score
            ),
    stage: f.stage,
    round: f.round,
    venue: f.venue,
    updated_at: new Date().toISOString(),
  }));
  await supabase.from("matches").upsert(matchRows, { onConflict: "external_id" });

  return { competitionId: competition.id, teams: teamRows.length, matches: matchRows.length };
}
