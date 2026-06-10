import { Target, Percent, Flame, Trophy, CheckCircle2, Activity } from "lucide-react";
import type { PlayerStats } from "@/lib/stats";

export function StatsGrid({ stats }: { stats: PlayerStats }) {
  const items = [
    { icon: Activity, label: "Predichos", value: stats.played, color: "text-pulpo-300" },
    { icon: Trophy, label: "Puntos", value: stats.points, color: "text-pitch-400" },
    { icon: Target, label: "Exactos", value: stats.exacts, color: "text-pitch-400" },
    { icon: CheckCircle2, label: "Aciertos", value: stats.results, color: "text-info" },
    { icon: Percent, label: "% acierto", value: `${Math.round(stats.accuracy * 100)}%`, color: "text-warning" },
    { icon: Flame, label: "Mejor racha", value: stats.bestStreak, color: "text-danger" },
  ];

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-muted">Tus estadísticas</p>
      {stats.played === 0 ? (
        <div className="rounded-lg border border-border bg-surface/50 p-5 text-center text-sm text-muted">
          Aún no hay partidos terminados que hayas predicho. ¡Empieza a jugar! 🐙
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {items.map((it) => (
            <div key={it.label} className="rounded-lg border border-border bg-surface/50 p-3 text-center">
              <it.icon className={`mx-auto h-5 w-5 ${it.color}`} />
              <p className="mt-1.5 text-xl font-bold tabular-nums">{it.value}</p>
              <p className="text-[11px] text-muted-foreground">{it.label}</p>
            </div>
          ))}
        </div>
      )}
      {stats.currentStreak >= 2 && (
        <p className="mt-2 text-center text-xs text-pitch-400">
          🔥 ¡Racha de {stats.currentStreak} aciertos seguidos!
        </p>
      )}
    </div>
  );
}
