"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trophy, ChevronRight, Undo2, Eye, EyeOff, Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { playTick, haptic } from "@/lib/sound";
import { cn } from "@/lib/utils";
import {
  FORMATIONS,
  formationByKey,
  lineupStrength,
  pickRandom,
  simulateRun,
  toSquad,
  type Formation,
  type Line,
  type PickedPlayer,
  type RawPlayer,
  type RunResult,
  type SquadPlayer,
  type TeamLite,
} from "@/lib/games/eleven";
import { FormationPitch } from "./formation-pitch";
import { PlayerPicker } from "./player-picker";
import { TeamRoulette } from "./team-roulette";
import { SimScreen } from "./sim-screen";

const LINE_LABEL: Record<Line, string> = { gk: "portero", def: "defensa", mid: "centrocampista", fwd: "delantero" };
const USER_TEAM: TeamLite = { id: "me", name: "Tu 11", code: "TÚ", flag_url: null };

export function ElevenGame({ teams, seed }: { teams: TeamLite[]; seed: number }) {
  const router = useRouter();
  const [formationKey, setFormationKey] = useState("433");
  const formation = formationByKey(formationKey);
  const [picks, setPicks] = useState<(PickedPlayer | null)[]>(() => Array(formation.slots.length).fill(null));
  const [order, setOrder] = useState<number[]>([]); // huecos en orden de fichaje (para deshacer)
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [spin, setSpin] = useState<{ target: TeamLite } | null>(null);
  const [picking, setPicking] = useState(false);
  const [squads, setSquads] = useState<Record<string, SquadPlayer[]>>({});
  const [showMedias, setShowMedias] = useState(true);
  const [run, setRun] = useState<RunResult | null>(null);

  const usedIds = useMemo(
    () => new Set(picks.filter(Boolean).map((p) => p!.team.id)),
    [picks]
  );
  const filled = picks.filter(Boolean).length;
  const complete = filled === formation.slots.length;
  const strength = useMemo(() => lineupStrength(picks, formation), [picks, formation]);

  // Carga la plantilla de la selección que ha salido (durante el giro).
  useEffect(() => {
    if (!spin) return;
    const t = spin.target;
    if (squads[t.id]) return;
    let cancel = false;
    fetch(`/api/games/squad?team=${t.id}`)
      .then((r) => r.json())
      .then((j: { players?: RawPlayer[] }) => {
        if (cancel) return;
        setSquads((s) => ({ ...s, [t.id]: toSquad(j.players ?? [], t.code) }));
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [spin, squads]);

  const firstEmpty = () => picks.findIndex((p) => !p);

  function pickTarget(slotIndex: number): TeamLite | undefined {
    // Excluye países ya usados, salvo el que ocupa este hueco (si se rehace).
    const exclude = new Set(usedIds);
    const keep = picks[slotIndex]?.team.id;
    if (keep) exclude.delete(keep);
    return pickRandom(teams.filter((t) => !exclude.has(t.id)));
  }

  function startSpin(slotIndex: number) {
    const target = pickTarget(slotIndex);
    if (!target) return;
    setActiveSlot(slotIndex);
    setPicking(false);
    setSpin({ target });
    playTick("tap");
    haptic(12);
  }

  function respin() {
    if (activeSlot == null) return;
    const next = (() => {
      const exclude = new Set(usedIds);
      const keep = picks[activeSlot]?.team.id;
      if (keep) exclude.delete(keep);
      if (spin) exclude.add(spin.target.id); // fuerza un país distinto al actual
      return pickRandom(teams.filter((t) => !exclude.has(t.id))) ?? pickTarget(activeSlot);
    })();
    if (next) setSpin({ target: next });
  }

  function pickPlayer(p: SquadPlayer) {
    if (activeSlot == null || !spin) return;
    const picked: PickedPlayer = { ...p, team: spin.target };
    setPicks((prev) => {
      const copy = [...prev];
      copy[activeSlot] = picked;
      return copy;
    });
    setOrder((o) => (o.includes(activeSlot) ? o : [...o, activeSlot]));
    playTick("success");
    haptic(16);
    setPicking(false);
    setSpin(null);
    // siguiente hueco vacío
    const nextEmpty = picks.findIndex((p2, i) => !p2 && i !== activeSlot);
    setActiveSlot(nextEmpty >= 0 ? nextEmpty : null);
  }

  function undo() {
    setOrder((o) => {
      if (!o.length) return o;
      const last = o[o.length - 1];
      setPicks((prev) => {
        const copy = [...prev];
        copy[last] = null;
        return copy;
      });
      setActiveSlot(last);
      return o.slice(0, -1);
    });
    playTick("tap");
  }

  function changeFormation(key: string) {
    const next = formationByKey(key);
    setPicks((prev) => remapByLine(formation, prev, next));
    setOrder([]);
    setActiveSlot(null);
    setFormationKey(key);
    playTick("tap");
  }

  function start() {
    if (!complete) return;
    setRun(simulateRun(USER_TEAM, strength, teams, seed));
    playTick("success");
    haptic(22);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (run) {
    return (
      <SimScreen
        run={run}
        userTeam={USER_TEAM}
        formation={formation}
        picks={picks}
        strength={strength}
        showMedias={showMedias}
        onReplay={() => {
          setRun(null);
          window.scrollTo({ top: 0 });
        }}
        onNewGame={() => router.refresh()}
      />
    );
  }

  const ctaSlot = activeSlot != null && !picks[activeSlot] ? activeSlot : firstEmpty();
  const targetSquad = spin ? squads[spin.target.id] : undefined;

  return (
    <div className="pb-8">
      {/* Cabecera del modo */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-pulpo-500/30 bg-gradient-to-br from-pulpo-500/15 to-surface/70 p-3.5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-pulpo-300">Tu 11 de 11 países</p>
          <p className="text-sm text-muted">
            Gira la ruleta, te toca un país y eliges <b className="text-foreground">un</b> jugador. 11 veces, 11
            selecciones distintas.
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black tabular-nums leading-none">{filled}/11</p>
          <p className="text-[10px] text-muted-foreground">países</p>
        </div>
      </div>

      {/* Formación + toggle medias */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 overflow-x-auto no-scrollbar">
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
        <button
          onClick={() => setShowMedias((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface/50 px-3 py-1.5 text-xs font-semibold text-muted active:scale-95"
          aria-pressed={showMedias}
        >
          {showMedias ? <Eye className="h-4 w-4 text-pulpo-300" /> : <EyeOff className="h-4 w-4" />}
          Medias
        </button>
      </div>

      {/* Campo */}
      <div className="mt-3">
        <FormationPitch
          formation={formation}
          picks={picks}
          interactive
          activeIndex={ctaSlot >= 0 ? ctaSlot : null}
          showMedias={showMedias}
          onSlot={(i) => startSpin(i)}
        />
      </div>

      {/* Stats del equipo */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <StatBar label="Media" value={strength.avgRating} hidden={!showMedias} />
        <StatBar label="Química" value={strength.chemistry} suffix="%" tone="pink" />
        <StatBar label="Ataque" value={strength.attack} hidden={!showMedias} />
        <StatBar label="Defensa" value={strength.defense} hidden={!showMedias} />
      </div>

      {filled > 0 && (
        <button
          onClick={undo}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground active:scale-95"
        >
          <Undo2 className="h-3.5 w-3.5" /> Deshacer último
        </button>
      )}

      {/* CTA */}
      <div className="sticky bottom-20 z-10 mt-4">
        {complete ? (
          <Button size="full" variant="primary" onClick={start} className="h-14 animate-heartbeat text-base shadow-xl">
            <Trophy className="h-5 w-5" /> ¡Jugar el Mundial! <ChevronRight className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            size="full"
            variant="primary"
            onClick={() => ctaSlot >= 0 && startSpin(ctaSlot)}
            className="h-14 text-base shadow-xl"
          >
            <Dices className="h-5 w-5" /> Girar la ruleta
          </Button>
        )}
        {!complete && ctaSlot >= 0 && (
          <p className="mt-1.5 text-center text-xs text-muted-foreground">
            Buscando un {LINE_LABEL[formation.slots[ctaSlot].line]} para tu {formation.slots[ctaSlot].label}
          </p>
        )}
      </div>

      {/* Ruleta */}
      {spin && activeSlot != null && (
        <TeamRoulette
          key={spin.target.id}
          target={spin.target}
          pool={teams}
          slotLabel={formation.slots[activeSlot].label}
          lineLabel={LINE_LABEL[formation.slots[activeSlot].line]}
          index={(picks[activeSlot] ? order.indexOf(activeSlot) : filled) + 1}
          squadReady={!!targetSquad}
          onChoose={() => setPicking(true)}
          onRespin={respin}
          onCancel={() => {
            setSpin(null);
            setPicking(false);
          }}
        />
      )}

      {/* Picker de jugador de esa selección */}
      {spin && picking && activeSlot != null && targetSquad && (
        <PlayerPicker
          team={spin.target}
          squad={targetSquad}
          line={formation.slots[activeSlot].line}
          slotLabel={formation.slots[activeSlot].label}
          showMedias={showMedias}
          onPick={pickPlayer}
          onBack={() => setPicking(false)}
          onClose={() => {
            setPicking(false);
            setSpin(null);
          }}
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
  hidden = false,
}: {
  label: string;
  value: number;
  suffix?: string;
  tone?: "teal" | "pink" | "amber";
  hidden?: boolean;
}) {
  const pct = Math.min(100, Math.round((value / (suffix === "%" ? 100 : 99)) * 100));
  const bar = tone === "pink" ? "bg-pink-500" : tone === "amber" ? "bg-warning" : "bg-pulpo-400";
  return (
    <div className="rounded-lg border border-border bg-surface/50 p-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium text-muted">{label}</span>
        <span className="text-sm font-extrabold tabular-nums">
          {hidden ? "—" : `${value}${suffix}`}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn("h-full rounded-full transition-all", hidden ? "bg-surface-3" : bar)}
          style={{ width: hidden ? "0%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Conserva los jugadores por línea al cambiar de formación. */
function remapByLine(
  prev: Formation,
  prevPicks: (PickedPlayer | null)[],
  next: Formation
): (PickedPlayer | null)[] {
  const byLine: Record<Line, PickedPlayer[]> = { gk: [], def: [], mid: [], fwd: [] };
  prev.slots.forEach((s, i) => {
    const p = prevPicks[i];
    if (p) byLine[s.line].push(p);
  });
  const cursor: Record<Line, number> = { gk: 0, def: 0, mid: 0, fwd: 0 };
  return next.slots.map((s) => byLine[s.line][cursor[s.line]++] ?? null);
}
