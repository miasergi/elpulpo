// ╔══════════════════════════════════════════════════════════════════╗
// ║  Mercado: quién viene a por ti                                     ║
// ║                                                                    ║
// ║  De canterano solo te miran los clubes de tu país; según creces,   ║
// ║  primero te ve tu continente y al final el mundo entero. Ese salto ║
// ║  progresivo es lo que hace que una carrera se sienta como una      ║
// ║  escalada y no como un sorteo.                                     ║
// ╚══════════════════════════════════════════════════════════════════╝
import { OFFERS_PER_DECISION } from "./constants";
import {
  ALL_CLUBS,
  clubsOf,
  getClub,
  getCountry,
  leagueOf,
  leaguesOfConfederation,
  leaguesOfCountry,
} from "./data";
import { pickWeighted, sample, type Rng } from "./rng";
import type { CareerClub, Confederation } from "./types";

/** Tu caché en el mercado (0-5), directamente de tu media. */
export function playerTier(overall: number): number {
  if (overall >= 87) return 5;
  if (overall >= 83) return 4;
  if (overall >= 78) return 3;
  if (overall >= 73) return 2;
  if (overall >= 65) return 1;
  return 0;
}

/** Hasta dónde llega tu nombre: de tu país al mundo entero. */
function reach(overall: number): { country: number; confederation: number; world: number } {
  if (overall >= 83) return { country: 0, confederation: 0, world: 100 };
  if (overall >= 78) return { country: 0, confederation: 50, world: 50 };
  if (overall >= 73) return { country: 0, confederation: 100, world: 0 };
  return { country: 100, confederation: 0, world: 0 };
}

interface OfferInput {
  rng: Rng;
  overall: number;
  countryCode: string;
  /** Club actual, para no ofrecerte tu propio equipo. */
  currentClubId?: string | null;
  /** Clubes que no queremos repetir en esta tanda. */
  exclude?: Set<string>;
  count?: number;
  /** Techo de nivel: no fiches por el Madrid con media 55. */
  maxLevel?: number;
}

/**
 * Clubes candidatos: se escoge el ámbito (país / confederación / mundo) y
 * dentro se filtra por nivel para que la oferta sea creíble.
 */
function candidatePool(overall: number, countryCode: string, maxLevel: number): CareerClub[] {
  const country = getCountry(countryCode);
  const scope = reach(overall);

  const pools: CareerClub[][] = [];
  if (scope.country) pools.push(clubsOf(leaguesOfCountry(countryCode)));
  if (scope.confederation && country) pools.push(clubsOf(leaguesOfConfederation(country.confederation)));
  if (scope.world) pools.push(ALL_CLUBS);

  // Si tu país no tiene liga jugable, tiras de tu confederación y, si no,
  // del fútbol europeo, que es donde acaba todo el mundo.
  let pool = pools.flat();
  if (pool.length < OFFERS_PER_DECISION && country) {
    pool = clubsOf(leaguesOfConfederation(country.confederation));
  }
  if (pool.length < OFFERS_PER_DECISION) {
    pool = clubsOf(leaguesOfConfederation("UEFA"));
  }

  const fitting = pool.filter((c) => c.rep[2] <= maxLevel);
  return fitting.length >= OFFERS_PER_DECISION ? fitting : pool;
}

/** Un club de nivel parecido pesa más que uno que te queda lejos. */
function offerWeight(club: CareerClub, tier: number): number {
  const distance = Math.abs(club.rep[2] - tier);
  return Math.max(1, 8 - distance * 3);
}

