// Official squads from the (undocumented but public) FIFA API.
// World Cup: idCompetition=17, season 2026 = 285023.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTeamPlayers } from "@/lib/sports-db";

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
  BirthDate: string | null;
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

/** Strip accents/case for name matching across sources. */
function normName(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  photos: number;
  missing: string[];
}

/** Replaces each team's roster with the official FIFA squad; photos are
 *  matched by name from TheSportsDB's featured players (best effort). */
export async function syncSquadsFIFA(supabase: SupabaseClient): Promise<SquadSyncResult> {
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, code, external_id")
    .not("code", "is", null);

  const fifaByCode = await getFifaTeamIds();
  let playerCount = 0;
  let photoCount = 0;
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

    // Photos: TheSportsDB featured players for this team, matched by name.
    const photoByName = new Map<string, string>();
    if (team.external_id) {
      try {
        for (const p of await getTeamPlayers(team.external_id)) {
          const photo = p.cutout || p.thumb;
          if (photo) photoByName.set(normName(p.name), photo);
        }
      } catch {
        // photos are optional
      }
    }
    const photoFor = (name: string) => {
      const key = normName(name);
      if (photoByName.has(key)) return photoByName.get(key)!;
      // fall back to surname containment (e.g. "Alphonso Davies" vs "A. Davies")
      for (const [k, url] of photoByName) {
        const last = key.split(" ").pop()!;
        if (last.length > 3 && k.includes(last)) return url;
      }
      return null;
    };

    const rows = players.map((p) => {
      const rawName = p.PlayerName?.[0]?.Description ?? "";
      const name = tidyName(rawName);
      const photo = photoFor(rawName);
      if (photo) photoCount++;
      return {
        team_id: team.id,
        external_id: p.IdPlayer,
        name,
        number: p.JerseyNum,
        position: POSITION_ES[p.Position ?? 3] ?? null,
        birth_date: p.BirthDate ? p.BirthDate.slice(0, 10) : null,
        photo_url: photo,
        updated_at: new Date().toISOString(),
      };
    });

    // Replace the roster atomically enough for our needs.
    await supabase.from("players").delete().eq("team_id", team.id);
    const { error } = await supabase.from("players").insert(rows);
    if (error) {
      missing.push(`${team.name} (${error.message})`);
      continue;
    }
    playerCount += rows.length;
    teamCount++;
  }

  return { teams: teamCount, players: playerCount, photos: photoCount, missing };
}
