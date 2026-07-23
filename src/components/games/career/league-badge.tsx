"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { CareerLeague } from "@/lib/games/career/types";

/**
 * Logo de una competición. Mismo patrón que ClubCrest: si la imagen no carga,
 * simplemente no se pinta nada (el nombre de la liga ya va al lado).
 */
export function LeagueBadge({
  league,
  size = 16,
  className,
}: {
  league?: Pick<CareerLeague, "logo" | "name"> | null;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!league?.logo || failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={league.logo}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("inline-block shrink-0 object-contain align-[-2px]", className)}
      style={{ width: size, height: size }}
    />
  );
}
