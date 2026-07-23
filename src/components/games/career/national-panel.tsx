"use client";

import { cn } from "@/lib/utils";
import { getCountry } from "@/lib/games/career/data";
import { flagUrl } from "@/lib/games/career/countries.data";
import type { NationalRun } from "@/lib/games/career/types";

/**
 * El recorrido de tu selección en el torneo, partido a partido. Es la mejora
 * más visible sobre el original, que solo decía si el torneo se ganaba.
 */
export function NationalPanel({ run, countryCode }: { run: NationalRun; countryCode: string }) {
  const country = getCountry(countryCode);
  const champion = run.won;

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        champion
          ? "border-warning/50 bg-gradient-to-br from-warning/15 via-surface/70 to-surface/50"
          : "border-border bg-surface/60"
      )}
    >
      <div className="flex items-center gap-2.5">
        {country && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={flagUrl(country)}
            alt=""
            width={30}
            height={22}
            className="h-[22px] w-[30px] shrink-0 rounded-sm object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-pulpo-300">{run.tournament}</p>
          <p className={cn("text-sm font-extrabold", champion ? "text-warning" : "text-foreground")}>
            {champion ? "¡Campeones!" : run.reachedLabel}
          </p>
        </div>
        <span className="shrink-0 text-2xl">{champion ? "🏆" : run.reachedLabel === "Subcampeón" ? "🥈" : "⚽"}</span>
      </div>

      <div className="mt-3 space-y-1">
        {run.matches.map((m, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-[5.5rem] shrink-0 truncate text-[10px] uppercase tracking-wide text-muted-foreground">
              {m.stage}
            </span>
            <span className="min-w-0 flex-1 truncate text-muted">{m.rivalName}</span>
            <span
              className={cn(
                "shrink-0 rounded px-1.5 py-0.5 font-extrabold tabular-nums",
                m.won ? "bg-pitch-500/20 text-pitch-400" : "bg-danger/15 text-danger"
              )}
            >
              {m.goalsFor}–{m.goalsAgainst}
              {m.penaltiesFor != null && (
                <span className="ml-1 text-[10px] font-semibold opacity-80">
                  ({m.penaltiesFor}–{m.penaltiesAgainst}p)
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      {(run.stats.goals > 0 || run.stats.assists > 0 || run.stats.cleanSheets > 0) && (
        <p className="mt-3 border-t border-border/60 pt-2 text-[11px] text-muted">
          Tu aportación:{" "}
          <span className="font-bold text-foreground">
            {[
              run.stats.goals > 0 && `${run.stats.goals} ${run.stats.goals === 1 ? "gol" : "goles"}`,
              run.stats.assists > 0 && `${run.stats.assists} ${run.stats.assists === 1 ? "asistencia" : "asistencias"}`,
              run.stats.cleanSheets > 0 && `${run.stats.cleanSheets} a cero`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </p>
      )}
    </div>
  );
}
