// ╔══════════════════════════════════════════════════════════════════╗
// ║  Simulador de Carrera — números que gobiernan todo                 ║
// ║                                                                    ║
// ║  Están agrupados por tema y comentados porque son la palanca de    ║
// ║  equilibrio del juego: tocar aquí cambia cómo se sienten las       ║
// ║  carreras, sin tener que entrar en la simulación.                  ║
// ╚══════════════════════════════════════════════════════════════════╝
import type { PlayStyle, Position, SquadRole, Trophy } from "./types";

// ── Ciclo de vida ────────────────────────────────────────────────────

export const START_AGE = 16;
export const RETIREMENT_AGE = 40;
/** Temporadas que se simulan entre una decisión y la siguiente. */
export const PERIOD_SEASONS = 2;
/** Con 26 o más y por debajo de esta media, te retiras aunque no toque. */
export const DECLINE_RETIREMENT_OVERALL = 50;
/** Ofertas que recibes en cada mercado. */
export const OFFERS_PER_DECISION = 3;

// ── Crecimiento ──────────────────────────────────────────────────────
// La media solo se mueve en años pares. [mínimo, máximo] que puedes ganar
// o perder. Los porteros envejecen mucho mejor que el resto.

export const GROWTH_FIELD: Record<number, [number, number]> = {
  18: [4, 14], 20: [3, 14], 22: [2, 10], 24: [1, 8], 26: [0, 3],
  28: [-1, 0], 30: [-1, 0], 32: [-3, 0], 34: [-5, -1], 36: [-7, -2], 38: [-10, -3],
};

export const GROWTH_KEEPER: Record<number, [number, number]> = {
  18: [2, 10], 20: [2, 10], 22: [2, 9], 24: [2, 8], 26: [1, 7],
  28: [1, 5], 30: [0, 0], 32: [-1, 0], 34: [-2, 0], 36: [-4, -1], 38: [-6, -2],
};

export const MIN_OVERALL = 40;
export const MAX_OVERALL = 99;

// ── Nivel del club ───────────────────────────────────────────────────

/** Media que pide un club según su nivel (`rep[2]`) para que seas titular. */
export const LEVEL_BAR = [58, 68, 75, 80, 84, 88];

/** A partir de esta media, el club te trata como si fuese un escalón mejor. */
export const STAR_OVERALL = 90;

/** Tu diferencia con el listón del club decide tu sitio en la plantilla. */
export function roleFromGap(gap: number, isKeeper: boolean): SquadRole {
  if (isKeeper) return gap >= 0 ? "starter" : gap >= -6 ? "substitute" : "substitute";
  if (gap >= 0) return "starter";
  if (gap >= -4) return "high_rotation";
  if (gap >= -8) return "low_rotation";
  return "substitute";
}

/** Partidos jugados en la temporada según tu sitio en la plantilla. */
export const APPEARANCES: Record<SquadRole, [number, number]> = {
  starter: [40, 55],
  high_rotation: [25, 39],
  low_rotation: [15, 24],
  substitute: [5, 14],
};

export const KEEPER_APPEARANCES: Record<SquadRole, [number, number]> = {
  starter: [42, 50],
  high_rotation: [12, 24],
  low_rotation: [6, 14],
  substitute: [0, 4],
};

/** Escalera para subir o bajar de rol (los eventos la usan). */
export const ROLE_LADDER: SquadRole[] = ["substitute", "low_rotation", "high_rotation", "starter"];

// ── Producción ofensiva ──────────────────────────────────────────────
// Índice 0 = te comes el mundo, 6 = te queda grandísimo el club.
// Se elige con `productionBand(gap)`.

export const GOALS_PER_GAME: Record<PlayStyle, number[]> = {
  attacker: [1.1, 0.85, 0.65, 0.5, 0.3, 0.15, 0.05],
  creator: [0.85, 0.6, 0.45, 0.3, 0.2, 0.1, 0.05],
  support: [0.15, 0.1, 0.08, 0.05, 0.02, 0, 0],
  defensive: [0.1, 0.08, 0.06, 0.04, 0.02, 0, 0],
  goalkeeper: [0, 0, 0, 0, 0, 0, 0],
};

export const ASSISTS_PER_GAME: Record<PlayStyle, number[]> = {
  attacker: [0.4, 0.3, 0.2, 0.15, 0.1, 0.08, 0.05],
  creator: [0.6, 0.45, 0.35, 0.25, 0.15, 0.08, 0.05],
  support: [0.35, 0.25, 0.18, 0.12, 0.07, 0.03, 0.02],
  defensive: [0.1, 0.07, 0.05, 0.03, 0.01, 0, 0],
  goalkeeper: [0, 0, 0, 0, 0, 0, 0],
};

