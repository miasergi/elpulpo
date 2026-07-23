"use client";

import { useId, useState } from "react";
import type { SeasonSnapshot } from "@/lib/games/career/types";

const WIDTH = 320;
const HEIGHT = 110;
const PAD = { top: 14, right: 10, bottom: 18, left: 24 };

/**
 * Cómo evolucionó tu media a lo largo de la carrera.
 *
 * Una sola serie, así que no lleva leyenda: el título ya la nombra. El pico
 * va etiquetado directamente en vez de poner un número en cada punto, y el
 * listado de temporadas de debajo hace de vista en tabla.
 */
export function OverallChart({ seasons }: { seasons: SeasonSnapshot[] }) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  if (seasons.length < 2) return null;

  const ages = seasons.map((s) => s.age);
  const values = seasons.map((s) => s.overall);
  const minAge = Math.min(...ages);
  const maxAge = Math.max(...ages);
  const minValue = Math.max(0, Math.min(...values) - 5);
  const maxValue = Math.min(99, Math.max(...values) + 4);

  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (age: number) => PAD.left + ((age - minAge) / Math.max(1, maxAge - minAge)) * plotW;
  const y = (v: number) => PAD.top + (1 - (v - minValue) / Math.max(1, maxValue - minValue)) * plotH;

  const points = seasons.map((s) => ({ season: s, cx: x(s.age), cy: y(s.overall) }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.cx.toFixed(1)},${p.cy.toFixed(1)}`).join(" ");
  const area = `${line} L${points[points.length - 1].cx.toFixed(1)},${(HEIGHT - PAD.bottom).toFixed(1)} L${points[0].cx.toFixed(1)},${(HEIGHT - PAD.bottom).toFixed(1)} Z`;

  const peakIndex = values.indexOf(Math.max(...values));
  const peak = points[peakIndex];
  const active = hover != null ? points[hover] : null;

  // Tres marcas de referencia, para no llenar el eje de números.
  const ticks = [minValue, Math.round((minValue + maxValue) / 2), maxValue];

  return (
    <figure className="m-0">
      <figcaption className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Tu media por edad
      </figcaption>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full touch-none"
        role="img"
        aria-label={`Evolución de la media desde los ${minAge} hasta los ${maxAge} años, con un máximo de ${Math.max(...values)}.`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-pulpo-400)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-pulpo-400)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Rejilla discreta: está para leer valores, no para mirarla. */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--color-border)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 5}
              y={y(t) + 3}
              textAnchor="end"
              className="fill-[var(--color-muted-foreground)] text-[8px] tabular-nums"
            >
              {t}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke="var(--color-pulpo-400)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* El pico va etiquetado; el resto de puntos, no. */}
        <circle cx={peak.cx} cy={peak.cy} r="3.5" fill="var(--color-pulpo-400)" stroke="var(--color-surface)" strokeWidth="2" />
        <text
          x={Math.min(peak.cx, WIDTH - PAD.right - 12)}
          y={Math.max(peak.cy - 7, 9)}
          textAnchor="middle"
          className="fill-[var(--color-foreground)] text-[9px] font-bold tabular-nums"
        >
          {peak.season.overall}
        </text>

        {active && (
          <>
            <line
              x1={active.cx}
              x2={active.cx}
              y1={PAD.top}
              y2={HEIGHT - PAD.bottom}
              stroke="var(--color-pulpo-300)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={active.cx} cy={active.cy} r="4" fill="var(--color-pulpo-300)" stroke="var(--color-surface)" strokeWidth="2" />
          </>
        )}

        <text
          x={PAD.left}
          y={HEIGHT - 5}
          className="fill-[var(--color-muted-foreground)] text-[8px] tabular-nums"
        >
          {minAge} años
        </text>
        <text
          x={WIDTH - PAD.right}
          y={HEIGHT - 5}
          textAnchor="end"
          className="fill-[var(--color-muted-foreground)] text-[8px] tabular-nums"
        >
          {maxAge}
        </text>

        {/* Zonas de contacto anchas, para que se pueda tocar en el móvil. */}
        {points.map((p, i) => (
          <rect
            key={i}
            x={p.cx - plotW / points.length / 2}
            y={PAD.top}
            width={plotW / points.length}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onTouchStart={() => setHover(i)}
          />
        ))}
      </svg>

      <p className="mt-1 h-4 text-center text-[11px] text-muted">
        {active
          ? `${active.season.age} años · media ${active.season.overall}`
          : `Máximo: ${peak.season.overall} con ${peak.season.age} años`}
      </p>
    </figure>
  );
}
