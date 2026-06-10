// Seeds World Cup 2026 demo data via the Supabase service client (bypasses RLS).
// Run with:  node --env-file=.env.local scripts/seed.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || url.includes("TU-PROYECTO") || !key) {
  console.error("✗ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const TEAMS = [
  ["México", "MEX"], ["Estados Unidos", "USA"], ["Canadá", "CAN"], ["Argentina", "ARG"],
  ["Brasil", "BRA"], ["España", "ESP"], ["Francia", "FRA"], ["Inglaterra", "ENG"],
  ["Alemania", "GER"], ["Portugal", "POR"], ["Países Bajos", "NED"], ["Croacia", "CRO"],
];

// Two realistic 4-team groups, with two matchdays played and one to predict.
const FIXTURES = [
  // ── Grupo A: MEX, CRO, USA, CAN ──
  ["MEX", "CRO", "2026-06-09T19:00:00Z", "finished", 2, 1, "Grupo A"],
  ["USA", "CAN", "2026-06-09T22:00:00Z", "finished", 1, 1, "Grupo A"],
  ["MEX", "USA", "2026-06-13T19:00:00Z", "finished", 0, 0, "Grupo A"],
  ["CRO", "CAN", "2026-06-13T22:00:00Z", "finished", 2, 0, "Grupo A"],
  ["MEX", "CAN", "2026-06-17T19:00:00Z", "scheduled", null, null, "Grupo A"],
  ["CRO", "USA", "2026-06-17T22:00:00Z", "scheduled", null, null, "Grupo A"],
  // ── Grupo B: ESP, FRA, GER, POR ──
  ["ESP", "GER", "2026-06-10T18:00:00Z", "finished", 3, 1, "Grupo B"],
  ["FRA", "POR", "2026-06-10T21:00:00Z", "finished", 2, 0, "Grupo B"],
  ["ESP", "FRA", "2026-06-14T18:00:00Z", "scheduled", null, null, "Grupo B"],
  ["GER", "POR", "2026-06-14T21:00:00Z", "scheduled", null, null, "Grupo B"],
];

const BONUS = [
  ["champion", "¿Quién ganará el Mundial?", "team", 15],
  ["finalist", "¿Quién será subcampeón?", "team", 8],
  ["top_scorer", "Máximo goleador (Bota de Oro)", "text", 10],
];

async function main() {
  // Competition
  const { data: comp, error: e1 } = await db
    .from("competitions")
    .upsert(
      { slug: "world-cup-2026", name: "Mundial 2026", season: 2026, type: "cup",
        start_date: "2026-06-11", end_date: "2026-07-19", is_active: true },
      { onConflict: "slug" }
    )
    .select("id")
    .single();
  if (e1) throw e1;
  console.log("✓ Competición:", comp.id);

  // Clean reseed of demo group-stage matches (también limpia cargas previas A–F).
  await db.from("matches").delete().eq("competition_id", comp.id).like("stage", "Grupo %");
  await db.from("matches").delete().eq("competition_id", comp.id).is("home_team_id", null);

  // Teams — insert only the ones missing (teams.code has no unique constraint).
  const { data: existingTeams } = await db.from("teams").select("id, code").in("code", TEAMS.map((t) => t[1]));
  const have = new Set((existingTeams ?? []).map((t) => t.code));
  const toInsert = TEAMS.filter(([, code]) => !have.has(code)).map(([name, code]) => ({ name, short_name: name, code }));
  if (toInsert.length) {
    const { error: te } = await db.from("teams").insert(toInsert);
    if (te) throw te;
  }
  const { data: teams } = await db.from("teams").select("id, code").in("code", TEAMS.map((t) => t[1]));
  const byCode = Object.fromEntries(teams.map((t) => [t.code, t.id]));
  console.log("✓ Equipos:", teams.length);

  // Insert fresh demo matches
  const matchRows = FIXTURES.map(([h, a, kickoff, status, hs, as_, stage]) => ({
    competition_id: comp.id, home_team_id: byCode[h], away_team_id: byCode[a],
    kickoff_at: kickoff, status, home_score: hs, away_score: as_, stage,
  }));
  const { error: me } = await db.from("matches").insert(matchRows);
  if (me) throw me;
  console.log("✓ Partidos cargados:", matchRows.length);

  // Bonus markets
  await db.from("bonus_markets").upsert(
    BONUS.map(([key, label, kind, points]) => ({
      competition_id: comp.id, key, label, kind, points, closes_at: "2026-06-11T16:00:00Z",
    })),
    { onConflict: "competition_id,key" }
  );
  console.log("✓ Bonus listos");
  console.log("\n🐙 Seed completado.");
}

main().catch((e) => {
  console.error("✗ Error:", e.message);
  process.exit(1);
});
