"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface TeamLite {
  id: string;
  name: string;
  short_name?: string | null;
  code?: string | null;
  flag_url?: string | null;
  double_points?: boolean;
  is_underdog?: boolean;
}

/** TheSportsDB sirve variantes redimensionadas añadiendo /small (≈250px) a la URL. */
function resized(url: string) {
  return /thesportsdb\.com\/.+\.(png|jpg)$/i.test(url) ? `${url}/small` : url;
}

export function TeamFlag({
  team,
  size = 32,
  className,
}: {
  team?: TeamLite | null;
  size?: number;
  className?: string;
}) {
  // 0 = variante /small, 1 = URL original, 2 = iniciales
  const [attempt, setAttempt] = useState(0);

  if (!team || !team.flag_url || attempt > 1) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-surface-3 text-muted-foreground",
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.3 }}
      >
        <span className="font-bold">
          {team ? team.code ?? team.short_name ?? team.name.slice(0, 3).toUpperCase() : "?"}
        </span>
      </div>
    );
  }

  // Sin recorte: los escudos no son circulares, se muestran completos.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={attempt === 0 ? resized(team.flag_url) : team.flag_url}
      alt={team.name}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={cn("shrink-0 object-contain drop-shadow-sm", className)}
      style={{ width: size, height: size }}
      onError={() => setAttempt((a) => a + 1)}
    />
  );
}
