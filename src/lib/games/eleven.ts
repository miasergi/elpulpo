// ╔══════════════════════════════════════════════════════════════════╗
// ║  "El 11 del mundial" — motor del minijuego (puro, sin dependencias) ║
// ║                                                                    ║
// ║  Te toca una selección al azar, montas tu 11 sobre el campo y      ║
// ║  simulamos su Mundial partido a partido: fase de grupos y, si      ║
// ║  pasa, eliminatorias hasta la final. Todo client-safe.             ║
// ╚══════════════════════════════════════════════════════════════════╝

export type Line = "gk" | "def" | "mid" | "fwd";

export interface TeamLite {
  id: string;
  name: string;
  code: string | null;
  flag_url: string | null;
}

export interface RawPlayer {
  id: string;
  name: string;
  number: number | null;
  position: string | null; // "Portero" | "Defensa" | "Centrocampista" | "Delantero"
  club: string | null;
  club_badge: string | null;
  photo_url: string | null;
}

export interface SquadPlayer {
  id: string;
  name: string;
  number: number | null;
  line: Line;
  club: string | null;
  clubBadge: string | null;
  photo: string | null;
  rating: number;
}

/** Un jugador ya fichado para el 11: arrastra de qué selección salió
 *  (para la bandera en el campo y la regla de "11 países distintos"). */
export interface PickedPlayer extends SquadPlayer {
  team: TeamLite;
}

// ─────────────────────────────────────────────────────────────────────
// Ratings base de cada selección (≈ fuerza estilo ranking FIFA, 0-100).
// Es el "esqueleto" del equipo; tu alineación lo modula (ataque/defensa).
// ─────────────────────────────────────────────────────────────────────
export const TEAM_RATING: Record<string, number> = {
  ARG: 92, ESP: 91, FRA: 90, ENG: 88, BRA: 89, POR: 87, NED: 86,
  GER: 84, BEL: 84, CRO: 83, URU: 83, COL: 82, MAR: 82, SUI: 80,
  NOR: 80, SEN: 79, JPN: 78, TUR: 78, ECU: 76, MEX: 76, AUT: 76,
  USA: 75, SWE: 75, CZE: 74, KOR: 74, CIV: 74, ALG: 74, CAN: 73,
  SCO: 73, EGY: 73, IRN: 72, AUS: 72, PAR: 72, BIH: 71, GHA: 71,
  TUN: 70, RSA: 70, COD: 67, PAN: 68, QAT: 66, KSA: 65, UZB: 65,
  NZL: 64, IRQ: 63, JOR: 62, CPV: 61, HAI: 60, CUW: 59,
};

export const DEFAULT_RATING = 70;
export const teamRating = (code: string | null) =>
  (code && TEAM_RATING[code]) || DEFAULT_RATING;

// Aleatoriedad fuera de los componentes (la regla react-hooks/purity prohíbe
// Math.random durante el render; aquí son funciones puras de módulo).
export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
export function pickRandom<T>(arr: T[]): T | undefined {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined;
}

