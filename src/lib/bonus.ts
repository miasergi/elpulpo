import { createClient } from "@/lib/supabase/server";

export async function getBonusMarkets(competitionId: string, userId: string) {
  const supabase = await createClient();
  const { data: markets } = await supabase
    .from("bonus_markets")
    .select("*")
    .eq("competition_id", competitionId)
    .order("created_at", { ascending: true });

  const { data: mine } = await supabase
    .from("bonus_predictions")
    .select("market_id, team_id, answer_text")
    .eq("user_id", userId);

  const answers = new Map((mine ?? []).map((m) => [m.market_id, m]));
  return { markets: markets ?? [], answers };
}

export async function getCompetitionTeams(competitionId: string) {
  const supabase = await createClient();
  // Teams that appear in this competition's fixtures.
  const { data } = await supabase
    .from("matches")
    .select("home:teams!matches_home_team_id_fkey(id,name,code,flag_url),away:teams!matches_away_team_id_fkey(id,name,code,flag_url)")
    .eq("competition_id", competitionId);

  const map = new Map<string, { id: string; name: string; code: string | null; flag_url: string | null }>();
  for (const row of data ?? []) {
    for (const side of [row.home, row.away]) {
      const t = Array.isArray(side) ? side[0] : side;
      if (t && t.id) map.set(t.id, t);
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
