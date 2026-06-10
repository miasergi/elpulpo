import { Medal, BarChart3 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { StandingRow } from "@/lib/groups";

const MEDAL_COLOR = ["text-[#f5c542]", "text-[#cbd5e1]", "text-[#cd7f32]"];

export function StandingsList({
  rows,
  currentUserId,
}: {
  rows: StandingRow[];
  currentUserId: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="mt-10 text-center text-sm text-muted">
        <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3">Aún no hay puntos. ¡Empieza a predecir partidos!</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {rows.map((r) => {
        const isMe = r.user_id === currentUserId;
        return (
          <div
            key={r.user_id}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3",
              isMe ? "border-primary/60 bg-primary/10" : "border-border bg-surface/50"
            )}
          >
            <div className="flex w-7 shrink-0 items-center justify-center text-lg font-bold tabular-nums">
              {r.rank <= 3 ? (
                <Medal className={cn("h-5 w-5", MEDAL_COLOR[r.rank - 1])} />
              ) : (
                <span className="text-muted">{r.rank}</span>
              )}
            </div>
            <Avatar src={r.avatar_url} name={r.display_name} size={36} />
            <div className="min-w-0 flex-1">
              <p className={cn("truncate font-semibold", isMe && "text-pulpo-200")}>
                {r.display_name} {isMe && <span className="text-xs text-muted">(tú)</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {r.played} jugados · {r.exacts} exactos
                {r.bonus_points > 0 && ` · +${r.bonus_points} bonus`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold tabular-nums">{r.total_points}</p>
              <p className="text-[10px] text-muted-foreground">pts</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
