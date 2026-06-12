"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, X, ChevronRight } from "lucide-react";
import { TeamFlag } from "@/components/match/team-flag";
import { Button } from "@/components/ui/button";
import { playTick, haptic } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { teamRating, type TeamLite } from "@/lib/games/eleven";

// Fuera del componente: Math.random no puede ir en el render (react-hooks/purity).
function makeSequence(pool: TeamLite[], target: TeamLite, steps: number): TeamLite[] {
  const seq: TeamLite[] = [];
  for (let i = 0; i < steps - 1; i++) seq.push(pool[Math.floor(Math.random() * pool.length)]);
  seq.push(target); // aterriza siempre en el objetivo
  return seq;
}

/** Ruleta de selecciones: las banderas pasan rápido y frenan en una.
 *  El `target` lo decide el padre (que ya está cargando su plantilla). */
export function TeamRoulette({
  target,
  pool,
  slotLabel,
  lineLabel,
  index,
  squadReady,
  onChoose,
  onRespin,
  onCancel,
}: {
  target: TeamLite;
  pool: TeamLite[];
  slotLabel: string;
  lineLabel: string;
  index: number; // nº de jugador (1..11)
  squadReady: boolean;
  onChoose: () => void;
  onRespin: () => void;
  onCancel: () => void;
}) {
  const [current, setCurrent] = useState<TeamLite>(target);
  const [landed, setLanded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const seq = makeSequence(pool, target, 26);
    let i = 0;
    const tick = () => {
      if (cancelled) return;
      setCurrent(seq[i]);
      if (i < seq.length - 1) playTick("tap");
      i++;
      if (i < seq.length) {
        const t = 45 + Math.pow(i / seq.length, 2.3) * 240; // ease-out: frena al final
        timer.current = setTimeout(tick, t);
      } else {
        setLanded(true);
        playTick("success");
        haptic(28);
      }
    };
    tick();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [target, pool]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6">
      <button className="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-label="Cerrar" onClick={onCancel} />

      <div className="relative w-full max-w-sm">
        <button
          onClick={onCancel}
          className="absolute -top-2 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted hover:text-foreground"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <p className="text-center text-xs font-bold uppercase tracking-widest text-pulpo-300">Jugador {index} de 11</p>
        <p className="mt-1 text-center text-sm text-muted">
          {landed ? "Te ha tocado…" : "Girando la ruleta de selecciones…"}
        </p>

        {/* Ventana de la ruleta */}
        <div
          className={cn(
            "relative mx-auto mt-4 flex aspect-square w-56 flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border-2 bg-gradient-to-br transition-colors",
            landed ? "border-pulpo-400 from-pulpo-500/25 to-surface" : "border-border from-surface-2 to-surface"
          )}
        >
          {/* marcador superior */}
          <span className="absolute left-1/2 top-2 -translate-x-1/2 text-pulpo-300">▼</span>
          <span key={current.id + String(landed)} className={cn(landed ? "animate-pop" : "")}>
            <TeamFlag team={current} size={104} />
          </span>
          <span
            className={cn(
              "max-w-[90%] truncate px-2 text-center text-lg font-extrabold",
              landed ? "text-pulpo-100" : "text-foreground/80"
            )}
          >
            {current.name}
          </span>
          {landed && (
            <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-bold tabular-nums text-muted">
              Selección media {teamRating(current.code)}
            </span>
          )}
        </div>

        {/* Pie: a qué posición va */}
        <div className="mt-4 rounded-xl border border-border bg-surface/60 p-3 text-center">
          <p className="text-xs text-muted">
            Elige un <span className="font-bold text-foreground">{lineLabel}</span> de{" "}
            <span className="font-bold text-foreground">{current.name}</span> para tu <b>{slotLabel}</b>
          </p>
        </div>

        {landed && (
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" size="full" onClick={onRespin} className="flex-1">
              <RefreshCw className="h-4 w-4" /> Otra
            </Button>
            <Button variant="primary" size="full" onClick={onChoose} disabled={!squadReady} className="flex-[2]">
              {squadReady ? (
                <>
                  Elegir jugador <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
