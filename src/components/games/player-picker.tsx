"use client";

import { useState } from "react";
import { X, Search, Check } from "lucide-react";
import { TeamFlag, type TeamLite } from "@/components/match/team-flag";
import { cn } from "@/lib/utils";
import type { Line, SquadPlayer, Slot } from "@/lib/games/eleven";

const LINE_LABEL: Record<Line, string> = {
  gk: "Portero",
  def: "Defensa",
  mid: "Centrocampista",
  fwd: "Delantero",
};

export function PlayerPicker({
  slot,
  squad,
  pickedIds,
  currentId,
  teamFlag,
  onPick,
  onClear,
  onClose,
}: {
  slot: Slot;
  squad: SquadPlayer[];
  pickedIds: Set<string>;
  currentId: string | null;
  teamFlag: TeamLite;
  onPick: (p: SquadPlayer) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const options = squad
    .filter((p) => p.line === slot.line)
    .filter((p) => p.id === currentId || !pickedIds.has(p.id))
    .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.club ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="Cerrar" onClick={onClose} />
      <div className="relative mx-auto flex max-h-[80dvh] w-full max-w-md flex-col rounded-t-2xl border-t border-border bg-surface pb-safe">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div>
            <p className="text-sm font-bold">{LINE_LABEL[slot.line]}</p>
            <p className="text-xs text-muted">Elige quién juega de {slot.label}</p>
          </div>
          <div className="flex items-center gap-2">
            {currentId && (
              <button
                onClick={onClear}
                className="rounded-full bg-surface-3 px-3 py-1 text-xs font-medium text-muted hover:text-foreground"
              >
                Quitar
              </button>
            )}
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-2">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-4 py-2">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar jugador o club…"
              className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto px-2 pb-4">
          {options.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No quedan jugadores en esta posición.</p>
          ) : (
            options.map((p) => {
              const selected = p.id === currentId;
              return (
                <button
                  key={p.id}
                  onClick={() => onPick(p)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors",
                    selected ? "bg-pulpo-500/15" : "hover:bg-surface-2"
                  )}
                >
                  <span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums text-muted-foreground">
                    {p.number ?? "–"}
                  </span>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-3">
                    {p.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photo} alt="" className="h-full w-full object-cover object-top" />
                    ) : (
                      <TeamFlag team={teamFlag} size={40} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    {p.club && <span className="block truncate text-[11px] text-muted-foreground">{p.club}</span>}
                  </span>
                  <RatingPill rating={p.rating} />
                  {selected && <Check className="h-4 w-4 shrink-0 text-pulpo-300" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function RatingPill({ rating }: { rating: number }) {
  const cls =
    rating >= 85
      ? "bg-pitch-500/20 text-pitch-400"
      : rating >= 78
      ? "bg-pulpo-500/20 text-pulpo-300"
      : rating >= 70
      ? "bg-warning/15 text-warning"
      : "bg-surface-3 text-muted";
  return (
    <span className={cn("flex h-7 w-9 shrink-0 items-center justify-center rounded-md text-sm font-extrabold tabular-nums", cls)}>
      {rating}
    </span>
  );
}
