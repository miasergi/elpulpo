import { cn } from "@/lib/utils";
import type { MatchPrediction } from "@/lib/queries";

export function PredictionDistribution({
  predictions,
  homeName,
  awayName,
}: {
  predictions: MatchPrediction[];
  homeName: string;
  awayName: string;
}) {
  const total = predictions.length;
  if (total < 2) return null;

  let home = 0, draw = 0, away = 0;
  const scores = new Map<string, number>();
  for (const p of predictions) {
    if (p.home_score > p.away_score) home++;
    else if (p.home_score < p.away_score) away++;
    else draw++;
    const key = `${p.home_score}-${p.away_score}`;
    scores.set(key, (scores.get(key) ?? 0) + 1);
  }

  const pct = (n: number) => Math.round((n / total) * 100);
  const topScores = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  const bars = [
    { label: homeName, n: home, color: "bg-pulpo-500" },
    { label: "Empate", n: draw, color: "bg-muted-foreground" },
    { label: awayName, n: away, color: "bg-orange-500" },
  ];

  return (
    <div className="mb-5 rounded-lg border border-border bg-surface/60 p-4">
      <p className="mb-3 text-sm font-medium text-muted">Cómo predijo el grupo</p>
      <div className="space-y-2">
        {bars.map((b) => (
          <div key={b.label} className="flex items-center gap-2">
            <span className="w-20 truncate text-xs text-muted">{b.label}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-3">
              <div className={cn("h-full rounded-full", b.color)} style={{ width: `${pct(b.n)}%` }} />
            </div>
            <span className="w-9 text-right text-xs font-semibold tabular-nums">{pct(b.n)}%</span>
          </div>
        ))}
      </div>
      {topScores.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
          <span className="text-xs text-muted-foreground">Más votados:</span>
          {topScores.map(([score, n]) => (
            <span key={score} className="rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium">
              {score} <span className="text-muted-foreground">×{n}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
