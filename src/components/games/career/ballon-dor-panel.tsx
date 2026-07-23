"use client";

import { cn } from "@/lib/utils";
import type { BallonDorEntry } from "@/lib/games/career/types";

const MEDALS = ["🥇", "🥈", "🥉", "4.º", "5.º"];

/**
 * Top 5 del Balón de Oro. El original solo decía si lo ganabas; aquí ves
 * contra quién competías y por cuántos puntos se decidió.
 */
export function BallonDorPanel({ podium }: { podium: BallonDorEntry[] }) {
  const winnerScore = podium[0]?.score ?? 0;

  return (
    <div className="rounded-xl border border-border bg-surface/60 p-4">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-pulpo-300">
        Balón de Oro
      </p>
      <div className="space-y-1.5">
        {podium.map((entry, i) => (
          <div
            key={`${entry.name}-${i}`}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm",
              entry.isUser ? "bg-pulpo-500/15 font-bold" : ""
            )}
          >
            <span className="w-6 shrink-0 text-center text-xs">{MEDALS[i] ?? `${i + 1}.º`}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate">{entry.name}</span>
              <span className="block truncate text-[10px] text-muted-foreground">{entry.clubName}</span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-xs font-extrabold tabular-nums">{entry.score}</span>
              {i > 0 && (
                <span className="block text-[10px] tabular-nums text-muted-foreground">
                  −{winnerScore - entry.score}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
