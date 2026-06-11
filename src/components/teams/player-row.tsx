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

/** Compact squad list row: number · initials · name + meta · club. */
export function PlayerRow({ player }: { player: SdbPlayer }) {
  const years = age(player.born);
  const meta = [positionEs(player.position), years ? `${years} años` : null].filter(Boolean).join(" · ");

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className="w-5 shrink-0 text-center text-sm font-bold tabular-nums text-muted-foreground">
        {player.number ?? "–"}
      </span>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pulpo-500 to-pulpo-700 text-xs font-bold text-white">
        {getInitials(player.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{player.name}</p>
        {meta && <p className="truncate text-[11px] text-muted-foreground">{meta}</p>}
      </div>
      {player.club && (
        <span className="max-w-[40%] shrink-0 truncate text-right text-[11px] text-muted">
          {player.club}
        </span>
      )}
    </div>
  );
}
