import { createClient } from "@/lib/supabase/server";

export async function getBonusMarkets(competitionId: string, userId: string, groupId: string | null) {
  const supabase = await createClient();
  const { data: markets } = await supabase
    .from("bonus_markets")
    .select("*")
    .eq("competition_id", competitionId)
    .order("points", { ascending: false })
    .order("label", { ascending: true });

  const { data: mine } = groupId
    ? await supabase
        .from("bonus_predictions")
        .select("market_id, team_id, answer_text")
        .eq("user_id", userId)
        .eq("group_id", groupId)
    : { data: [] };

  const answers = new Map((mine ?? []).map((m) => [m.market_id, m]));
  return { markets: markets ?? [], answers };
}

/** Cuántos bonus tiene aún por configurar el usuario en su grupo activo.
 *  `pending` = mercados abiertos (sin resolver y sin cerrar) sin responder. */
export async function getBonusProgress(
  competitionId: string,
  userId: string,
  groupId: string | null
): Promise<{ total: number; answered: number; pending: number; deadline: string | null }> {
  const supabase = await createClient();
  const { data: markets } = await supabase
    .from("bonus_markets")
    .select("id, closes_at, resolved")
    .eq("competition_id", competitionId);

  const now = Date.now();
  const open = (markets ?? []).filter(
    (m) => !m.resolved && (!m.closes_at || new Date(m.closes_at).getTime() > now)
  );
  const total = open.length;
  const deadline = open
    .map((m) => m.closes_at)
    .filter((c): c is string => !!c)
    .sort()
    .at(-1) ?? null;

  let answered = 0;
  if (groupId && open.length) {
    const { data } = await supabase
      .from("bonus_predictions")
      .select("market_id")
      .eq("user_id", userId)
      .eq("group_id", groupId)
      .in("market_id", open.map((m) => m.id));
    answered = new Set((data ?? []).map((r) => r.market_id)).size;
  }
  return { total, answered, pending: Math.max(0, total - answered), deadline };
}

export interface CompetitionTeam {
  id: string;
  name: string;
  code: string | null;
  flag_url: string | null;
  is_underdog?: boolean;
  /** Group letter (A..L) from the group-stage fixtures, if known. */
  group: string | null;
}

export async function getCompetitionTeams(competitionId: string): Promise<CompetitionTeam[]> {
  const supabase = await createClient();
  // Teams that appear in this competition's fixtures, with their group letter.
  const { data } = await supabase
    .from("matches")
    .select("stage, home:teams!matches_home_team_id_fkey(id,name,code,flag_url,is_underdog),away:teams!matches_away_team_id_fkey(id,name,code,flag_url,is_underdog)")
    .eq("competition_id", competitionId);

  const map = new Map<string, CompetitionTeam>();
  for (const row of data ?? []) {
    const group = row.stage?.startsWith("Grupo ") ? row.stage.slice(6).trim() : null;
    for (const side of [row.home, row.away]) {
      const t = Array.isArray(side) ? side[0] : side;
      if (!t || !t.id) continue;
      const existing = map.get(t.id);
      if (existing) {
        if (!existing.group && group) existing.group = group;
      } else {
        map.set(t.id, { ...t, group });
      }
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
