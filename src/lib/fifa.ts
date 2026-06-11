// Official squads from the (undocumented but public) FIFA API.
// World Cup: idCompetition=17, season 2026 = 285023.
// National-kit player photos come from PlayerPicture.PictureUrl (public
// digitalhub.fifa.com transform URLs) — ~98% of squad players have one.
import type { SupabaseClient } from "@supabase/supabase-js";

const FIFA_API = "https://api.fifa.com/api/v3";
const COMPETITION = "17";
const SEASON = "285023";

const POSITION_ES = ["Portero", "Defensa", "Centrocampista", "Delantero"];

interface FifaCalendarMatch {
  Home: { IdTeam: string | null; IdCountry: string | null } | null;
  Away: { IdTeam: string | null; IdCountry: string | null } | null;
}

interface FifaSquadPlayer {
  IdPlayer: string;
  PlayerName: { Locale: string; Description: string }[];
  JerseyNum: number | null;
  Position: number | null;
  RealPosition: number | null;
  BirthDate: string | null;
  PlayerPicture: { PictureUrl: string | null } | null;
}

async function fifaJson<T>(path: string): Promise<T | null> {
  const res = await fetch(`${FIFA_API}${path}`, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

/** FIFA team ids participating in WC2026, keyed by country code (ESP, MEX…). */
async function getFifaTeamIds(): Promise<Map<string, string>> {
  const json = await fifaJson<{ Results: FifaCalendarMatch[] }>(
    `/calendar/matches?idCompetition=${COMPETITION}&idSeason=${SEASON}&count=200&language=es`
  );
  const byCode = new Map<string, string>();
  for (const m of json?.Results ?? []) {
    for (const side of [m.Home, m.Away]) {
      if (side?.IdTeam && side.IdCountry) byCode.set(side.IdCountry, side.IdTeam);
    }
  }
  return byCode;
}

/** "Dayne ST. CLAIR" → "Dayne St. Clair" (FIFA shouts surnames). */
function tidyName(s: string) {
  return s
    .split(" ")
    .map((w) => (w === w.toUpperCase() && w.length > 2 ? w[0] + w.slice(1).toLowerCase() : w))
    .join(" ");
}

export interface SquadSyncResult {
  teams: number;
  players: number;
  missing: string[];
}

/** Replaces each team's roster with the official FIFA squad (names, numbers,
 *  positions, ages). No photos: FIFA's national-kit images aren't accessible. */
export async function syncSquadsFIFA(supabase: SupabaseClient): Promise<SquadSyncResult> {
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, code")
    .not("code", "is", null);

  const fifaByCode = await getFifaTeamIds();
  let playerCount = 0;
  let teamCount = 0;
  const missing: string[] = [];

  for (const team of teams ?? []) {
    const fifaId = fifaByCode.get(team.code!);
    if (!fifaId) {
      missing.push(team.name);
      continue;
    }

    const squad = await fifaJson<{ Players: FifaSquadPlayer[] }>(
      `/teams/${fifaId}/squad?idCompetition=${COMPETITION}&idSeason=${SEASON}&language=es`
    );
    const players = squad?.Players ?? [];
    if (players.length === 0) {
      missing.push(team.name);
      continue;
    }

    const rows = players.map((p) => {
      const name = tidyName(p.PlayerName?.[0]?.Description ?? "");
      const posIdx = p.RealPosition ?? p.Position ?? 3;
      return {
        team_id: team.id,
        external_id: p.IdPlayer,
        name,
        number: p.JerseyNum,
        position: POSITION_ES[posIdx] ?? null,
        birth_date: p.BirthDate ? p.BirthDate.slice(0, 10) : null,
        photo_url: p.PlayerPicture?.PictureUrl ?? null,
        updated_at: new Date().toISOString(),
      };
    });

    // Upsert by (team_id, external_id) so enrichment columns (e.g. club) on
    // existing rows are preserved across re-syncs.
    const { error } = await supabase
      .from("players")
      .upsert(rows, { onConflict: "team_id,external_id" });
    if (error) {
      missing.push(`${team.name} (${error.message})`);
      continue;
    }
    playerCount += rows.length;
    teamCount++;
  }

  return { teams: teamCount, players: playerCount, missing };
}
