// ╔══════════════════════════════════════════════════════════════════╗
// ║  Logros del Simulador de Carrera                                   ║
// ║                                                                    ║
// ║  Se derivan de la carrera terminada, igual que los del perfil se   ║
// ║  derivan de las estadísticas (ver src/lib/achievements.ts). No se  ║
// ║  guardan aparte: se recalculan al abrir el resumen.                ║
// ╚══════════════════════════════════════════════════════════════════╝
import { clubHistory, peakMarketValue, peakOverall, trophyCount } from "./engine";
import type { CareerState } from "./types";

export interface CareerAchievement {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  unlocked: boolean;
}

export function careerAchievements(state: CareerState): CareerAchievement[] {
  const trophies = trophyCount(state);
  const totals = state.totals;
  const peak = peakOverall(state);
  const value = peakMarketValue(state);
  const clubs = clubHistory(state);
  const countries = new Set(state.seasons.map((s) => s.leagueId));
  const callUps = state.seasons.filter((s) => s.national).length;
  const ballonDors = state.seasons.filter((s) => s.awards.includes("ballon_dor")).length;
  const debutAge = state.seasons[0]?.age ?? 99;
  const longestSpell = clubs.reduce((max, c) => Math.max(max, c.seasons), 0);

  const def = (id: string, emoji: string, title: string, desc: string, unlocked: boolean): CareerAchievement =>
    ({ id, emoji, title, desc, unlocked });

  return [
    def("debut", "👶", "Debut", "Juega tu primera temporada", totals.seasons >= 1),
    def("wonderkid", "✨", "Perla", "Debuta con 17 años o menos", debutAge <= 17),
    def("league", "🏆", "Campeón", "Gana una liga", trophies.league > 0),
    def("treble", "🎖️", "Triplete", "Liga, copa y copa continental el mismo año",
      state.seasons.some((s) =>
        s.trophies.includes("league") && s.trophies.includes("cup") && s.trophies.includes("continental_primary")
      )),
    def("continental", "🌍", "Rey de Europa", "Gana una copa continental", trophies.continental_primary > 0),
    def("world_cup", "🌐", "Campeón del mundo", "Gana el Mundial", trophies.world_cup > 0),
    def("ballon_dor", "🥇", "Balón de Oro", "Gana el Balón de Oro", ballonDors > 0),
    def("ballon_dor_x3", "👑", "Leyenda viva", "Gana tres Balones de Oro", ballonDors >= 3),
    def("century", "💯", "Centenario", "Marca 100 goles en tu carrera", totals.goals >= 100),
    def("iron", "🦾", "De hierro", "Juega 500 partidos", totals.appearances >= 500),
    def("legend", "⭐", "Clase mundial", "Llega a 90 de media", peak >= 90),
    def("galactico", "💰", "Galáctico", "Vale más de 100 millones", value >= 100_000_000),
    def("loyal", "🛡️", "Un solo escudo", "Diez temporadas seguidas en el mismo club", longestSpell >= 10),
    def("nomad", "🧳", "Trotamundos", "Juega en cinco ligas distintas", countries.size >= 5),
    def("international", "🎽", "Internacional", "Disputa cinco torneos con tu selección", callUps >= 5),
    def("promotion", "📈", "Ascenso", "Sube de segunda a primera", state.seasons.some((s) => s.promoted)),
    def("survivor", "🕰️", "Hasta el final", "Retírate con 38 años o más", (state.retirement?.age ?? 0) >= 38),
  ];
}

/** Los logros conseguidos, para el resumen y para compartir. */
export function unlockedAchievements(state: CareerState): CareerAchievement[] {
  return careerAchievements(state).filter((a) => a.unlocked);
}

/**
 * Una frase que resume la carrera de un vistazo. Es lo que se lee primero
 * en el resumen y en la imagen que se comparte.
 */
export function careerVerdict(state: CareerState): string {
  const trophies = trophyCount(state);
  const peak = peakOverall(state);
  const ballonDors = state.seasons.filter((s) => s.awards.includes("ballon_dor")).length;

  if (ballonDors >= 3) return "Uno de los mejores de la historia";
  if (trophies.world_cup > 0 && ballonDors > 0) return "Leyenda mundial";
  if (ballonDors > 0) return "Balón de Oro";
  if (trophies.world_cup > 0) return "Campeón del mundo";
  if (trophies.continental_primary > 0) return "Campeón de Europa";
  if (peak >= 88) return "Estrella mundial";
  if (trophies.league >= 3) return "Ídolo de su club";
  if (trophies.league > 0) return "Campeón de liga";
  if (peak >= 78) return "Buen profesional";
  if (peak >= 70) return "Carrera digna";
  return "Una vida en el fútbol";
}

/** Emoji que acompaña al veredicto. */
export function verdictEmoji(state: CareerState): string {
  const trophies = trophyCount(state);
  const ballonDors = state.seasons.filter((s) => s.awards.includes("ballon_dor")).length;
  if (ballonDors >= 3) return "👑";
  if (trophies.world_cup > 0) return "🌐";
  if (ballonDors > 0) return "🥇";
  if (trophies.continental_primary > 0) return "🌍";
  if (trophies.league > 0) return "🏆";
  return "⚽";
}
