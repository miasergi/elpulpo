import { getInitials } from "@/lib/utils";
import type { SdbPlayer } from "@/lib/sports-db";

const POSITION_ES: [RegExp, string][] = [
  [/portero|arquero|goalkeeper/i, "Portero"],
  [/central|centre-back|center-back/i, "Central"],
  [/lateral izq|left-back/i, "Lateral izq."],
  [/lateral der|right-back/i, "Lateral der."],
  [/pivote|defensive midfield/i, "Pivote"],
  [/mediapunta|attacking midfield/i, "Mediapunta"],
  [/mediocentro|central midfield/i, "Mediocentro"],
  [/extremo izq|left midfield|left wing/i, "Extremo izq."],
  [/extremo der|right midfield|right wing/i, "Extremo der."],
  [/delantero|centre-forward|striker/i, "Delantero"],
  [/defensa|back|defen/i, "Defensa"],
  [/centrocampista|midfield/i, "Centrocampista"],
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
  const years = age(player.born);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface/60">
      <div className="relative flex h-28 items-center justify-center bg-gradient-to-b from-pulpo-500/15 to-surface-2">
        {player.number && (
          <span className="absolute left-2 top-1.5 text-2xl font-extrabold text-foreground/15">
            {player.number}
          </span>
        )}
        {/* Initials avatar (no licensed photos available). */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pulpo-500 to-pulpo-700 text-xl font-bold text-white">
          {getInitials(player.name)}
        </div>
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
