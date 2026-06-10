// Thin client for API-Football (api-sports.io) v3.
// Docs: https://www.api-football.com/documentation-v3
import type { MatchStatus } from "@/lib/database.types";

const BASE = "https://v3.football.api-sports.io";

// World Cup is league id 1 in API-Football. The 2026 edition uses season 2026.
export const WORLD_CUP_LEAGUE_ID = 1;
export const WORLD_CUP_SEASON = 2026;

interface FixtureResponse {
  fixture: {
    id: number;
    date: string;
    venue: { name: string | null };
    status: { short: string; elapsed: number | null };
  };
  league: { round: string };
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
  goals: { home: number | null; away: number | null };
}

function mapStatus(short: string): MatchStatus {
  if (["1H", "2H", "HT", "ET", "BT", "P", "LIVE", "INT"].includes(short)) return "live";
  if (["FT", "AET", "PEN"].includes(short)) return "finished";
  if (["PST"].includes(short)) return "postponed";
  if (["CANC", "ABD", "AWD", "WO"].includes(short)) return "cancelled";
  return "scheduled";
}

async function apiGet(path: string) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY not configured");
  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-apisports-key": key },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API-Football ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0) {
    // Plan/access limitations (e.g. free plan can't read 2026) shouldn't crash the sync.
    if (json.errors.plan || json.errors.access || json.errors.requests) {
      console.warn("API-Football limitación de plan:", JSON.stringify(json.errors));
      return [];
    }
    throw new Error(`API-Football error: ${JSON.stringify(json.errors)}`);
  }
  return json.response as unknown[];
}

export interface NormalisedFixture {
  external_id: number;
  kickoff_at: string;
  status: MatchStatus;
  minute: number | null;
  home_score: number | null;
  away_score: number | null;
  stage: string;
  round: string;
  venue: string | null;
  home: { external_id: number; name: string; flag_url: string };
  away: { external_id: number; name: string; flag_url: string };
}

export async function fetchWorldCupFixtures(
  league = WORLD_CUP_LEAGUE_ID,
  season = WORLD_CUP_SEASON
): Promise<NormalisedFixture[]> {
  const raw = (await apiGet(`/fixtures?league=${league}&season=${season}`)) as FixtureResponse[];
  return raw.map((f) => ({
    external_id: f.fixture.id,
    kickoff_at: f.fixture.date,
    status: mapStatus(f.fixture.status.short),
    minute: f.fixture.status.elapsed,
    home_score: f.goals.home,
    away_score: f.goals.away,
    stage: f.league.round,
    round: f.league.round,
    venue: f.fixture.venue.name,
    home: { external_id: f.teams.home.id, name: f.teams.home.name, flag_url: f.teams.home.logo },
    away: { external_id: f.teams.away.id, name: f.teams.away.name, flag_url: f.teams.away.logo },
  }));
}
