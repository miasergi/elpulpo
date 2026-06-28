import { Target, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { advancingTeam } from "@/lib/scoring";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { MatchPrediction } from "@/lib/queries";

function outcome(
  ph: number,
  pa: number,
  ah: number,
  aa: number,
  predictedWinnerTeamId: string | null,
  actualWinnerTeamId: string | null,
  homeTeamId: string | null,
  awayTeamId: string | null,
  awardAdvance: boolean
) {
  if (ph === ah && pa === aa) return { Icon: Target, label: "Exacto", variant: "accent" as const };
  if (Math.sign(ph - pa) === Math.sign(ah - aa)) return { Icon: Check, label: "Acerto", variant: "success" as const };
  if (awardAdvance) {
    const predictedAdvancer = advancingTeam(ph, pa, homeTeamId, awayTeamId, predictedWinnerTeamId);
    const actualAdvancer = advancingTeam(ah, aa, homeTeamId, awayTeamId, actualWinnerTeamId);
    if (predictedAdvancer && predictedAdvancer === actualAdvancer)
      return { Icon: Check, label: "Pasa", variant: "success" as const };
  }
  return { Icon: X, label: "Fallo", variant: "danger" as const };
}

export function PredictionsList({
  predictions,
  actualHome,
  actualAway,
  actualWinnerTeamId,
  homeTeamId,
  awayTeamId,
  homeName,
  awayName,
  awardAdvance,
  currentUserId,
}: {
  predictions: MatchPrediction[];
  actualHome: number | null;
  actualAway: number | null;
  actualWinnerTeamId: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeName: string;
  awayName: string;
  awardAdvance: boolean;
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
        const o = resolved
          ? outcome(
              p.home_score,
              p.away_score,
              actualHome!,
              actualAway!,
              p.winner_team_id,
              actualWinnerTeamId,
              homeTeamId,
              awayTeamId,
              awardAdvance
            )
          : null;
        const predictedWinnerName =
          p.winner_team_id === homeTeamId ? homeName : p.winner_team_id === awayTeamId ? awayName : null;
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
              {p.display_name} {isMe && <span className="text-xs text-muted">(tu)</span>}
            </span>
            {o && (
              <Badge variant={o.variant}>
                <o.Icon className="h-3 w-3" /> {o.label}
              </Badge>
            )}
            <span className="w-12 text-center text-base font-bold tabular-nums">
              {p.home_score}-{p.away_score}
            </span>
            {awardAdvance && p.home_score === p.away_score && predictedWinnerName && (
              <span className="hidden w-16 truncate text-right text-[11px] text-muted-foreground sm:block">
                pasa {predictedWinnerName}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
