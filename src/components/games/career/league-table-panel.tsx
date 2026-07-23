"use client";

import { cn } from "@/lib/utils";
import { getLeague } from "@/lib/games/career/data";
import { relegationSlots } from "@/lib/games/career/league-table";
import type { LeagueRow } from "@/lib/games/career/types";
import { ClubCrest } from "./club-crest";

/**
 * Clasificación completa de la liga con tu club resaltado. Sigue el mismo
 * patrón visual que la tabla de grupo de "El 11 del mundial"
 * (src/components/games/sim-screen.tsx).
 */
export function LeagueTablePanel({
  table,
  leagueId,
  tier,
}: {
  table: LeagueRow[];
  leagueId: string;
  tier: 1 | 2;
}) {
  if (!table.length) return null;
  const league = getLeague(leagueId);
  const down = relegationSlots(table.length);
  const promotionSpots = tier === 2 ? 2 : 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="grid grid-cols-[1.6rem_1fr_1.9rem_1.9rem_2.2rem] gap-1 bg-surface-2 px-3 py-1.5 text-[10px] font-bold uppercase text-muted-foreground">
        <span>#</span>
        <span>{league?.name ?? "Clasificación"}</span>
        <span className="text-center">PJ</span>
        <span className="text-center">DG</span>
        <span className="text-center">Pts</span>
      </div>
      {table.map((row, i) => {
        const position = i + 1;
        const relegating = tier === 1 && position > table.length - down;
        const promoting = position <= promotionSpots;
        return (
          <div
            key={row.clubId}
            className={cn(
              "grid grid-cols-[1.6rem_1fr_1.9rem_1.9rem_2.2rem] items-center gap-1 px-3 py-1.5 text-sm",
              row.isUser ? "bg-pulpo-500/15 font-bold" : "bg-surface/40"
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold",
                position === 1
                  ? "bg-warning/25 text-warning"
                  : promoting
                  ? "bg-pitch-500/25 text-pitch-400"
                  : relegating
                  ? "bg-danger/20 text-danger"
                  : "text-muted-foreground"
              )}
            >
              {position}
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <ClubCrest club={{ ...row, id: row.clubId, short: row.name, rep: [0, 0, 0] }} size={20} />
              <span className="truncate">{row.name}</span>
              {row.isUser && <span className="shrink-0 text-[9px] font-bold text-pulpo-300">TÚ</span>}
            </span>
            <span className="text-center tabular-nums text-muted">{row.played}</span>
            <span className="text-center tabular-nums text-muted">{formatDiff(row.gf - row.ga)}</span>
            <span className="text-center tabular-nums font-extrabold">{row.points}</span>
          </div>
        );
      })}
      <p className="bg-surface-2/60 px-3 py-1.5 text-[10px] text-muted-foreground">
        {tier === 2
          ? `El campeón asciende a primera.`
          : `Los ${down} últimos descienden.`}
      </p>
    </div>
  );
}

function formatDiff(diff: number): string {
  return diff > 0 ? `+${diff}` : `${diff}`;
}
