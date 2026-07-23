"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { COUNTRIES, flagUrl } from "@/lib/games/career/countries.data";
import { POSITION_NAME } from "@/lib/games/career/constants";
import type { CareerCountry, Foot, Identity, Position } from "@/lib/games/career/types";

/** El campo, tal y como se ve en el selector de posición. */
const PITCH_ROWS: { line: string; slots: Position[] }[] = [
  { line: "Delantera", slots: ["EI", "DC", "ED"] },
  { line: "Media punta", slots: ["MCO"] },
  { line: "Centro del campo", slots: ["MI", "MC", "MD"] },
  { line: "Pivote", slots: ["MCD"] },
  { line: "Defensa", slots: ["LI", "DFC", "LD"] },
  { line: "Portería", slots: ["POR"] },
];

const CONFEDERATION_NAME: Record<string, string> = {
  UEFA: "Europa",
  CONMEBOL: "Sudamérica",
  CONCACAF: "Norte y Centroamérica",
  CAF: "África",
  AFC: "Asia",
  OFC: "Oceanía",
};

export function IdentityStep({ onConfirm }: { onConfirm: (identity: Identity) => void }) {
  const [lastName, setLastName] = useState("");
  const [number, setNumber] = useState(10);
  const [foot, setFoot] = useState<Foot>("right");
  const [country, setCountry] = useState<CareerCountry | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const results = useMemo(() => {
    const needle = normalize(query);
    if (!needle) {
      // Sin buscar, se enseñan las selecciones más fuertes de cada continente.
      return showAll ? COUNTRIES : COUNTRIES.slice(0, 24);
    }
    return COUNTRIES.filter((c) => normalize(c.name).includes(needle) || c.code.toLowerCase().includes(needle));
  }, [query, showAll]);

  const ready = !!country && !!position;

  return (
    <div className="space-y-5 pb-28">
      <section className="rounded-2xl border border-border bg-surface/70 p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-pulpo-300">Paso 1</p>
        <h2 className="mt-1 text-xl font-extrabold">Tu futbolista</h2>
        <p className="text-sm text-muted">El apellido que llevarás a la espalda toda la carrera.</p>

        <div className="mt-4 grid grid-cols-[1fr_5rem] gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Apellido</span>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value.slice(0, 18))}
              placeholder="Tu apellido"
              className="h-11 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm font-semibold outline-none focus:border-pulpo-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Dorsal</span>
            <input
              type="number"
              min={1}
              max={99}
              value={number}
              onChange={(e) => setNumber(clampNumber(Number(e.target.value)))}
              className="h-11 w-full rounded-lg border border-border bg-surface-2 px-3 text-center text-sm font-bold tabular-nums outline-none focus:border-pulpo-400"
            />
          </label>
        </div>

        <div className="mt-3">
          <span className="mb-1 block text-xs font-semibold text-muted">Pierna hábil</span>
          <div className="grid grid-cols-2 gap-2">
            {(["left", "right"] as Foot[]).map((f) => (
              <button
                key={f}
                onClick={() => setFoot(f)}
                className={cn(
                  "h-11 rounded-lg border text-sm font-semibold transition-colors",
                  foot === f
                    ? "border-pulpo-400 bg-pulpo-500/15 text-pulpo-100"
                    : "border-border bg-surface-2 text-muted hover:text-foreground"
                )}
              >
                {f === "left" ? "Izquierda" : "Derecha"}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface/70 p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-pulpo-300">Paso 2</p>
        <h2 className="mt-1 text-xl font-extrabold">Nacionalidad</h2>
        <p className="text-sm text-muted">
          Marca dónde empieza tu carrera y con qué selección puedes jugar.
        </p>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar país"
            className="h-11 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-sm outline-none focus:border-pulpo-400"
          />
        </div>

        {results.length === 0 ? (
          <p className="mt-4 text-center text-sm text-muted">No hay países para esa búsqueda.</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {results.map((c) => (
              <button
                key={c.code}
                onClick={() => setCountry(c)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-2.5 text-left transition-colors",
                  country?.code === c.code
                    ? "border-pulpo-400 bg-pulpo-500/15"
                    : "border-border bg-surface-2 hover:border-border/80"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={flagUrl(c)}
                  alt=""
                  width={26}
                  height={20}
                  loading="lazy"
                  className="h-5 w-[26px] shrink-0 rounded-sm object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{c.name}</span>
                  <span className="block text-[10px] text-muted-foreground">
                    {CONFEDERATION_NAME[c.confederation] ?? c.confederation}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        {!query && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="mt-3 w-full text-center text-xs font-semibold text-pulpo-300 hover:underline"
          >
            Ver los {COUNTRIES.length} países
          </button>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface/70 p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-pulpo-300">Paso 3</p>
        <h2 className="mt-1 text-xl font-extrabold">Posición</h2>
        <p className="text-sm text-muted">Tu sitio en el campo decide tus números.</p>

        <div className="mt-4 space-y-2 rounded-xl border border-pitch-500/25 bg-pitch-500/5 p-3">
          {PITCH_ROWS.map((row) => (
            <div key={row.line} className="flex justify-center gap-2">
              {row.slots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setPosition(slot)}
                  title={POSITION_NAME[slot]}
                  className={cn(
                    "h-11 flex-1 rounded-lg border text-xs font-bold transition-all",
                    position === slot
                      ? "border-pulpo-400 bg-pulpo-500/25 text-pulpo-100 shadow-lg shadow-pulpo-500/20"
                      : "border-border/60 bg-surface-2/60 text-muted hover:text-foreground"
                  )}
                >
                  {slot}
                </button>
              ))}
            </div>
          ))}
        </div>

        {position && (
          <p className="mt-3 text-center text-sm font-semibold text-pulpo-200">
            {POSITION_NAME[position]}
          </p>
        )}
      </section>

      <div className="sticky bottom-20 z-10">
        <Button
          size="full"
          variant="primary"
          disabled={!ready}
          className="h-13 text-base shadow-xl"
          onClick={() =>
            country &&
            position &&
            onConfirm({
              lastName: lastName.trim(),
              number,
              foot,
              countryCode: country.code,
              position,
            })
          }
        >
          {ready ? (
            <>
              Empezar la carrera <ChevronRight className="h-5 w-5" />
            </>
          ) : (
            "Elige país y posición"
          )}
        </Button>
      </div>
    </div>
  );
}

function clampNumber(n: number): number {
  if (!Number.isFinite(n)) return 10;
  return Math.max(1, Math.min(99, Math.round(n)));
}

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}
