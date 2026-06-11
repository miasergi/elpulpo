"use client";

import { useState } from "react";
import { User } from "lucide-react";
import type { SdbPlayer } from "@/lib/sports-db";

const POSITION_ES: [RegExp, string][] = [
  [/goalkeeper/i, "Portero"],
  [/centre-back|center-back/i, "Central"],
  [/left-back/i, "Lateral izq."],
  [/right-back/i, "Lateral der."],
  [/defensive midfield/i, "Pivote"],
  [/attacking midfield/i, "Mediapunta"],
  [/central midfield/i, "Mediocentro"],
  [/left midfield|left wing/i, "Extremo izq."],
  [/right midfield|right wing/i, "Extremo der."],
  [/centre-forward|striker/i, "Delantero"],
  [/forward/i, "Delantero"],
];

function positionEs(pos: string | null) {
  if (!pos) return null;
  for (const [re, es] of POSITION_ES) if (re.test(pos)) return es;
  return pos;
}

function age(born: string | null) {
  if (!born) return null;
  const years = Math.floor((Date.now() - new Date(born).getTime()) / (365.25 * 24 * 3600 * 1000));
  return Number.isFinite(years) && years > 13 && years < 50 ? years : null;
}

export function PlayerCard({ player }: { player: SdbPlayer }) {
  const [imgFailed, setImgFailed] = useState(false);
  const photo = player.cutout || player.thumb;
  const years = age(player.born);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface/60">
      <div className="relative flex h-28 items-end justify-center bg-gradient-to-b from-pulpo-500/15 to-surface-2">
        {player.number && (
          <span className="absolute left-2 top-1.5 text-2xl font-extrabold text-foreground/15">
            {player.number}
          </span>
        )}
        {photo && !imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={player.name}
            loading="lazy"
            decoding="async"
            className="h-full object-contain object-bottom drop-shadow-md"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <User className="mb-3 h-12 w-12 text-muted-foreground" />
        )}
      </div>
      <div className="p-2.5">
        <p className="truncate text-sm font-semibold">{player.name}</p>
        <p className="truncate text-[11px] text-muted">
          {[positionEs(player.position), years ? `${years} años` : null].filter(Boolean).join(" · ")}
        </p>
        {player.club && (
          <p className="truncate text-[11px] text-muted-foreground">{player.club}</p>
        )}
      </div>
    </div>
  );
}
