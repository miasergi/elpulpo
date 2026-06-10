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

const FIXTURES = [
  ["MEX", "CRO", "2026-06-09T19:00:00Z", "finished", 2, 1, "Grupo A"],
  ["ARG", "CAN", "2026-06-09T22:00:00Z", "finished", 3, 0, "Grupo B"],
  ["ESP", "FRA", "2026-06-11T18:00:00Z", "scheduled", null, null, "Grupo C"],
  ["BRA", "ENG", "2026-06-11T21:00:00Z", "scheduled", null, null, "Grupo D"],
  ["GER", "POR", "2026-06-12T18:00:00Z", "scheduled", null, null, "Grupo E"],
  ["NED", "USA", "2026-06-12T21:00:00Z", "scheduled", null, null, "Grupo F"],
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

  // Teams
  await db.from("teams").upsert(
    TEAMS.map(([name, code]) => ({ name, short_name: name, code })),
    { onConflict: "code" }
  );
  const { data: teams } = await db.from("teams").select("id, code").in("code", TEAMS.map((t) => t[1]));
  const byCode = Object.fromEntries(teams.map((t) => [t.code, t.id]));
  console.log("✓ Equipos:", teams.length);

  // Matches (skip if a match with same teams+kickoff already exists)
  for (const [h, a, kickoff, status, hs, as_, stage] of FIXTURES) {
    const { data: existing } = await db
      .from("matches")
      .select("id")
      .eq("competition_id", comp.id)
      .eq("home_team_id", byCode[h])
      .eq("away_team_id", byCode[a])
      .maybeSingle();
    if (existing) continue;
    await db.from("matches").insert({
      competition_id: comp.id, home_team_id: byCode[h], away_team_id: byCode[a],
      kickoff_at: kickoff, status, home_score: hs, away_score: as_, stage,
    });
  }
  console.log("✓ Partidos cargados");

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