export function generateOffers({
  rng,
  overall,
  countryCode,
  currentClubId,
  exclude,
  count = OFFERS_PER_DECISION,
  maxLevel,
}: OfferInput): { rng: Rng; clubs: CareerClub[] } {
  const tier = playerTier(overall);
  const ceiling = maxLevel ?? Math.min(5, tier + 1);
  const banned = new Set(exclude ?? []);
  if (currentClubId) banned.add(currentClubId);

  const pool = candidatePool(overall, countryCode, ceiling).filter((c) => !banned.has(c.id));
  if (pool.length <= count) return { rng, clubs: pool };

  const clubs: CareerClub[] = [];
  let r = rng;
  const taken = new Set<string>();
  while (clubs.length < count && taken.size < pool.length) {
    const options = pool.filter((c) => !taken.has(c.id)).map((item) => ({ item, weight: offerWeight(item, tier) }));
    if (!options.length) break;
    const roll = pickWeighted(r, options);
    r = roll.rng;
    taken.add(roll.value.id);
    clubs.push(roll.value);
  }
  return { rng: r, clubs };
}

/**
 * Ofertas de cantera. Aquí no cuenta tu media (aún no tienes): manda de dónde
 * eres. Los mexicanos, por realismo del fútbol de formación, también reciben
 * miradas de Sudamérica y Europa.
 */
export function generateAcademyOffers(
  rng: Rng,
  countryCode: string
): { rng: Rng; clubs: CareerClub[] } {
  const country = getCountry(countryCode);
  const home = clubsOf(leaguesOfCountry(countryCode));

  let pool: CareerClub[] = home;
  if (pool.length < OFFERS_PER_DECISION && country) {
    pool = clubsOf(leaguesOfConfederation(country.confederation));
  }
  if (pool.length < OFFERS_PER_DECISION) {
    // Sin liga en casa ni en el continente: te busca la vida en Europa.
    pool = clubsOf(leaguesOfConfederation("UEFA"));
  }

  // De canterano nadie ficha por el mejor club del mundo: se acota el nivel.
  const modest = pool.filter((c) => c.rep[2] <= 3);
  const roll = sample(rng, modest.length >= OFFERS_PER_DECISION ? modest : pool, OFFERS_PER_DECISION);
  return { rng: roll.rng, clubs: roll.value };
}

/** Un rival directo de tu club, para la "oferta de rival". */
export function pickRivalClub(
  rng: Rng,
  clubId: string
): { rng: Rng; club: CareerClub | null } {
  const club = getClub(clubId);
  const league = leagueOf(clubId);
  if (!club || !league) return { rng, club: null };

  // Los rivales de verdad: mismo país y al menos tan fuertes como tú.
  const rivals = league.clubs.filter((c) => c.id !== clubId && c.rep[2] >= club.rep[2]);
  if (!rivals.length) return { rng, club: null };
  const roll = pickWeighted(rng, rivals.map((item) => ({ item, weight: item.rep[2] + 1 })));
  return { rng: roll.rng, club: roll.value };
}

/** Un club del país del jugador, para la "vuelta a casa". */
export function pickHomeClub(
  rng: Rng,
  countryCode: string,
  overall: number
): { rng: Rng; club: CareerClub | null } {
  const home = clubsOf(leaguesOfCountry(countryCode));
  if (!home.length) return { rng, club: null };
  const tier = playerTier(overall);
  const roll = pickWeighted(rng, home.map((item) => ({ item, weight: offerWeight(item, tier) })));
  return { rng: roll.rng, club: roll.value };
}

/** Clubes donde te pueden ceder: siempre por debajo del tuyo. */
export function generateLoanOffers(
  rng: Rng,
  overall: number,
  countryCode: string,
  currentClubId: string | null
): { rng: Rng; clubs: CareerClub[] } {
  const parent = currentClubId ? getClub(currentClubId) : null;
  const ceiling = Math.max(0, (parent?.rep[2] ?? 2) - 1);
  return generateOffers({
    rng,
    overall,
    countryCode,
    currentClubId,
    count: 2,
    maxLevel: ceiling,
  });
}

/** Confederación de un club, para los textos. */
export function confederationOf(clubId: string): Confederation | null {
  return leagueOf(clubId)?.confederation ?? null;
}