export function productionBand(gap: number): number {
  if (gap >= 10) return 0;
  if (gap >= 6) return 1;
  if (gap >= 3) return 2;
  if (gap >= -2) return 3;
  if (gap >= -5) return 4;
  if (gap >= -9) return 5;
  return 6;
}

/** Un equipo dominante te regala números; uno flojo te los quita. */
export const TEAM_OUTPUT_FACTOR = [0.55, 0.75, 0.95, 1, 1.1, 1.2];

/** Cuanto mejor eres, más rinde cada partido. */
export function qualityFactor(overall: number): number {
  const o = Math.max(MIN_OVERALL, Math.min(MAX_OVERALL, overall));
  if (o <= 65) return 0.6;
  if (o <= 80) return 0.6 + ((o - 65) / 15) * 0.25;
  if (o <= 85) return 0.85 + ((o - 80) / 5) * 0.15;
  if (o <= 95) return 1 + ((o - 85) / 10) * 0.1;
  return 1.1;
}

/** Goles que encaja un portero: los equipos grandes encajan mucho menos. */
export const KEEPER_CONCEDE_FACTOR = [1.4, 1.3, 1.1, 0.9, 0.7, 0.5];

/** Y encajan aún menos si el portero les queda grande. */
export function keeperGapFactor(gap: number): number {
  if (gap >= 10) return 0.5;
  if (gap >= 6) return 0.75;
  if (gap >= 3) return 0.9;
  if (gap >= -2) return 1;
  if (gap >= -5) return 1.1;
  if (gap >= -9) return 1.2;
  return 1.35;
}

// ── Títulos ──────────────────────────────────────────────────────────
// Probabilidad base por reputación del club (0-5).

export const TROPHY_ODDS: Record<"league" | "cup", number[]> = {
  league: [0, 0.01, 0.05, 0.25, 0.45, 0.7],
  cup: [0.01, 0.04, 0.1, 0.25, 0.35, 0.4],
};

export const CONTINENTAL_ODDS: Record<"continental_primary" | "continental_secondary", number[]> = {
  continental_primary: [0, 0, 0.05, 0.15, 0.2, 0.3],
  continental_secondary: [0, 0.05, 0.15, 0.02, 0, 0],
};

/** Si eres claramente mejor que tu club, arrastras al equipo. */
export function starLiftFactor(gap: number): number {
  if (gap >= 10) return 1.6;
  if (gap >= 6) return 1.3;
  if (gap >= 3) return 1.1;
  return 1;
}

/** Probabilidad de ganar la segunda división (y ascender) según tu media. */
export const PROMOTION_ODDS: [number, number][] = [
  [64, 0.03], [69, 0.04], [74, 0.06], [79, 0.09],
  [84, 0.13], [87, 0.18], [89, 0.25], [99, 0.3],
];

// ── Selección ────────────────────────────────────────────────────────

/** Primer año de torneo continental; luego cada CYCLE años. */
export const CONTINENTAL_START_AGE = 17;
export const WORLD_CUP_START_AGE = 19;
export const TOURNAMENT_CYCLE = 4;

/** Media mínima para que te convoquen, según el nivel del país (0-5). */
export const NATIONAL_CALLUP_BAR = [60, 70, 74, 78, 80, 83];

/** Probabilidad de ganar el torneo continental, por reputación continental. */
export const CONTINENTAL_TITLE_ODDS = [0, 0.02, 0.05, 0.1, 0.2, 0.3, 0.8];

/** Probabilidad de que tu selección se clasifique al Mundial. */
export const WORLD_CUP_QUALIFY_ODDS = [0.05, 0.5, 0.8, 1, 1, 1, 1];

/** Probabilidad de ganar el Mundial, por reputación mundial. */
export const WORLD_CUP_TITLE_ODDS = [0, 0.005, 0.05, 0.08, 0.12, 0.18];

export const CONTINENTAL_TOURNAMENT_NAME: Record<string, string> = {
  UEFA: "Eurocopa",
  CONMEBOL: "Copa América",
  CONCACAF: "Copa Oro",
  CAF: "Copa Africana de Naciones",
  AFC: "Copa Asiática",
  OFC: "Copa de Naciones de la OFC",
};

/** Confederaciones cuya copa continental de clubes tiene segunda competición. */
export const HAS_SECONDARY_CONTINENTAL: string[] = ["UEFA", "CONMEBOL"];

