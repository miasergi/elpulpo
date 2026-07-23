"use client";

import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getClub, getCountry } from "@/lib/games/career/data";
import { flagUrl } from "@/lib/games/career/countries.data";
import type { GroupCareerEntry } from "@/lib/games/career/store";
import { ClubCrest } from "./club-crest";

/**
 * Ranking de carreras entre los amigos del grupo. Es lo que el juego original
 * no tiene y lo que encaja con el resto de El Pulpo: jugar contra los tuyos.
 */
export function GroupCareerBoard({ entries }: { entries: GroupCareerEntry[] }) {
  if (!entries.length) {
    return (
      <div className="rounded-2xl border border-border bg-surface/60 p-5 text-center">
        <p className="text-sm text-muted">
          Todavía no hay carreras terminadas en tu grupo. Sé el primero en llegar a la retirada.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      {entries.map((entry, i) => {
        const country = getCountry(entry.countryCode);
        const club = entry.finalClubId ? getClub(entry.finalClubId) : null;
        return (
          <div
            key={entry.runId}
            className={cn(
              "flex items-center gap-3 border-b border-border/60 px-3 py-2.5 last:border-b-0",
              entry.isMe ? "bg-pulpo-500/15" : "bg-surface/50"
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-bold",
                i === 0 ? "bg-warning/25 text-warning" : "text-muted-foreground"
              )}
            >
              {i + 1}
            </span>
            <Avatar src={entry.avatarUrl} name={entry.displayName} size={30} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-bold">
                {entry.lastName.trim() || entry.displayName}
                {country && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={flagUrl(country)}
                    alt=""
                    width={16}
                    height={12}
                    className="h-3 w-4 shrink-0 rounded-[1px] object-cover"
                  />
                )}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {entry.displayName} · media {entry.peakOverall} · {entry.seasons} temporadas
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {club && <ClubCrest club={club} size={22} />}
              <span className="text-right">
                <span className="block text-sm font-extrabold tabular-nums">{entry.trophies}</span>
                <span className="block text-[9px] uppercase text-muted-foreground">títulos</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
