"use client";

import { useState } from "react";
import { ChevronDown, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getClub, getLeague } from "@/lib/games/career/data";
import {
  AWARD_EMOJI,
  AWARD_NAME,
  ROLE_NAME,
  formatPosition,
  formatValue,
  trophyLabel,
} from "@/lib/games/career/text";
import type { SeasonSnapshot } from "@/lib/games/career/types";
import { ClubCrest } from "./club-crest";
import { LeagueTablePanel } from "./league-table-panel";
import { NationalPanel } from "./national-panel";
import { BallonDorPanel } from "./ballon-dor-panel";

/**
 * Una temporada, contada de un vistazo: dónde jugaste, cómo te fue, en qué
 * puesto quedó tu equipo y qué levantaste. La tabla y el torneo se despliegan
 * para no ahogar la pantalla en un móvil.
 */
export function SeasonReveal({
  season,
  countryCode,
  isKeeper,
  previousOverall,
  defaultOpen = false,
}: {
  season: SeasonSnapshot;
  countryCode: string;
  /** Los porteros enseñan porterías a cero y goles encajados, no goles. */
  isKeeper: boolean;
  previousOverall?: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const club = getClub(season.clubId);
  const league = getLeague(season.leagueId);
  const delta = previousOverall != null ? season.overall - previousOverall : 0;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-surface/60",
        season.trophies.length ? "border-warning/35" : season.relegated ? "border-danger/35" : "border-border"
      )}
    >
      <div className="flex items-center gap-3 p-4">
        <ClubCrest club={club} size={42} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-bold text-pulpo-300">{season.age} años</span>
            {season.onLoan && <span className="rounded bg-surface-3 px-1 text-[9px] font-bold">CEDIDO</span>}
          </p>
          <p className="truncate text-sm font-extrabold">{club?.name ?? "Sin club"}</p>
          <p className="truncate text-[11px] text-muted">
            {league?.name}
            {season.leaguePosition > 0 && ` · ${formatPosition(season.leaguePosition)}`}
            {` · ${ROLE_NAME[season.role]}`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-black tabular-nums">{season.overall}</p>
          {delta !== 0 && (
            <p
              className={cn(
                "flex items-center justify-end gap-0.5 text-[10px] font-bold tabular-nums",
                delta > 0 ? "text-pitch-400" : "text-danger"
              )}
            >
              {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {delta > 0 ? `+${delta}` : delta}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-px border-y border-border/60 bg-border/60">
        <Stat label="PJ" value={season.stats.appearances} />
        {isKeeper ? (
          <>
            <Stat label="A cero" value={season.stats.cleanSheets} />
            <Stat label="Encajados" value={season.stats.goalsConceded} />
          </>
        ) : (
          <>
            <Stat label="Goles" value={season.stats.goals} />
            <Stat label="Asist." value={season.stats.assists} />
          </>
        )}
        <Stat label="Valor" value={formatValue(season.marketValue)} />
      </div>

      {(season.trophies.length > 0 || season.awards.length > 0 || season.relegated || season.promoted) && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-3">
          {season.trophies.map((t) => {
            const label = trophyLabel(t, season.leagueId, season.national?.tournament);
            return (
              <span
                key={t}
                className="rounded-full bg-warning/20 px-2.5 py-1 text-[11px] font-bold text-warning"
              >
                {label.emoji} {label.name}
              </span>
            );
          })}
          {season.awards.map((a) => (
            <span
              key={a}
              className="rounded-full bg-pulpo-500/20 px-2.5 py-1 text-[11px] font-bold text-pulpo-200"
            >
              {AWARD_EMOJI[a]} {AWARD_NAME[a]}
            </span>
          ))}
          {season.promoted && (
            <span className="rounded-full bg-pitch-500/20 px-2.5 py-1 text-[11px] font-bold text-pitch-400">
              📈 Ascenso
            </span>
          )}
          {season.relegated && (
            <span className="rounded-full bg-danger/15 px-2.5 py-1 text-[11px] font-bold text-danger">
              📉 Descenso
            </span>
          )}
        </div>
      )}

      {(season.leagueTable.length > 0 || season.national || season.ballonDor) && (
        <>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center justify-center gap-1 px-4 py-2.5 text-xs font-semibold text-pulpo-300 hover:bg-surface-2/50"
          >
            {open ? "Ocultar el detalle" : "Ver clasificación y selección"}
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </button>

          {open && (
            <div className="space-y-3 border-t border-border/60 p-4">
              {season.leagueTable.length > 0 && (
                <LeagueTablePanel table={season.leagueTable} leagueId={season.leagueId} tier={season.tier} />
              )}
              {season.national && <NationalPanel run={season.national} countryCode={countryCode} />}
              {season.ballonDor && <BallonDorPanel podium={season.ballonDor} />}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface/70 px-2 py-2 text-center">
      <p className="text-sm font-extrabold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
