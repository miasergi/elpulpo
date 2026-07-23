// ╔══════════════════════════════════════════════════════════════════╗
// ║  Torneos de selecciones (mejora sobre el juego original)            ║
// ║                                                                    ║
// ║  El original solo tiraba un dado: ganabas el torneo o no. Aquí     ║
// ║  jugamos el torneo de verdad — grupo de cuatro y eliminatorias —   ║
// ║  para que veas hasta dónde llegó tu selección y contra quién caíste.║
// ║                                                                    ║
// ║  Usa el mismo modelo de goles que "El 11 del mundial"              ║
// ║  (xG exponencial + Poisson, ver src/lib/games/eleven.ts) para que   ║
// ║  los marcadores se sientan iguales en los dos juegos.              ║
// ╚══════════════════════════════════════════════════════════════════╝
import {
  CONTINENTAL_TOURNAMENT_NAME,
  MAX_OVERALL,
} from "./constants";
import { COUNTRIES, getCountry } from "./data";
import { chance, next, sample, type Rng } from "./rng";
import type {
  CareerCountry,
  NationalMatch,
  NationalRun,
  PlayStyle,
  Stats,
  Trophy,
} from "./types";

/** Fuerza de una selección, en la misma escala que TEAM_RATING de eleven.ts. */
export function countryRating(country: CareerCountry): number {
  return 58 + country.rep[2] * 6 + country.rep[0] * 1.5;
}

function xg(attack: number, defense: number): number {
  return Math.max(0.18, Math.min(4.6, 1.3 * Math.exp((attack - defense) / 16)));
}

function poisson(rng: Rng, lambda: number): { rng: Rng; value: number } {
  const limit = Math.exp(-lambda);
  let r = rng;
  let k = 0;
  let p = 1;
  do {
    k++;
    const roll = next(r);
    r = roll.rng;
    p *= roll.value;
  } while (p > limit);
  return { rng: r, value: k - 1 };
}

interface Side {
  code: string;
  name: string;
  rating: number;
}

function playMatch(
  rng: Rng,
  us: Side,
  them: Side,
  stage: string,
  knockout: boolean
): { rng: Rng; match: NationalMatch } {
  const a = poisson(rng, xg(us.rating, them.rating));
  const b = poisson(a.rng, xg(them.rating, us.rating));
  let r = b.rng;
  const goalsFor = a.value;
  const goalsAgainst = b.value;

  const match: NationalMatch = {
    stage,
    rivalCode: them.code,
    rivalName: them.name,
    goalsFor,
    goalsAgainst,
    won: goalsFor > goalsAgainst,
  };

  if (knockout && goalsFor === goalsAgainst) {
    // Tanda de penaltis, ponderada por la fuerza de cada selección.
    const edge = us.rating / (us.rating + them.rating);
    let ours = 0;
    let theirs = 0;
    for (let i = 0; i < 5; i++) {
      const p1 = chance(r, 0.55 + (edge - 0.5) * 0.4);
      r = p1.rng;
      if (p1.value) ours++;
      const p2 = chance(r, 0.55 - (edge - 0.5) * 0.4);
      r = p2.rng;
      if (p2.value) theirs++;
    }
    while (ours === theirs) {
      const p = chance(r, edge);
      r = p.rng;
      if (p.value) ours++;
      else theirs++;
    }
    match.penaltiesFor = ours;
    match.penaltiesAgainst = theirs;
    match.won = ours > theirs;
  }

  return { rng: r, match };
}

/** Las mejores selecciones de una confederación, para llenar el cuadro. */
function contenders(country: CareerCountry, worldwide: boolean, count: number): CareerCountry[] {
  const pool = COUNTRIES.filter(
    (c) => c.code !== country.code && (worldwide || c.confederation === country.confederation)
  );
  const ranked = [...pool].sort(
    (a, b) => countryRating(b) - countryRating(a) || a.name.localeCompare(b.name, "es")
  );
  // Cogemos un grupo amplio de cabeza para que aparezcan también sorpresas.
  return ranked.slice(0, Math.max(count, Math.min(ranked.length, count * 2)));
}

const KO_STAGES = ["Octavos de final", "Cuartos de final", "Semifinal", "Final"];

/** Cuántas rondas de eliminatoria tiene el torneo. */
function knockoutStages(worldwide: boolean): string[] {
  return worldwide ? KO_STAGES : KO_STAGES.slice(1);
}

interface RunInput {
  rng: Rng;
  country: CareerCountry;
  trophy: "national_continental" | "world_cup";
  /** Tu media, que sube algo a tu selección. */
  overall: number;
  style: PlayStyle;
  /** El motor ya decidió si el torneo se gana; el recorrido lo respeta. */
  forceWin: boolean;
}

