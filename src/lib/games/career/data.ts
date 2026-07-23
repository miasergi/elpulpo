// ╔══════════════════════════════════════════════════════════════════╗
// ║  Acceso a los datos de ligas, clubes y selecciones                 ║
// ║                                                                    ║
// ║  Los índices se construyen una sola vez al cargar el módulo: el    ║
// ║  motor consulta clubes miles de veces por carrera simulada.        ║
// ╚══════════════════════════════════════════════════════════════════╝
import { LEAGUES } from "./clubs.data";
import { COUNTRIES } from "./countries.data";
import { STAR_OVERALL } from "./constants";
import type { CareerClub, CareerCountry, CareerLeague, Confederation } from "./types";

export { LEAGUES } from "./clubs.data";
export { COUNTRIES, flagUrl } from "./countries.data";

const CLUB_BY_ID = new Map<string, CareerClub>();
const LEAGUE_OF_CLUB = new Map<string, CareerLeague>();
const LEAGUE_BY_ID = new Map<string, CareerLeague>();
const COUNTRY_BY_CODE = new Map<string, CareerCountry>();

for (const league of LEAGUES) {
  LEAGUE_BY_ID.set(league.id, league);
  for (const club of league.clubs) {
    CLUB_BY_ID.set(club.id, club);
    LEAGUE_OF_CLUB.set(club.id, league);
  }
}
for (const country of COUNTRIES) COUNTRY_BY_CODE.set(country.code, country);

export const ALL_CLUBS: CareerClub[] = LEAGUES.flatMap((l) => l.clubs);

export function getClub(id: string): CareerClub | null {
  return CLUB_BY_ID.get(id) ?? null;
}

export function getLeague(id: string): CareerLeague | null {
  return LEAGUE_BY_ID.get(id) ?? null;
}

export function leagueOf(clubId: string): CareerLeague | null {
  return LEAGUE_OF_CLUB.get(clubId) ?? null;
}

export function getCountry(code: string): CareerCountry | null {
  return COUNTRY_BY_CODE.get(code) ?? null;
}

/** Países que tienen liga jugable, para dar preferencia a lo conocido. */
export const PLAYABLE_COUNTRIES = new Set(LEAGUES.map((l) => l.country));

export function leaguesOfCountry(country: string, tier?: 1 | 2): CareerLeague[] {
  return LEAGUES.filter((l) => l.country === country && (tier == null || l.tier === tier));
}

export function leaguesOfConfederation(conf: Confederation): CareerLeague[] {
  return LEAGUES.filter((l) => l.confederation === conf);
}

export function clubsOf(leagues: CareerLeague[]): CareerClub[] {
  return leagues.flatMap((l) => l.clubs);
}

/** ¿Existe una división `tier` en ese país? Hace falta para ascensos. */
export function hasTier(country: string, tier: 1 | 2): boolean {
  return LEAGUES.some((l) => l.country === country && l.tier === tier);
}

/**
 * División en la que juega el club ahora mismo, contando los ascensos y
 * descensos acumulados durante la carrera.
 */
export function tierOf(clubId: string, overrides: Record<string, 1 | 2>): 1 | 2 {
  return overrides[clubId] ?? leagueOf(clubId)?.tier ?? 1;
}

/**
 * Reputación efectiva de un club: una estrella de media 90+ hace que el
 * equipo rinda por encima de lo que le tocaría.
 */
export function effectiveRep(rep: number, overall: number): number {
  return overall >= STAR_OVERALL && rep < 3 ? Math.min(5, rep + 1) : rep;
}

/** El listón que pone un club (rep[2]) como reputación 0-5. */
export function clubLevel(club: CareerClub): number {
  return Math.max(0, Math.min(5, club.rep[2]));
}
