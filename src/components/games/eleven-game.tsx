"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dice5, Wand2, Trophy, ChevronRight, RotateCcw } from "lucide-react";
import { TeamFlag } from "@/components/match/team-flag";
import { Button } from "@/components/ui/button";
import { playTick, haptic } from "@/lib/sound";
import { cn } from "@/lib/utils";
import {
  FORMATIONS,
  formationByKey,
  lineupStrength,
  simulateRun,
  toSquad,
  teamRating,
  type Formation,
  type Line,
  type RawPlayer,
  type RunResult,
  type SquadPlayer,
  type TeamLite,
} from "@/lib/games/eleven";
import { FormationPitch } from "./formation-pitch";
import { PlayerPicker } from "./player-picker";
import { SimScreen } from "./sim-screen";

const LINE_NEED: Record<Line, string> = { gk: "portero", def: "defensa", mid: "centrocampista", fwd: "delantero" };

export function ElevenGame({
  myTeam,
  squad: rawSquad,
  pool,
  seed,
}: {
  myTeam: TeamLite;
  squad: RawPlayer[];
  pool: TeamLite[];
  seed: number;
}) {
  const router = useRouter();
  const squad = useMemo(() => toSquad(rawSquad, myTeam.code), [rawSquad, myTeam.code]);

  const [formationKey, setFormationKey] = useState("433");
  const formation = formationByKey(formationKey);
  const [picks, setPicks] = useState<(SquadPlayer | null)[]>(() => Array(formation.slots.length).fill(null));
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [run, setRun] = useState<RunResult | null>(null);

  // El reset al cambiar de selección lo hace el `key={myTeam.id}` del padre
  // (remonta el componente con estado nuevo), sin efectos.

  const filled = picks.filter(Boolean).length;
  const complete = filled === formation.slots.length;
  const strength = useMemo(() => lineupStrength(picks, formation, myTeam.code), [picks, formation, myTeam.code]);
  const pickedIds = useMemo(() => new Set(picks.filter(Boolean).map((p) => p!.id)), [picks]);

  function changeFormation(key: string) {
    const next = formationByKey(key);
    setPicks((prev) => remapByLine(formation, prev, next));
    setFormationKey(key);
    playTick("tap");
  }

  function choose(p: SquadPlayer) {
    if (activeSlot == null) return;
    setPicks((prev) => {
      const copy = [...prev];
      // si el jugador ya estaba en otro hueco, libéralo
      const at = copy.findIndex((x) => x?.id === p.id);
      if (at >= 0) copy[at] = null;
      copy[activeSlot] = p;
      return copy;
    });
    playTick("success");
    haptic(10);
    setActiveSlot(null);
  }

  function autofill() {
    setPicks((prev) => {
      const used = new Set(prev.filter(Boolean).map((p) => p!.id));
      return formation.slots.map((slot, i) => {
        if (prev[i]) return prev[i];
        const best = squad.find((p) => p.line === slot.line && !used.has(p.id));
        if (best) used.add(best.id);
        return best ?? null;
      });
    });
    playTick("success");
    haptic(12);
  }

  function start() {
    if (!complete) return;
    setRun(simulateRun(myTeam, strength, pool, seed));
    playTick("success");
    haptic(20);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (run) {
    return (
      <SimScreen
        run={run}
        teamFlag={myTeam}
        formation={formation}
        picks={picks}
        strength={strength}
        onReplay={() => {
          setRun(null);
          window.scrollTo({ top: 0 });
        }}
        onNewTeam={() => router.refresh()}
      />
    );
  }

  const base = teamRating(myTeam.code);
  const nextEmpty = picks.findIndex((p) => !p);

  return (
    <div className="pb-8">
      {/* Selección asignada */}
      <div className="flex items-center gap-3 rounded-xl border border-pulpo-500/30 bg-gradient-to-br from-pulpo-500/15 to-surface/70 p-4">
        <TeamFlag team={myTeam} size={52} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-pulpo-300">Te ha tocado</p>
          <h2 className="truncate text-xl font-extrabold">{myTeam.name}</h2>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="rounded-md bg-surface-3 px-2 py-1 text-xs font-bold tabular-nums text-muted">
            FUERZA {base}
          </span>
          <button
            onClick={() => router.refresh()}
            className="flex items-center gap-1 text-[11px] font-medium text-pulpo-300 active:scale-95"
          >
            <Dice5 className="h-3.5 w-3.5" /> Otra
          </button>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted">
        Coloca a tus 11. Toca cada posición del campo para elegir jugador. Tu alineación decide la fuerza con la que
        disputarás el Mundial.
      </p>

      {/* Formación */}
      <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {FORMATIONS.map((f) => (
          <button
            key={f.key}
            onClick={() => changeFormation(f.key)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
              f.key === formationKey
                ? "border-pulpo-400 bg-pulpo-500/20 text-pulpo-200"
                : "border-border bg-surface/50 text-muted"
            )}
          >
            {f.name}
          </button>
        ))}
      </div>

      {/* Campo */}
      <div className="mt-3">
        <FormationPitch
          formation={formation}
          picks={picks}
          teamFlag={myTeam}
          interactive
          activeIndex={activeSlot}
          onSlot={(i) => setActiveSlot(i)}
        />
      </div>

      {/* Acciones rápidas */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          onClick={autofill}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-3 py-2 text-xs font-semibold text-foreground active:scale-95"
        >
          <Wand2 className="h-4 w-4 text-pulpo-300" /> Relleno automático
        </button>
        {filled > 0 && (
          <button
            onClick={() => setPicks(Array(formation.slots.length).fill(null))}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Vaciar
          </button>
        )}
      </div>

      {/* Panel de fuerza */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <StatBar label="Ataque" value={strength.attack} />
        <StatBar label="Defensa" value={strength.defense} />
        <StatBar label="Química" value={strength.chemistry} suffix="%" tone="pink" />
        <StatBar label="Media" value={filled ? strength.avgRating : 0} tone="amber" />
      </div>

      {/* CTA */}
      <div className="sticky bottom-20 z-10 mt-4">
        <Button
          size="full"
          variant="primary"
          disabled={!complete}
          onClick={start}
          className={cn("h-14 text-base shadow-xl", complete && "animate-heartbeat")}
        >
          <Trophy className="h-5 w-5" />
          {complete ? "¡Jugar el Mundial!" : `Te faltan ${formation.slots.length - filled}`}
          {complete && <ChevronRight className="h-5 w-5" />}
        </Button>
        {!complete && nextEmpty >= 0 && (
          <p className="mt-1.5 text-center text-xs text-muted-foreground">
            Siguiente: elige un {LINE_NEED[formation.slots[nextEmpty].line]} ({formation.slots[nextEmpty].label})
          </p>
        )}
      </div>

      {activeSlot != null && (
        <PlayerPicker
          slot={formation.slots[activeSlot]}
          squad={squad}
          pickedIds={pickedIds}
          currentId={picks[activeSlot]?.id ?? null}
          teamFlag={myTeam}
          onPick={choose}
          onClear={() => {
            setPicks((prev) => {
              const copy = [...prev];
              copy[activeSlot] = null;
              return copy;
            });
            setActiveSlot(null);
          }}
          onClose={() => setActiveSlot(null)}
        />
      )}
    </div>
  );
}

function StatBar({
  label,
  value,
  suffix = "",
  tone = "teal",
}: {
  label: string;
  value: number;
  suffix?: string;
  tone?: "teal" | "pink" | "amber";
}) {
  const pct = Math.min(100, Math.round((value / (suffix === "%" ? 100 : 99)) * 100));
  const bar = tone === "pink" ? "bg-pink-500" : tone === "amber" ? "bg-warning" : "bg-pulpo-400";
  return (
    <div className="rounded-lg border border-border bg-surface/50 p-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium text-muted">{label}</span>
        <span className="text-sm font-extrabold tabular-nums">
          {value}
          {suffix}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className={cn("h-full rounded-full transition-all", bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Conserva los jugadores por línea al cambiar de formación. */
function remapByLine(prev: Formation, prevPicks: (SquadPlayer | null)[], next: Formation): (SquadPlayer | null)[] {
  const byLine: Record<Line, SquadPlayer[]> = { gk: [], def: [], mid: [], fwd: [] };
  prev.slots.forEach((s, i) => {
    const p = prevPicks[i];
    if (p) byLine[s.line].push(p);
  });
  const cursor: Record<Line, number> = { gk: 0, def: 0, mid: 0, fwd: 0 };
  return next.slots.map((s) => byLine[s.line][cursor[s.line]++] ?? null);
}
