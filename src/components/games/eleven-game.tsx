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

type GamePhase = "intro" | "spinning" | "pick_slot" | "pick_player";

export function ElevenGame({
  teams,
  seed,
  userAvatarUrl,
}: {
  teams: TeamLite[];
  seed: number;
  userAvatarUrl?: string | null;
}) {
  const router = useRouter();
  const userTeam: TeamLite = {
    id: "me",
    name: "Tu 11",
    code: "TÚ",
    flag_url: userAvatarUrl ?? null,
  };

  const [formationKey, setFormationKey] = useState("433");
  const formation = formationByKey(formationKey);
  const [picks, setPicks] = useState<(PickedPlayer | null)[]>(() =>
    Array(formation.slots.length).fill(null)
  );
  const [order, setOrder] = useState<number[]>([]);
  const [squads, setSquads] = useState<Record<string, SquadPlayer[]>>({});
  const [showMedias, setShowMedias] = useState(true);
  const [run, setRun] = useState<RunResult | null>(null);

  // ── State machine ──
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [currentTeam, setCurrentTeam] = useState<TeamLite | null>(null);
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);

  const usedIds = useMemo(
    () => new Set(picks.filter(Boolean).map((p) => p!.team.id)),
    [picks]
  );
  const filled = picks.filter(Boolean).length;
  const complete = filled === formation.slots.length;
  const strength = useMemo(() => lineupStrength(picks, formation), [picks, formation]);
  const targetSquad = currentTeam ? squads[currentTeam.id] : undefined;

  // Pre-fetch squad when currentTeam changes.
  useEffect(() => {
    if (!currentTeam || squads[currentTeam.id]) return;
    let cancelled = false;
    fetch(`/api/games/squad?team=${currentTeam.id}`)
      .then((r) => r.json())
      .then((j: { players?: RawPlayer[] }) => {
        if (cancelled) return;
        setSquads((s) => ({
          ...s,
          [currentTeam.id]: toSquad(j.players ?? [], currentTeam.code),
        }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentTeam, squads]);

  function launchSpin(extraExclude?: string) {
    const exclude = new Set(usedIds);
    if (extraExclude) exclude.add(extraExclude);
    const available = teams.filter((t) => !exclude.has(t.id));
    const target = pickRandom(available);
    if (!target) return;
    setCurrentTeam(target);
    setPhase("spinning");
    playTick("tap");
    haptic(12);
  }

  function handleIntroStart(medias: boolean) {
    setShowMedias(medias);
    launchSpin();
  }

  function handleSpinLanded() {
    setPhase("pick_slot");
  }

  function handleRespin() {
    const prev = currentTeam?.id;
    const exclude = new Set(usedIds);
    if (prev) exclude.add(prev);
    const available = teams.filter((t) => !exclude.has(t.id));
    const target = pickRandom(available);
    if (!target) return;
    setCurrentTeam(target);
    setPhase("spinning");
  }

  function handleSlotPicked(slotIndex: number) {
    if (picks[slotIndex]) return; // ya relleno
    setPendingSlot(slotIndex);
    setPhase("pick_player");
    playTick("tap");
  }

  function handlePlayerPicked(p: SquadPlayer) {
    if (pendingSlot == null || !currentTeam) return;
    const picked: PickedPlayer = { ...p, team: currentTeam };
    const newPicks = [...picks];
    newPicks[pendingSlot] = picked;
    setPicks(newPicks);
    setOrder((o) => (o.includes(pendingSlot) ? o : [...o, pendingSlot]));
    playTick("success");
    haptic(16);
    setPendingSlot(null);

    const newFilled = newPicks.filter(Boolean).length;
    if (newFilled === formation.slots.length) {
      // Todos los 11 fichados
      setCurrentTeam(null);
      setPhase("pick_slot"); // el campo queda visible con el 11 completo
    } else {
      // Auto-spin para el siguiente
      const newUsed = new Set(newPicks.filter(Boolean).map((pk) => pk!.team.id));
      const available = teams.filter((t) => !newUsed.has(t.id));
      const target = pickRandom(available);
      if (target) {
        setCurrentTeam(target);
        setPhase("spinning");
        playTick("tap");
        haptic(12);
      }
    }
  }

  function undo() {
    if (!order.length) return;
    const last = order[order.length - 1];
    const newPicks = [...picks];
    newPicks[last] = null;
    setPicks(newPicks);
    setOrder((o) => o.slice(0, -1));
    // Relanzar ruleta para ese jugador
    const newUsed = new Set(newPicks.filter(Boolean).map((pk) => pk!.team.id));
    const available = teams.filter((t) => !newUsed.has(t.id));
    const target = pickRandom(available);
    if (target) {
      setCurrentTeam(target);
      setPhase("spinning");
    }
    playTick("tap");
  }

  function changeFormation(key: string) {
    const next = formationByKey(key);
    setPicks((prev) => remapByLine(formation, prev, next));
    setOrder([]);
    setFormationKey(key);
    playTick("tap");
  }

  function startSimulation() {
    if (!complete) return;
    setRun(simulateRun(userTeam, strength, teams, seed, picks));
    playTick("success");
    haptic(22);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Pantalla de simulación ──
  if (run) {
    return (
      <SimScreen
        run={run}
        userTeam={userTeam}
        userAvatarUrl={userAvatarUrl ?? null}
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

  // ── Pantalla de introducción ──
  if (phase === "intro") {
    return (
      <div className="flex flex-col gap-5 pb-8">
        <div className="rounded-2xl border border-pulpo-500/30 bg-gradient-to-br from-pulpo-500/15 to-surface/70 p-5 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-pulpo-300">El 11 del mundial</p>
          <p className="mt-2 text-balance text-sm text-muted">
            La ruleta te dará una selección aleatoria. Elige en qué posición del campo poner un jugador y cuál eliges. 11 veces, 11 países distintos.
          </p>
        </div>

        {/* Formación */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Formación</p>
          <div className="flex flex-wrap gap-2">
            {FORMATIONS.map((f) => (
              <button
                key={f.key}
                onClick={() => changeFormation(f.key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
                  f.key === formationKey
                    ? "border-pulpo-400 bg-pulpo-500/20 text-pulpo-200"
                    : "border-border bg-surface/50 text-muted"
                )}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        {/* Medias */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            ¿Mostrar medias de los jugadores?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowMedias(true)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-colors",
                showMedias
                  ? "border-pulpo-400 bg-pulpo-500/20 text-pulpo-200"
                  : "border-border bg-surface/50 text-muted"
              )}
            >
              <Eye className="h-4 w-4" /> Sí, verlas
            </button>
            <button
              onClick={() => setShowMedias(false)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-colors",
                !showMedias
                  ? "border-border bg-surface/50 text-foreground"
                  : "border-border bg-surface/30 text-muted"
              )}
            >
              <EyeOff className="h-4 w-4" /> Sin ver medias
            </button>
          </div>
        </div>

        <Button
          size="full"
          variant="primary"
          onClick={() => handleIntroStart(showMedias)}
          className="h-14 text-base"
        >
          <Dices className="h-5 w-5" /> ¡Empezar la ruleta!
        </Button>
      </div>
    );
  }

  // ── Pantalla de juego (pick_slot o pick_player) ──
  return (
    <div className="pb-8">
      {/* Cabecera de progreso */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-pulpo-500/30 bg-gradient-to-br from-pulpo-500/15 to-surface/70 p-3.5">
        <div className="min-w-0">
          {phase === "pick_slot" && !complete && currentTeam && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-pulpo-300">
                ¿Dónde pones a este jugador?
              </p>
              <p className="text-sm text-muted">
                Toca una posición libre para un jugador de{" "}
                <b className="text-foreground">{currentTeam.name}</b>
              </p>
            </>
          )}
          {complete && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-pulpo-300">¡11 fichados!</p>
              <p className="text-sm text-muted">Tu equipo está listo. ¡A jugar el Mundial!</p>
            </>
          )}
          {!complete && !currentTeam && (
            <p className="text-sm text-muted">Preparando la ruleta…</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-black tabular-nums leading-none">{filled}/11</p>
          <p className="text-[10px] text-muted-foreground">países</p>
        </div>
      </div>

      {/* Toggle medias */}
      <div className="mt-3 flex items-center justify-between gap-2">
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

      {/* Campo: en modo pick_slot resalta los huecos libres */}
      <div className="mt-3">
        <FormationPitch
          formation={formation}
          picks={picks}
          interactive={phase === "pick_slot" && !complete}
          activeIndex={null}
          highlightEmpty={phase === "pick_slot" && !complete}
          showMedias={showMedias}
          onSlot={phase === "pick_slot" && !complete ? handleSlotPicked : undefined}
        />
      </div>

      {/* Stats del equipo */}
      {filled > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <StatBar label="Media" value={strength.avgRating} hidden={!showMedias} />
          <ChemBar chemistry={strength.chemistry} clubLinks={strength.clubLinks} />
          <StatBar label="Ataque" value={strength.attack} hidden={!showMedias} />
          <StatBar label="Defensa" value={strength.defense} hidden={!showMedias} />
        </div>
      )}

      {filled > 0 && !complete && (
        <button
          onClick={undo}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground active:scale-95"
        >
          <Undo2 className="h-3.5 w-3.5" /> Deshacer último
        </button>
      )}

      {/* CTA: jugar o esperando ruleta */}
      {complete && (
        <div className="sticky bottom-20 z-10 mt-4">
          <Button
            size="full"
            variant="primary"
            onClick={startSimulation}
            className="h-14 animate-heartbeat text-base shadow-xl"
          >
            <Trophy className="h-5 w-5" /> ¡Jugar el Mundial! <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Ruleta (overlay) */}
      {phase === "spinning" && currentTeam && (
        <TeamRoulette
          key={currentTeam.id + filled}
          target={currentTeam}
          pool={teams}
          playerNumber={filled + 1}
          onChoose={handleSpinLanded}
          onRespin={handleRespin}
          onCancel={() => {
            // Si cancela sin haber empezado, vuelve al intro
            if (filled === 0) {
              setPhase("intro");
              setCurrentTeam(null);
            } else {
              setPhase("pick_slot");
            }
          }}
        />
      )}

      {/* Picker de jugador */}
      {phase === "pick_player" && pendingSlot != null && currentTeam && (
        targetSquad ? (
          <PlayerPicker
            team={currentTeam}
            squad={targetSquad}
            line={formation.slots[pendingSlot].line}
            slotLabel={formation.slots[pendingSlot].label}
            showMedias={showMedias}
            existingPicks={picks}
            onPick={handlePlayerPicked}
            onBack={() => setPhase("pick_slot")}
            onClose={() => {
              setPendingSlot(null);
              setPhase("pick_slot");
            }}
          />
        ) : (
          // Squad aún cargando
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-pulpo-400 border-t-transparent" />
              <p className="text-sm font-semibold text-pulpo-200">Cargando plantilla…</p>
            </div>
          </div>
        )
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

function ChemBar({ chemistry, clubLinks }: { chemistry: number; clubLinks: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface/50 p-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium text-muted">Química</span>
        <span className="text-sm font-extrabold tabular-nums text-pink-400">{chemistry}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full bg-pink-500 transition-all" style={{ width: `${chemistry}%` }} />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        {clubLinks > 0
          ? `🔗 ${clubLinks} par${clubLinks !== 1 ? "es" : ""} de club (+${chemistry}%)`
          : "Pon compañeros de club para subir"}
      </p>
    </div>
  );
}

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
