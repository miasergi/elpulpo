// ╔══════════════════════════════════════════════════════════════════╗
// ║  Clasificación de liga (mejora sobre el juego original)            ║
// ║                                                                    ║
// ║  El original solo te decía si ganabas la liga. Aquí montamos la    ║
// ║  tabla entera para que veas en qué puesto quedó tu equipo, contra  ║
// ║  quién peleaste y por qué desciendes o asciendes.                  ║
// ║                                                                    ║
// ║  No simulamos los 380 partidos: repartimos puntos a partir de la   ║
// ║  fuerza de cada club más un ruido de temporada, y luego derivamos  ║
// ║  victorias, empates y goles coherentes con esos puntos. Sale una   ║
// ║  tabla creíble a un coste ínfimo.                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
import { float, next, type Rng } from "./rng";
import { getClub, leagueOf, leaguesOfCountry } from "./data";
import type { CareerClub, CareerLeague, LeagueRow, SquadRole } from "./types";

/** Cuántos equipos bajan, según el tamaño de la liga. */
export function relegationSlots(size: number): number {
  return size >= 20 ? 3 : size >= 14 ? 2 : 1;
}

/** Fuerza base de un club: nivel deportivo + poderío para pelear títulos. */
function clubStrength(club: CareerClub): number {
  return 30 + club.rep[2] * 11 + club.rep[0] * 3;
}

/**
 * Cuánto empuja el jugador a su equipo. Un crack titular arrastra al club
 * varios puestos; un suplente no mueve la aguja.
 */
export function userLift(gap: number, role: SquadRole): number {
  const weight = role === "starter" ? 1 : role === "high_rotation" ? 0.55 : role === "low_rotation" ? 0.25 : 0;
  return Math.max(-4, Math.min(12, gap * 0.7)) * weight;
}

/**
 * La liga en la que juega el club ahora mismo. Si ascendió o descendió,
 * es la otra división de su país.
 */
export function currentLeague(clubId: string, tier: 1 | 2): CareerLeague | null {
  const home = leagueOf(clubId);
  if (!home) return null;
  if (home.tier === tier) return home;
  return leaguesOfCountry(home.country, tier)[0] ?? home;
}

/**
 * Los rivales de esa liga esta temporada. Si el club llega de otra división,
 * entra en el grupo a costa del más flojo, para no inflar el tamaño.
 */
function participants(league: CareerLeague, userClub: CareerClub): CareerClub[] {
  if (league.clubs.some((c) => c.id === userClub.id)) return league.clubs;
  const rest = [...league.clubs].sort((a, b) => clubStrength(b) - clubStrength(a)).slice(0, -1);
  return [userClub, ...rest];
}

interface TableInput {
  rng: Rng;
  clubId: string;
  tier: 1 | 2;
  /** Empuje del jugador sobre su club. */
  lift: number;
  /** El motor ya decidió si ganaste la liga; la tabla debe respetarlo. */
  champion: boolean;
}

export interface TableResult {
  rng: Rng;
  league: CareerLeague;
  table: LeagueRow[];
  position: number;
  relegated: boolean;
  promoted: boolean;
}

export function buildLeagueTable({ rng, clubId, tier, lift, champion }: TableInput): TableResult | null {
  const club = getClub(clubId);
  const league = club && currentLeague(clubId, tier);
  if (!club || !league) return null;

  const clubs = participants(league, club);
  const games = Math.max(2, (clubs.length - 1) * 2);

  // Fuerza de cada club con su ruido de temporada (rachas, lesiones, fichajes).
  let r = rng;
  const rated = clubs.map((c) => {
    const noise = float(r, -7, 7);
    r = noise.rng;
    const own = clubStrength(c) + (c.id === club.id ? lift : 0);
    return { club: c, strength: own + noise.value };
  });

  const mean = rated.reduce((n, x) => n + x.strength, 0) / rated.length;
  const spread =
    Math.sqrt(rated.reduce((n, x) => n + (x.strength - mean) ** 2, 0) / rated.length) || 1;

  const rows = rated.map(({ club: c, strength }) => {
    const z = (strength - mean) / spread;
    const ppg = Math.max(0.45, Math.min(2.55, 1.35 + z * 0.42));
    const points = Math.round(ppg * games);

    // Empates plausibles, y de ahí victorias y derrotas que cuadren.
    let drawn = Math.round(games * (0.26 - Math.abs(z) * 0.05));
    drawn = Math.max(0, Math.min(games, drawn));
    let won = Math.round((points - drawn) / 3);
    won = Math.max(0, Math.min(games - drawn, won));
    const lost = games - won - drawn;

    const gf = Math.max(games / 4, Math.round(games * (1.05 + z * 0.4)));
    const ga = Math.max(games / 4, Math.round(games * (1.45 - z * 0.4)));

    return {
      clubId: c.id,
      name: c.name,
      abbr: c.abbr,
      crest: c.crest,
      played: games,
      won,
      drawn,
      lost,
      gf,
      ga,
      points: won * 3 + drawn,
      isUser: c.id === club.id,
    } satisfies LeagueRow;
  });

  rows.sort((a, b) => b.points - a.points || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf);

  // El título ya está decidido: si lo ganaste, tienes que salir primero;
  // si no, no puedes salir primero.
  const userIndex = rows.findIndex((x) => x.isUser);
  if (champion && userIndex > 0) {
    swap(rows, 0, userIndex);
  } else if (!champion && userIndex === 0 && rows.length > 1) {
    swap(rows, 0, 1);
  }

  // Deja los puntos monótonos tras el intercambio para que la tabla se lea bien.
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].points > rows[i - 1].points) rows[i].points = rows[i - 1].points;
  }

  const position = rows.findIndex((x) => x.isUser) + 1;
  const down = relegationSlots(rows.length);
  const hasLowerTier = leaguesOfCountry(league.country, 2).length > 0;

  return {
    rng: r,
    league,
    table: rows,
    position,
    relegated: tier === 1 && hasLowerTier && position > rows.length - down,
    promoted: tier === 2 && position === 1,
  };
}

function swap<T>(arr: T[], i: number, j: number) {
  const t = arr[i];
  arr[i] = arr[j];
  arr[j] = t;
}

/** Ruido reproducible independiente del hilo principal de la carrera. */
export function noiseFrom(rng: Rng): { rng: Rng; value: number } {
  return next(rng);
}
