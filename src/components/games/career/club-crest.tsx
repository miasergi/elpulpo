"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { CareerClub } from "@/lib/games/career/types";

/**
 * Escudo de un club. Si la imagen no carga, cae a un monograma con las
 * iniciales sobre un color derivado del propio identificador, así que dos
 * clubes distintos nunca salen del mismo color. Mismo patrón que
 * src/components/match/team-flag.tsx.
 */
export function ClubCrest({
  club,
  size = 36,
  className,
}: {
  club?: CareerClub | null;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!club) {
    return (
      <div
        className={cn("shrink-0 rounded-full bg-surface-3", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  if (!club.crest || failed) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full font-bold text-white",
          className
        )}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.34,
          background: `linear-gradient(135deg, hsl(${hue(club.id)} 62% 42%), hsl(${hue(club.id) + 28} 58% 28%))`,
        }}
        title={club.name}
      >
        {club.abbr}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={club.crest}
      alt={club.name}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("shrink-0 object-contain drop-shadow-sm", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** Tono estable a partir del id, para que el monograma no cambie de color. */
function hue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}
