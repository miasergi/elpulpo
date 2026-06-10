import { cn } from "@/lib/utils";
import type { Achievement } from "@/lib/achievements";

export function AchievementsGrid({ achievements }: { achievements: Achievement[] }) {
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-muted">Logros</p>
        <span className="text-xs text-muted-foreground">
          {unlocked}/{achievements.length}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {achievements.map((a) => (
          <div
            key={a.id}
            className={cn(
              "flex flex-col items-center rounded-lg border p-3 text-center transition-colors",
              a.unlocked ? "border-primary/40 bg-primary/10" : "border-border bg-surface/40"
            )}
          >
            <span className={cn("text-2xl", !a.unlocked && "opacity-30 grayscale")}>{a.emoji}</span>
            <p className={cn("mt-1 text-[11px] font-semibold leading-tight", !a.unlocked && "text-muted-foreground")}>
              {a.title}
            </p>
            {a.unlocked ? (
              <p className="text-[10px] text-pitch-400">¡Conseguido!</p>
            ) : a.target > 1 ? (
              <p className="text-[10px] text-muted-foreground tabular-nums">
                {a.current}/{a.target}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground">Bloqueado</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
