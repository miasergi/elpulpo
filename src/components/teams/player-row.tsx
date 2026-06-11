"use client";

import { useState } from "react";
import { getInitials } from "@/lib/utils";
import { TeamFlag, type TeamLite } from "@/components/match/team-flag";

export interface SquadPlayer {
  id: string;
  name: string;
  number: string | null;
  position: string | null;
  positionDetail: string | null;
  born: string | null;
  photo: string | null;
  club: string | null;
  clubBadge: string | null;
}

function age(born: string | null) {
  if (!born) return null;
  const years = Math.floor((Date.now() - new Date(born).getTime()) / (365.25 * 24 * 3600 * 1000));
  return Number.isFinite(years) && years > 13 && years < 50 ? years : null;
}

/** Compact squad list row: number · avatar · name + meta · club.
 *  `usePhotos` is decided per team so a squad never mixes photos and crests. */
export function PlayerRow({
  player,
  teamFlag,
  usePhotos,
}: {
  player: SquadPlayer;
  teamFlag: TeamLite;
  usePhotos: boolean;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const years = age(player.born);
  const position = player.positionDetail || player.position;
  const meta = [position, years ? `${years} años` : null].filter(Boolean).join(" · ");
  const showPhoto = usePhotos && player.photo && !photoFailed;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className="w-5 shrink-0 text-center text-sm font-bold tabular-nums text-muted-foreground">
        {player.number ?? "–"}
      </span>

      {/* Per-team: either everyone's official photo, or everyone's crest. */}
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-3">
        {showPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.photo!}
            alt={player.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-top"
            onError={() => setPhotoFailed(true)}
          />
        ) : (
          <TeamFlag team={teamFlag} size={40} />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{player.name}</p>
        {meta && <p className="truncate text-[11px] text-muted-foreground">{meta}</p>}
      </div>

      {player.club && (
        <span className="flex max-w-[42%] shrink-0 items-center justify-end gap-1.5">
          <span className="truncate text-right text-[11px] text-muted">{player.club}</span>
          {player.clubBadge && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.clubBadge} alt="" className="h-4 w-4 shrink-0 object-contain" loading="lazy" />
          )}
        </span>
      )}
    </div>
  );
}
