import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { MatchPrediction } from "@/lib/queries";

function outcome(ph: number, pa: number, ah: number, aa: number) {
  if (ph === ah && pa === aa) return { label: "🎯 Exacto", variant: "accent" as const };
  if (Math.sign(ph - pa) === Math.sign(ah - aa)) return { label: "✅ Acertó", variant: "success" as const };
  return { label: "❌ Falló", variant: "danger" as const };
}

export function PredictionsList({
  predictions,
  actualHome,
  actualAway,
  currentUserId,
}: {
  predictions: MatchPrediction[];
  actualHome: number | null;
  actualAway: number | null;
  currentUserId: string;
}) {
  const resolved = actualHome != null && actualAway != null;

  if (predictions.length === 0) {
    return (
      <p className="mt-8 text-center text-sm text-muted">
        Nadie de tus grupos predijo este partido.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="mb-2 text-sm font-medium text-muted">
        Predicciones ({predictions.length})
      </p>
      {predictions.map((p) => {
        const isMe = p.user_id === currentUserId;
        const o = resolved ? outcome(p.home_score, p.away_score, actualHome!, actualAway!) : null;
        return (
          <div
            key={p.user_id}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-2.5",
              isMe ? "border-primary/60 bg-primary/10" : "border-border bg-surface/50"
            )}
          >
            <Avatar src={p.avatar_url} name={p.display_name} size={32} />
            <span className="flex-1 truncate text-sm font-medium">
              {p.display_name} {isMe && <span className="text-xs text-muted">(tú)</span>}
            </span>
            {o && <Badge variant={o.variant}>{o.label}</Badge>}
            <span className="w-12 text-center text-base font-bold tabular-nums">
              {p.home_score}-{p.away_score}
            </span>
          </div>
        );
      })}
    </div>
  );
}