export const CONTINENTAL_CLUB_CUP: Record<string, string> = {
  UEFA: "Champions League",
  CONMEBOL: "Copa Libertadores",
  CONCACAF: "Concachampions",
  CAF: "Champions League africana",
  AFC: "Champions League asiática",
  OFC: "Champions League de Oceanía",
};

export const SECONDARY_CONTINENTAL_CUP: Record<string, string> = {
  UEFA: "Europa League",
  CONMEBOL: "Copa Sudamericana",
};

// ── Premios ──────────────────────────────────────────────────────────

/** Probabilidad de Balón de Oro según media y títulos de esa temporada. */
export function ballonDorOdds(overall: number, trophies: Trophy[]): number {
  const league = trophies.includes("league");
  const continental = trophies.includes("continental_primary");
  if (overall >= 97) return 1;
  if (overall >= 94) return league && continental ? 1 : continental ? 0.8 : league ? 0.65 : 0.5;
  if (overall >= 90) return league && continental ? 0.6 : continental ? 0.4 : league ? 0.3 : 0.2;
  if (overall >= 85) {
    if (league && continental) return 0.1;
    if (continental) return 0.05;
    if (league) return 0.01;
  }
  return 0;
}

/** Los perfiles defensivos lo tienen mucho más difícil. */
export function ballonDorStyleFactor(style: PlayStyle): number {
  if (style === "support") return 0.5;
  if (style === "defensive") return 0.25;
  return 1;
}

/** La Bota de Oro se decide solo por goles (y solo se disputa en Europa). */
export function goldenBootOdds(goals: number, inEurope: boolean): number {
  if (!inEurope) return 0;
  if (goals >= 50) return 1;
  if (goals >= 40) return 0.5;
  if (goals >= 30) return 0.25;
  return 0;
}

// ── Valor de mercado ─────────────────────────────────────────────────

/** [media, valor en euros] — se interpola entre tramos. */
export const MARKET_VALUE_CURVE: [number, number][] = [
  [50, 100_000], [55, 250_000], [60, 500_000], [65, 1_200_000],
  [70, 3_000_000], [75, 5_000_000], [80, 15_000_000], [85, 50_000_000],
  [90, 100_000_000], [95, 150_000_000], [99, 250_000_000],
];

/** El mercado paga por juventud. */
export function ageValueFactor(age: number): number {
  if (age <= 18) return 1.5;
  if (age <= 22) return 1.2;
  if (age <= 26) return 1;
  if (age <= 30) return 0.9;
  if (age <= 32) return 0.8;
  if (age <= 34) return 0.6;
  return 0.2;
}

// ── Posiciones ───────────────────────────────────────────────────────

export const POSITION_STYLE: Record<Position, PlayStyle> = {
  POR: "goalkeeper",
  LI: "defensive", DFC: "defensive", LD: "defensive", MCD: "defensive",
  MI: "support", MC: "support", MD: "support",
  MCO: "creator", EI: "creator", ED: "creator",
  DC: "attacker",
};

export const POSITION_NAME: Record<Position, string> = {
  POR: "Portero",
  LI: "Lateral izquierdo", DFC: "Defensa central", LD: "Lateral derecho",
  MCD: "Mediocentro defensivo", MI: "Interior izquierdo", MC: "Mediocentro",
  MD: "Interior derecho", MCO: "Mediapunta",
  EI: "Extremo izquierdo", DC: "Delantero centro", ED: "Extremo derecho",
};

// ── Lesiones ─────────────────────────────────────────────────────────

/** Cuánta media te come cada lesión. */
export const INJURIES: { key: string; name: string; overall: number }[] = [
  { key: "hamstring", name: "Rotura de isquiotibiales", overall: -3 },
  { key: "ankle", name: "Esguince de tobillo", overall: -2 },
  { key: "knee", name: "Lesión de rodilla", overall: -5 },
  { key: "cruciate", name: "Rotura de ligamento cruzado", overall: -8 },
  { key: "achilles", name: "Rotura del tendón de Aquiles", overall: -10 },
  { key: "muscle", name: "Sobrecarga muscular", overall: -1 },
  { key: "adductor", name: "Lesión en el aductor", overall: -2 },
  { key: "metatarsal", name: "Fractura de metatarso", overall: -4 },
  { key: "shoulder", name: "Luxación de hombro", overall: -4 },
  { key: "back", name: "Lesión lumbar", overall: -5 },
];

/** Máximo de lesiones que puede sufrir una carrera. */
export const MAX_INJURIES = 2;
