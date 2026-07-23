// ╔══════════════════════════════════════════════════════════════════╗
// ║  Premios individuales                                              ║
// ║                                                                    ║
// ║  Mejora sobre el original: además de decirte si ganaste el Balón   ║
// ║  de Oro, montamos el top 5 con rivales generados, para que sepas   ║
// ║  contra quién competías y por cuánto se te escapó.                 ║
// ║                                                                    ║
// ║  El ganador NO se decide aquí: lo decide la tirada de probabilidad ║
// ║  del motor. Esta lista se ordena para respetar ese resultado.      ║
// ╚══════════════════════════════════════════════════════════════════╝
import { ALL_CLUBS, getClub, leagueOf } from "./data";
import { float, int, pick, type Rng } from "./rng";
import type { BallonDorEntry, PlayStyle, Stats, Trophy } from "./types";

/** Apellidos de relleno para los rivales: suenan a futbolista, no a nadie real. */
const RIVAL_NAMES = [
  "Halbrand", "Ferreiro", "Vandekamp", "Okonjo", "Brandão", "Salvatierra",
  "Mihajlov", "Ellison", "Duartes", "Nkemba", "Rossetti", "Kovač",
  "Almeyda", "Lindqvist", "Berrios", "Tanaka", "Oyelaran", "Sorrentino",
  "Vasilyev", "Mendieta", "Kovalenko", "Adeyemi", "Bouchard", "Ferrán",
  "Castelli", "Diakhaby", "Novak", "Reinders", "Silvestre", "Zambrano",
];

/** Los clubes donde de verdad se pelea un Balón de Oro. */
const ELITE_CLUBS = ALL_CLUBS.filter((c) => c.rep[1] >= 3);

/**
 * Puntuación de una temporada de cara al Balón de Oro. Mezcla nivel,
 * números y títulos: es lo que la prensa mira.
 */
export function ballonDorScore(
  overall: number,
  stats: Stats,
  trophies: Trophy[],
  style: PlayStyle
): number {
  const production =
    style === "goalkeeper"
      ? stats.cleanSheets * 2.2
      : stats.goals * 2 + stats.assists * 1.2;
  const silverware =
    (trophies.includes("continental_primary") ? 26 : 0) +
    (trophies.includes("league") ? 16 : 0) +
    (trophies.includes("world_cup") ? 30 : 0) +
    (trophies.includes("national_continental") ? 14 : 0) +
    (trophies.includes("cup") ? 5 : 0);
  return Math.round(overall * 1.6 + production + silverware);
}

interface PodiumInput {
  rng: Rng;
  /** Puntuación del jugador. */
  userScore: number;
  userName: string;
  userClubId: string | null;
  userCountryCode: string;
  /** El motor ya decidió si lo ganas. */
  userWins: boolean;
}

/**
 * Top 5 del Balón de Oro. Los rivales se generan alrededor de tu puntuación
 * para que la clasificación se lea apretada, y después se coloca al ganador
 * que el motor ya había decidido.
 */
export function buildBallonDorPodium({
  rng,
  userScore,
  userName,
  userClubId,
  userCountryCode,
  userWins,
}: PodiumInput): { rng: Rng; podium: BallonDorEntry[] } {
  let r = rng;
  const rivals: BallonDorEntry[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < 4; i++) {
    let name = "";
    for (let attempt = 0; attempt < 6; attempt++) {
      const roll = pick(r, RIVAL_NAMES);
      r = roll.rng;
      if (!usedNames.has(roll.value)) {
        name = roll.value;
        break;
      }
    }
    if (!name) name = `Jugador ${i + 1}`;
    usedNames.add(name);

    const clubRoll = pick(r, ELITE_CLUBS.length ? ELITE_CLUBS : ALL_CLUBS);
    r = clubRoll.rng;

    // Rivales creíbles: rondan tu puntuación, algunos por encima.
    const spread = float(r, -0.22, 0.16);
    r = spread.rng;
    const initial = pick(r, ["A.", "B.", "C.", "D.", "E.", "F.", "G.", "J.", "L.", "M.", "N.", "R.", "S.", "T."]);
    r = initial.rng;

    rivals.push({
      name: `${initial.value} ${name}`,
      clubName: clubRoll.value.short,
      countryCode: countryOfClub(clubRoll.value.id),
      score: Math.max(1, Math.round(userScore * (1 + spread.value))),
      isUser: false,
    });
  }

  const user: BallonDorEntry = {
    name: userName,
    clubName: getClub(userClubId ?? "")?.short ?? "Sin club",
    countryCode: userCountryCode,
    score: userScore,
    isUser: true,
  };

  const podium = [...rivals, user].sort((a, b) => b.score - a.score);

  // Respetamos el veredicto del motor: si ganaste, sales primero (y con la
  // puntuación más alta); si no, alguien tiene que estar por encima.
  const userIndex = podium.findIndex((e) => e.isUser);
  const margin = int(r, 1, 12);
  r = margin.rng;
  if (userWins && userIndex > 0) {
    user.score = podium[0].score + margin.value;
    podium.sort((a, b) => b.score - a.score);
  } else if (!userWins && userIndex === 0) {
    podium[1].score = user.score + margin.value;
    podium.sort((a, b) => b.score - a.score);
  }

  return { rng: r, podium };
}

/** Código FIFA del país de la liga del club, para pintar su bandera. */
function countryOfClub(clubId: string): string {
  return leagueOf(clubId)?.country ?? "";
}
