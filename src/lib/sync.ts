import { createServiceClient } from "@/lib/supabase/server";
import {
  fetchWorldCupFixtures,
  WORLD_CUP_LEAGUE_ID,
  WORLD_CUP_SEASON,
} from "@/lib/api-football";
import { fetchWorldCupSportsDB } from "@/lib/sports-db";
import { translateTeam } from "@/lib/teams-es";

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
    .select("external_id, status, home_score, away_score, kickoff_at, stage")
    .eq("competition_id", competition.id);
  const prev = new Map((existing ?? []).map((m) => [m.external_id, m]));

  const now = new Date().toISOString();
  const matchRows = fixtures
    .map((f) => {
      const p = prev.get(f.external_id);
      const changed =
        !p ||
        p.status !== f.status ||
        p.home_score !== f.home_score ||
        p.away_score !== f.away_score ||
        p.stage !== f.stage ||
        new Date(p.kickoff_at).getTime() !== new Date(f.kickoff_at).getTime();
      if (!changed) return null;
      return {
        external_id: f.external_id,
        competition_id: competition.id,
        home_team_id: idByExt.get(f.home.external_id) ?? null,
        away_team_id: idByExt.get(f.away.external_id) ?? null,
        kickoff_at: f.kickoff_at,
        status: f.status,
        home_score: f.home_score,
        away_score: f.away_score,
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
  const [fixtures, teamsRes, matchesRes] = await Promise.all([
    fetchWorldCupFixtures(),
    supabase.from("teams").select("id, name"),
    supabase
      .from("matches")
      .select("id, home_team_id, away_team_id, kickoff_at, status, home_score, away_score")
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
  type DbMatch = { id: string; home_team_id: string | null; away_team_id: string | null; kickoff_at: string; status: string; home_score: number | null; away_score: number | null };
  const matchIndex = new Map<string, DbMatch>();
  for (const m of (matchesRes.data ?? []) as DbMatch[]) {
    const d = m.kickoff_at?.slice(0, 10);
    if (m.home_team_id && m.away_team_id && d)
      matchIndex.set(`${m.home_team_id}|${m.away_team_id}|${d}`, m);
  }

  // Find changed matches by team UUID + date.
  const now = new Date().toISOString();
  let indexed = 0;
  const updates: Array<{ id: string; status: string; home_score: number | null; away_score: number | null }> = [];
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
    if (existing.status === f.status && existing.home_score === f.home_score && existing.away_score === f.away_score) continue;
    updates.push({ id: existing.id, status: f.status, home_score: f.home_score, away_score: f.away_score });
  }

  // If 0 DB matches were found (likely team name mismatch), signal for fallback.
  if (indexed === 0)
    return { source: "api-football", matches: 0, indexed: 0, note: "name-mismatch" };

  if (updates.length > 0) {
    await Promise.all(
      updates.map((u) =>
        supabase.from("matches").update({ status: u.status as "finished" | "live" | "scheduled", home_score: u.home_score, away_score: u.away_score, updated_at: now }).eq("id", u.id)
      )
    );
  }

  return { source: "api-football", matches: updates.length, indexed };
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
    stage: f.stage,
    round: f.round,
    venue: f.venue,
    updated_at: new Date().toISOString(),
  }));
  await supabase.from("matches").upsert(matchRows, { onConflict: "external_id" });

  return { competitionId: competition.id, teams: teamRows.length, matches: matchRows.length };
}
