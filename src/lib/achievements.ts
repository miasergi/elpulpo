import type { PlayerStats } from "@/lib/stats";

export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  unlocked: boolean;
  current: number;
  target: number;
}

/** Derives the player's medals purely from their stats (no guessing). */
export function computeAchievements(stats: PlayerStats): Achievement[] {
  const def = (
    id: string,
    emoji: string,
    title: string,
    desc: string,
    current: number,
    target: number
  ): Achievement => ({ id, emoji, title, desc, current: Math.min(current, target), target, unlocked: current >= target });

  return [
    def("debut", "🎟️", "Debutante", "Haz tu primera predicción", stats.played, 1),
    def("first_exact", "🎯", "Ojo de pulpo", "Acierta un marcador exacto", stats.exacts, 1),
    def("streak3", "🔥", "En racha", "3 aciertos seguidos", stats.bestStreak, 3),
    def("streak5", "⚡", "Imparable", "5 aciertos seguidos", stats.bestStreak, 5),
    def("seer5", "🔮", "Vidente", "5 marcadores exactos", stats.exacts, 5),
    def("oracle10", "🐙", "El Oráculo", "10 marcadores exactos", stats.exacts, 10),
    def("pts50", "⭐", "Puntería", "Suma 50 puntos", stats.points, 50),
    def("pts100", "👑", "Centurión", "Suma 100 puntos", stats.points, 100),
    def(
      "sharp",
      "🎓",
      "Certero",
      "60% de acierto (mín. 5 partidos)",
      stats.played >= 5 && stats.accuracy >= 0.6 ? 1 : 0,
      1
    ),
  ];
}