export function simulateNationalRun({
  rng,
  country,
  trophy,
  overall,
  style,
  forceWin,
}: RunInput): { rng: Rng; run: NationalRun } {
  const worldwide = trophy === "world_cup";
  const stages = knockoutStages(worldwide);
  const needed = 3 + stages.length;

  const pool = contenders(country, worldwide, needed);
  const drawn = sample(rng, pool, needed);
  let r = drawn.rng;

  // Un crack levanta a su selección, sobre todo si es de las flojas.
  const boost = Math.max(0, Math.min(6, (overall - 78) / 4));
  const us: Side = {
    code: country.code,
    name: country.name,
    rating: countryRating(country) + boost,
  };
  const rivals: Side[] = drawn.value.map((c) => ({
    code: c.code,
    name: c.name,
    rating: countryRating(c),
  }));

  const matches: NationalMatch[] = [];
  const tournament = worldwide
    ? "Mundial"
    : CONTINENTAL_TOURNAMENT_NAME[country.confederation] ?? "torneo continental";

  // ── Fase de grupos: tres partidos ──
  let points = 0;
  for (let i = 0; i < 3; i++) {
    const played = playMatch(r, us, rivals[i], "Fase de grupos", false);
    r = played.rng;
    matches.push(played.match);
    points += played.match.goalsFor > played.match.goalsAgainst ? 3
      : played.match.goalsFor === played.match.goalsAgainst ? 1 : 0;
  }

  // Pasan los dos primeros: con 4 puntos casi siempre se pasa.
  let advanced = points >= 5;
  if (!advanced && points >= 3) {
    const coin = chance(r, points === 4 ? 0.75 : 0.3);
    r = coin.rng;
    advanced = coin.value;
  }
  if (forceWin) advanced = true;

  let reachedLabel = advanced ? "" : "Fase de grupos";
  let won = false;

  // ── Eliminatorias ──
  if (advanced) {
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const rival = rivals[3 + i];
      let played = playMatch(r, us, rival, stage, true);
      r = played.rng;

      // Si el motor decidió que este torneo se gana, no puedes caer antes.
      if (forceWin && !played.match.won) {
        played = {
          rng: r,
          match: {
            ...played.match,
            goalsFor: played.match.goalsAgainst + 1,
            penaltiesFor: undefined,
            penaltiesAgainst: undefined,
            won: true,
          },
        };
      }
      matches.push(played.match);

      if (!played.match.won) {
        reachedLabel = stage === "Final" ? "Subcampeón" : eliminatedLabel(stage);
        break;
      }
      if (stage === "Final") {
        reachedLabel = "Campeón";
        won = true;
      }
    }
    if (!reachedLabel) reachedLabel = "Fase de grupos";
  }

  return {
    rng: r,
    run: {
      trophy,
      tournament,
      matches,
      reachedLabel,
      won,
      stats: tournamentStats(matches, style, overall),
    },
  };
}

function eliminatedLabel(stage: string): string {
  if (stage === "Semifinal") return "Semifinales";
  return stage;
}

/**
 * Lo que aportaste tú en el torneo. Se reparten los goles del equipo según
 * tu perfil y tu nivel, sin volver a tirar dados: es un desglose, no un
 * segundo sorteo.
 */
function tournamentStats(matches: NationalMatch[], style: PlayStyle, overall: number): Stats {
  const teamGoals = matches.reduce((n, m) => n + m.goalsFor, 0);
  const conceded = matches.reduce((n, m) => n + m.goalsAgainst, 0);
  const quality = Math.min(1, Math.max(0.2, (overall - 55) / (MAX_OVERALL - 55)));
  const goalShare = { attacker: 0.34, creator: 0.2, support: 0.08, defensive: 0.05, goalkeeper: 0 }[style];
  const assistShare = { attacker: 0.14, creator: 0.26, support: 0.16, defensive: 0.05, goalkeeper: 0 }[style];

  return {
    appearances: matches.length,
    goals: Math.round(teamGoals * goalShare * quality),
    assists: Math.round(teamGoals * assistShare * quality),
    cleanSheets: style === "goalkeeper" ? matches.filter((m) => m.goalsAgainst === 0).length : 0,
    goalsConceded: style === "goalkeeper" ? conceded : 0,
  };
}

/** Nombre del torneo continental de un país, para los textos. */
export function tournamentName(countryCode: string, trophy: Trophy): string {
  if (trophy === "world_cup") return "Mundial";
  const country = getCountry(countryCode);
  return CONTINENTAL_TOURNAMENT_NAME[country?.confederation ?? "UEFA"] ?? "torneo continental";
}
