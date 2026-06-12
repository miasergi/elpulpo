"use client";

import { Plus } from "lucide-react";
import { TeamFlag } from "@/components/match/team-flag";
import { cn } from "@/lib/utils";
import type { Formation, PickedPlayer } from "@/lib/games/eleven";

export function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0] : parts[parts.length - 1];
}

function ratingColor(r: number) {
  if (r >= 85) return "bg-pitch-500 text-[#04201d]";
  if (r >= 78) return "bg-pulpo-400 text-[#04201d]";
  if (r >= 70) return "bg-warning text-[#241a02]";
  return "bg-surface-3 text-muted";
}

/** A vertical football pitch with the 11 slots placed by formation.
 *  Cada jugador lleva su propia bandera (es un 11 de 11 países). */
export function FormationPitch({
  formation,
  picks,
  onSlot,
  activeIndex = null,
  interactive = false,
  showMedias = true,
}: {
  formation: Formation;
  picks: (PickedPlayer | null)[];
  onSlot?: (index: number) => void;
  activeIndex?: number | null;
  interactive?: boolean;
  showMedias?: boolean;
}) {
  return (
    <div className="relative aspect-[3/4.2] w-full overflow-hidden rounded-2xl border border-pitch-600/40 shadow-inner">
      {/* Césped con franjas */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#0f6b3f,#0a4f2e)]" />
      <div className="absolute inset-0 opacity-[0.12] bg-[repeating-linear-gradient(180deg,#fff_0_8.33%,transparent_8.33%_16.66%)]" />
      {/* Líneas */}
      <div className="absolute inset-3 rounded-lg border-2 border-white/25" />
      <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/25" />
      <div className="absolute left-3 right-3 top-1/2 h-0.5 -translate-y-1/2 bg-white/25" />
      {/* Áreas */}
      <div className="absolute bottom-3 left-1/2 h-14 w-2/5 -translate-x-1/2 border-2 border-b-0 border-white/25" />
      <div className="absolute top-3 left-1/2 h-14 w-2/5 -translate-x-1/2 border-2 border-t-0 border-white/25" />

      {formation.slots.map((slot, i) => {
        const p = picks[i];
        const active = activeIndex === i;
        return (
          <button
            key={slot.id}
            type="button"
            disabled={!interactive}
            onClick={() => onSlot?.(i)}
            className={cn(
              "absolute flex w-[22%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 focus:outline-none",
              interactive && "active:scale-95 transition-transform"
            )}
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
          >
            {p ? (
              <span className="relative">
                <span
                  className={cn(
                    "flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-surface ring-2",
                    active ? "ring-primary" : "ring-white/70"
                  )}
                >
                  {p.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photo} alt="" className="h-full w-full object-cover object-top" />
                  ) : (
                    <TeamFlag team={p.team} size={44} />
                  )}
                </span>
                {/* Banderita del país del jugador */}
                <span className="absolute -bottom-1 -left-1 overflow-hidden rounded-full ring-2 ring-surface">
                  <TeamFlag team={p.team} size={16} />
                </span>
                {showMedias && (
                  <span
                    className={cn(
                      "absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-extrabold tabular-nums shadow",
                      ratingColor(p.rating)
                    )}
                  >
                    {p.rating}
                  </span>
                )}
              </span>
            ) : (
              <span
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed bg-black/20",
                  active ? "border-primary text-primary" : "border-white/60 text-white/80"
                )}
              >
                <Plus className="h-5 w-5" />
              </span>
            )}
            <span
              className={cn(
                "max-w-full truncate rounded px-1 text-[10px] font-bold leading-tight",
                p ? "bg-black/45 text-white" : "text-white/70"
              )}
            >
              {p ? shortName(p.name) : slot.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
