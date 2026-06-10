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
  await supabase.from("bonus_markets").upsert(
    DEFAULT_BONUS_MARKETS.map(([key, label, kind, points]) => ({
      competition_id: competitionId,
      key,
      label,
      kind,
      points,
      closes_at: closesAt,
    })),
    { onConflict: "competition_id,key", ignoreDuplicates: true }
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