// ─────────────────────────────────────────────────────────────────────
// Posición → línea, y rating heurístico por jugador (determinista y estable).
// No tenemos ratings reales gratis, así que los derivamos del dorsal, el
// club y un hash del nombre. Da variedad y premia elegir a las estrellas.
// ─────────────────────────────────────────────────────────────────────
export function lineOf(position: string | null): Line {
  const p = (position ?? "").toLowerCase();
  if (/porter|arquero|goalkeeper/.test(p)) return "gk";
  if (/defens|back|defen/.test(p)) return "def";
  if (/centro|medio|midfield/.test(p)) return "mid";
  return "fwd";
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function playerRating(p: RawPlayer, base: number): number {
  let r = base - 6 + (hash(p.id || p.name) % 13); // teamBase ±6
  const n = p.number ?? 99;
  if (n >= 1 && n <= 11) r += 3; // dorsales de titular
  if (n === 10) r += 4;
  else if (n === 9 || n === 7) r += 2; // dorsales de estrella
  if (p.club_badge) r += 2; // juega en un club reconocible
  return clamp(Math.round(r), 52, 95);
}

export function toSquad(players: RawPlayer[], teamCode: string | null): SquadPlayer[] {
  const base = teamRating(teamCode);
  return players
    .map((p) => ({
      id: p.id,
      name: p.name,
      number: p.number,
      line: lineOf(p.position),
      club: p.club,
      clubBadge: p.club_badge,
      photo: p.photo_url,
      rating: playerRating(p, base),
    }))
    .sort((a, b) => b.rating - a.rating);
}

// ─────────────────────────────────────────────────────────────────────
// Formaciones: cada hueco tiene línea, etiqueta y coordenadas (% sobre un
// campo vertical; el equipo ataca hacia arriba: y bajo = ataque).
// ─────────────────────────────────────────────────────────────────────
export interface Slot {
  id: string;
  line: Line;
  label: string;
  x: number;
  y: number;
}
export interface Formation {
  key: string;
  name: string;
  slots: Slot[];
}

const s = (id: string, line: Line, label: string, x: number, y: number): Slot => ({ id, line, label, x, y });

export const FORMATIONS: Formation[] = [
  {
    key: "433",
    name: "4-3-3",
    slots: [
      s("gk", "gk", "POR", 50, 90),
      s("d1", "def", "LI", 14, 70), s("d2", "def", "DFC", 38, 73), s("d3", "def", "DFC", 62, 73), s("d4", "def", "LD", 86, 70),
      s("m1", "mid", "MC", 28, 48), s("m2", "mid", "MC", 50, 46), s("m3", "mid", "MC", 72, 48),
      s("f1", "fwd", "EI", 20, 20), s("f2", "fwd", "DC", 50, 15), s("f3", "fwd", "ED", 80, 20),
    ],
  },
  {
    key: "442",
    name: "4-4-2",
    slots: [
      s("gk", "gk", "POR", 50, 90),
      s("d1", "def", "LI", 14, 70), s("d2", "def", "DFC", 38, 73), s("d3", "def", "DFC", 62, 73), s("d4", "def", "LD", 86, 70),
      s("m1", "mid", "MI", 14, 47), s("m2", "mid", "MC", 38, 49), s("m3", "mid", "MC", 62, 49), s("m4", "mid", "MD", 86, 47),
      s("f1", "fwd", "DC", 35, 18), s("f2", "fwd", "DC", 65, 18),
    ],
  },
  {
    key: "4231",
    name: "4-2-3-1",
    slots: [
      s("gk", "gk", "POR", 50, 90),
      s("d1", "def", "LI", 14, 70), s("d2", "def", "DFC", 38, 73), s("d3", "def", "DFC", 62, 73), s("d4", "def", "LD", 86, 70),
      s("m1", "mid", "MCD", 36, 56), s("m2", "mid", "MCD", 64, 56),
      s("m3", "mid", "EI", 18, 35), s("m4", "mid", "MCO", 50, 33), s("m5", "mid", "ED", 82, 35),
      s("f1", "fwd", "DC", 50, 14),
    ],
  },
  {
    key: "352",
    name: "3-5-2",
    slots: [
      s("gk", "gk", "POR", 50, 90),
      s("d1", "def", "DFC", 24, 72), s("d2", "def", "DFC", 50, 74), s("d3", "def", "DFC", 76, 72),
      s("m1", "mid", "CAR", 10, 50), s("m2", "mid", "MC", 33, 47), s("m3", "mid", "MC", 50, 53), s("m4", "mid", "MC", 67, 47), s("m5", "mid", "CAR", 90, 50),
      s("f1", "fwd", "DC", 35, 18), s("f2", "fwd", "DC", 65, 18),
    ],
  },
];

export const formationByKey = (k: string) => FORMATIONS.find((f) => f.key === k) ?? FORMATIONS[0];

// ─────────────────────────────────────────────────────────────────────
// Fuerza de tu equipo a partir del 11 elegido.
// ─────────────────────────────────────────────────────────────────────
export interface LineupStrength {
  attack: number;
  defense: number;
  overall: number;
  chemistry: number; // 0-100
  avgRating: number;
}

export function lineupStrength(picks: (SquadPlayer | null)[], formation: Formation): LineupStrength {
  const chosen = picks.filter(Boolean) as SquadPlayer[];
  if (chosen.length === 0) {
    return { attack: 0, defense: 0, overall: 0, chemistry: 0, avgRating: 0 };
  }

  const avgRating = chosen.reduce((a, p) => a + p.rating, 0) / chosen.length;
  const ratingOf = (group: "att" | "def") => {
    const xs = formation.slots
      .map((slot, i) => ({ slot, p: picks[i] }))
      .filter((x) => x.p && lineGroup(x.slot.line) === group)
      .map((x) => x.p!.rating);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : avgRating;
  };

  const attackers = ratingOf("att");
  const defenders = ratingOf("def");

  // Química: jugadores que comparten club con al menos otro del 11
  // (raro en un 11 de 11 países, pero posible → bonus oculto al rendir).
  const counts = new Map<string, number>();
  for (const p of chosen) if (p.club) counts.set(p.club, (counts.get(p.club) ?? 0) + 1);
  const linked = chosen.filter((p) => p.club && (counts.get(p.club) ?? 0) >= 2).length;
  const chemistry = Math.round((linked / 11) * 100);
  const chemBonus = (chemistry / 100) * 4;

  return {
    attack: Math.round(clamp(attackers + chemBonus, 40, 99)),
    defense: Math.round(clamp(defenders + chemBonus, 40, 99)),
    overall: Math.round(avgRating),
    chemistry,
    avgRating: Math.round(avgRating),
  };
}

// Agrupa líneas para ataque/defensa: el mediocampo cuenta a las dos.
function lineGroup(line: Line): "att" | "def" {
  return line === "fwd" || line === "mid" ? "att" : "def";
}

// ─────────────────────────────────────────────────────────────────────
// PRNG sembrable (mulberry32) — un run es determinista a partir de su semilla,
// así el resultado es estable mientras se revela partido a partido.
// ─────────────────────────────────────────────────────────────────────
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function poisson(lambda: number, rng: () => number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

const xg = (att: number, def: number) => clamp(1.3 * Math.exp((att - def) / 16), 0.18, 4.6);

export interface SimSide {
  team: TeamLite;
  attack: number;
  defense: number;
  overall: number;
  isUser?: boolean;
}

export interface SimMatch {
  home: SimSide;
  away: SimSide;
  homeGoals: number;
  awayGoals: number;
  homePens?: number;
  awayPens?: number;
  winner: "home" | "away"; // tras prórroga/penaltis en eliminatorias
}

function playMatch(home: SimSide, away: SimSide, rng: () => number, knockout: boolean): SimMatch {
  const hg = poisson(xg(home.attack, away.defense), rng);
  const ag = poisson(xg(away.attack, home.defense), rng);
  const winner: "home" | "away" = hg >= ag ? "home" : "away";
  const m: SimMatch = { home, away, homeGoals: hg, awayGoals: ag, winner };
  if (knockout && hg === ag) {
    // Penaltis: probabilidad ponderada por el overall.
    const pHome = home.overall / (home.overall + away.overall);
    // 5 tandas + muerte súbita simplificada
    let hp = 0;
    let ap = 0;
    for (let i = 0; i < 5; i++) {
      if (rng() < 0.55 + (pHome - 0.5) * 0.4) hp++;
      if (rng() < 0.55 - (pHome - 0.5) * 0.4) ap++;
    }
    while (hp === ap) {
      if (rng() < pHome) hp++;
      else ap++;
    }
    m.homePens = hp;
    m.awayPens = ap;
    m.winner = hp > ap ? "home" : "away";
  } else if (knockout) {
    m.winner = hg > ag ? "home" : "away";
  }
  return m;
}

// ─────────────────────────────────────────────────────────────────────
// Tabla de grupo
// ─────────────────────────────────────────────────────────────────────
export interface GroupRow {
  team: TeamLite;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  pts: number;
  isUser?: boolean;
}

export interface KnockoutTie {
  round: string;
  match: SimMatch;
  userWon: boolean;
}

export interface RunResult {
  user: SimSide;
  groupMatches: SimMatch[]; // los 3 del usuario, en orden
  groupTable: GroupRow[];
  advanced: boolean;
  knockout: KnockoutTie[];
  champion: boolean;
  reachedLabel: string; // "Campeón del mundo" | "Subcampeón" | "Cuartos de final"…
}

const KO_ROUNDS = ["Dieciseisavos", "Octavos", "Cuartos", "Semifinal", "Final"];

function sideFor(team: TeamLite, strength: { attack: number; defense: number; overall: number }, isUser = false): SimSide {
  return { team, attack: strength.attack, defense: strength.defense, overall: strength.overall, isUser };
}

function baseStrength(t: TeamLite) {
  const r = teamRating(t.code);
  return { attack: r, defense: r, overall: r };
}

/** Simula el Mundial completo del usuario. `pool` = las otras 47 selecciones. */
export function simulateRun(
  userTeam: TeamLite,
  userStrength: LineupStrength,
  pool: TeamLite[],
  seed: number
): RunResult {
  const rng = mulberry32(seed);
  const pick = (from: TeamLite[]) => from[Math.floor(rng() * from.length)];

  const remaining = [...pool];
  const take = (filter?: (t: TeamLite) => boolean) => {
    const candidates = filter ? remaining.filter(filter) : remaining;
    const list = candidates.length ? candidates : remaining;
    const chosen = pick(list);
    remaining.splice(remaining.indexOf(chosen), 1);
    return chosen;
  };

  const user = sideFor(userTeam, userStrength, true);

  // ── Fase de grupos: 3 rivales, todos contra todos (6 partidos) ──
  const rivals = [take(), take(), take()];
  const sides = [user, ...rivals.map((t) => sideFor(t, baseStrength(t)))];
  const table = new Map<string, GroupRow>();
  for (const s2 of sides)
    table.set(s2.team.id, { team: s2.team, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0, isUser: s2.isUser });

  const record = (a: SimSide, b: SimSide, ag: number, bg: number) => {
    const ra = table.get(a.team.id)!;
    const rb = table.get(b.team.id)!;
    ra.pj++; rb.pj++;
    ra.gf += ag; ra.gc += bg; rb.gf += bg; rb.gc += ag;
    if (ag > bg) { ra.g++; rb.p++; ra.pts += 3; }
    else if (ag < bg) { rb.g++; ra.p++; rb.pts += 3; }
    else { ra.e++; rb.e++; ra.pts++; rb.pts++; }
  };

  const groupMatches: SimMatch[] = [];
  // Partidos del usuario (los que se revelan), en orden.
  for (const r of sides.slice(1)) {
    const m = playMatch(user, r, rng, false);
    groupMatches.push(m);
    record(user, r, m.homeGoals, m.awayGoals);
  }
  // Resto de cruces entre rivales para completar la tabla.
  const rs = sides.slice(1);
  for (let i = 0; i < rs.length; i++)
    for (let j = i + 1; j < rs.length; j++) {
      const m = playMatch(rs[i], rs[j], rng, false);
      record(rs[i], rs[j], m.homeGoals, m.awayGoals);
    }

  const groupTable = [...table.values()].sort(
    (x, y) => y.pts - x.pts || y.gf - y.gc - (x.gf - x.gc) || y.gf - x.gf || x.team.name.localeCompare(y.team.name)
  );
  const userPos = groupTable.findIndex((r) => r.isUser);
  const advanced = userPos < 2; // pasan los dos primeros

  const result: RunResult = {
    user,
    groupMatches,
    groupTable,
    advanced,
    knockout: [],
    champion: false,
    reachedLabel: "",
  };

  if (!advanced) {
    result.reachedLabel = "Eliminado en la fase de grupos";
    return result;
  }

  // ── Eliminatorias ──
  let alive = true;
  for (let i = 0; i < KO_ROUNDS.length && alive; i++) {
    const round = KO_ROUNDS[i];
    // En rondas avanzadas, rivales de más nivel para dar emoción.
    const minRating = i >= 3 ? 74 : i >= 2 ? 70 : 0;
    const opp = take((t) => teamRating(t.code) >= minRating);
    const oppSide = sideFor(opp, baseStrength(opp));
    const m = playMatch(user, oppSide, rng, true);
    const userWon = m.winner === "home";
    result.knockout.push({ round, match: m, userWon });
    if (!userWon) {
      alive = false;
      result.reachedLabel = roundReachedLabel(round, false);
    } else if (round === "Final") {
      result.champion = true;
      result.reachedLabel = "Campeón del mundo";
    }
  }
  return result;
}

function roundReachedLabel(round: string, won: boolean): string {
  if (won && round === "Final") return "Campeón del mundo";
  switch (round) {
    case "Final": return "Subcampeón";
    case "Semifinal": return "Semifinalista";
    case "Cuartos": return "Eliminado en cuartos";
    case "Octavos": return "Eliminado en octavos";
    case "Dieciseisavos": return "Eliminado en dieciseisavos";
    default: return "Eliminado";
  }
}

/** Emoji-medalla del resultado, para la tarjeta de compartir. */
export function resultEmoji(r: RunResult): string {
  if (r.champion) return "🏆";
  if (!r.advanced) return "😞";
  const last = r.knockout.at(-1)?.round;
  if (last === "Final") return "🥈";
  if (last === "Semifinal") return "🥉";
  return "⚽";
}
