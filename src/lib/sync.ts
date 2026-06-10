import { createServiceClient } from "@/lib/supabase/server";
import {
  fetchWorldCupFixtures,
  WORLD_CUP_LEAGUE_ID,
  WORLD_CUP_SEASON,
} from "@/lib/api-football";

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
