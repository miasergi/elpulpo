import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";

// One-time manual score patch for matches TheSportsDB missed.
// DELETE this file once TheSportsDB/API-Football catch up automatically.
const RESULTS: [string, string, number, number][] = [
  ["Haití",           "Escocia",  0, 1], // Scotland 1-0 Haiti           (Jun 13)
  ["Australia",       "Turquía",  2, 0], // Australia 2-0 Turkey         (Jun 13)
  ["Países Bajos",    "Japón",    2, 2], // Netherlands 2-2 Japan        (Jun 14)
  ["Costa de Marfil", "Ecuador",  1, 0], // Ivory Coast 1-0 Ecuador      (Jun 14)
  ["Suecia",          "Túnez",    5, 1], // Sweden 5-1 Tunisia           (Jun 15)
  ["España",          "Cabo Verde", 0, 0], // Spain 0-0 Cape Verde         (Jun 15)
  ["Bélgica",         "Egipto",    1, 1], // Belgium 1-1 Egypt            (Jun 15)
  ["Irán",            "Nueva Zelanda", 2, 2], // Iran 2-2 New Zealand     (Jun 15)
  ["Arabia Saudí",    "Uruguay",   1, 1], // Saudi Arabia 1-1 Uruguay     (Jun 15)
  ["Francia",         "Senegal",   3, 1], // France 3-1 Senegal           (Jun 16)
  ["Irak",            "Noruega",   1, 4], // Iraq 1-4 Norway              (Jun 16)
  ["Argentina",       "Argelia",   3, 0], // Argentina 3-0 Algeria        (Jun 16)
  ["Austria",         "Jordania",  3, 1], // Austria 3-1 Jordan           (Jun 16)
];

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  if (!isCron && !(await getAdminUser()))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const supabase = createServiceClient();

  const { data: comp } = await supabase.from("competitions").select("id").eq("slug", "world-cup-2026").single();
  if (!comp) return NextResponse.json({ error: "no competition" }, { status: 500 });

  const { data: teams } = await supabase.from("teams").select("id, name");
  const byName = new Map<string, string>((teams ?? []).map((t: { id: string; name: string }) => [t.name, t.id]));

  const { data: matches } = await supabase
    .from("matches")
    .select("id, home_team_id, away_team_id, status, home_score, away_score")
    .eq("competition_id", comp.id);

  const now = new Date().toISOString();
  const updated: string[] = [];

  for (const [home, away, hs, as_] of RESULTS) {
    const homeId = byName.get(home);
    const awayId = byName.get(away);
    if (!homeId || !awayId) { updated.push(`NOT FOUND: ${home} / ${away}`); continue; }

    // World Cup matches are on neutral ground; TheSportsDB home/away is arbitrary.
    // Try listed order first, then reversed (swapping scores accordingly).
    let match = (matches ?? []).find(
      (m) => m.home_team_id === homeId && m.away_team_id === awayId
    );
    let homeScore = hs, awayScore = as_;
    if (!match) {
      match = (matches ?? []).find(
        (m) => m.home_team_id === awayId && m.away_team_id === homeId
      );
      if (match) { homeScore = as_; awayScore = hs; }
    }

    if (!match) { updated.push(`NO MATCH ROW: ${home} vs ${away}`); continue; }

    const { error } = await supabase
      .from("matches")
      .update({ status: "finished", home_score: homeScore, away_score: awayScore, updated_at: now })
      .eq("id", match.id);

    updated.push(error ? `ERROR ${home} vs ${away}: ${error.message}` : `OK ${home} ${hs}-${as_} ${away}`);
  }

  return NextResponse.json({ ok: true, results: updated });
}
