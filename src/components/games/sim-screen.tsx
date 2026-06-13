"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Share2, RotateCcw, Dice5, Loader2, Check, X } from "lucide-react";
import { TeamFlag } from "@/components/match/team-flag";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { playTick, haptic } from "@/lib/sound";
import { cn } from "@/lib/utils";
import {
  resultEmoji,
  type BracketRound,
  type Formation,
  type GroupRow,
  type LineupStrength,
  type PickedPlayer,
  type RunResult,
  type TeamLite,
} from "@/lib/games/eleven";
import { FormationPitch } from "./formation-pitch";
import { MatchReveal } from "./match-reveal";
import { Confetti } from "./confetti";

const KO_DISPLAY: Record<string, string> = {
  Dieciseisavos: "Dieciseisavos de final",
  Octavos: "Octavos de final",
  Cuartos: "Cuartos de final",
  Semifinal: "Semifinales",
  Final: "Gran Final",
};

type Scene =
  | { t: "intro" }
  | { t: "group"; i: number }
  | { t: "table" }
  | { t: "ko"; i: number }
  | { t: "final" };

export function SimScreen({
  run,
  userTeam,
  userAvatarUrl,
  formation,
  picks,
  strength,
  showMedias,
  onReplay,
  onNewGame,
}: {
  run: RunResult;
  userTeam: TeamLite;
  userAvatarUrl?: string | null;
  formation: Formation;
  picks: (PickedPlayer | null)[];
  strength: LineupStrength;
  showMedias: boolean;
  onReplay: () => void;
  onNewGame: () => void;
}) {
  const scenes = useMemo<Scene[]>(() => {
    const s: Scene[] = [{ t: "intro" }];
    run.groupMatches.forEach((_, i) => s.push({ t: "group", i }));
    s.push({ t: "table" });
    run.knockout.forEach((_, i) => s.push({ t: "ko", i }));
    s.push({ t: "final" });
    return s;
  }, [run]);

  const [idx, setIdx] = useState(0);
  const [ready, setReady] = useState(true);
  const [confetti, setConfetti] = useState(false);
  // Track which KO rounds have been revealed so we can show bracket results
  const [koRevealedUpTo, setKoRevealedUpTo] = useState(-1);
  const scene = scenes[idx];

  function fire() {
    setConfetti(true);
    haptic(30);
    setTimeout(() => setConfetti(false), 3800);
  }

  function next() {
    const target = scenes[Math.min(idx + 1, scenes.length - 1)];
    const isMatch = target.t === "group" || target.t === "ko";
    setReady(!isMatch);
    if (target.t === "table" && run.advanced) fire();
    if (target.t === "final" && run.champion) fire();
    playTick("tap");
    setIdx((i) => Math.min(i + 1, scenes.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const nextLabel = (() => {
    switch (scene.t) {
      case "intro":
        return "Empezar la fase de grupos";
      case "group":
        return scene.i < run.groupMatches.length - 1 ? "Siguiente partido" : "Ver la clasificación";
      case "table":
        return run.advanced ? "A las eliminatorias →" : "Ver mi resultado";
      case "ko": {
        const tie = run.knockout[scene.i];
        return tie.userWon ? (tie.round === "Final" ? "Ver mi resultado" : "Siguiente ronda →") : "Ver mi resultado";
      }
      default:
        return "";
    }
  })();

  return (
    <div className="pb-10">
      {confetti && <Confetti />}

      <SceneProgress scenes={scenes} idx={idx} run={run} />

      <div className="mt-3">
        {scene.t === "intro" && (
          <GroupIntro run={run} userTeam={userTeam} userAvatarUrl={userAvatarUrl} />
        )}

        {scene.t === "group" && (
          <MatchReveal
            key={`g${scene.i}`}
            match={run.groupMatches[scene.i]}
            label={`Jornada ${scene.i + 1} · Fase de grupos`}
            knockout={false}
            userAvatarUrl={userAvatarUrl}
            onRevealed={() => setReady(true)}
          />
        )}

        {scene.t === "table" && <GroupResult run={run} />}

        {scene.t === "ko" && (
          <>
            <MatchReveal
              key={`k${scene.i}`}
              match={run.knockout[scene.i].match}
              label={KO_DISPLAY[run.knockout[scene.i].round] ?? run.knockout[scene.i].round}
              knockout
              userAvatarUrl={userAvatarUrl}
              onRevealed={(userWon) => {
                setReady(true);
                setKoRevealedUpTo(scene.i);
                if (userWon) fire();
              }}
            />
            {koRevealedUpTo >= scene.i && run.bracketRounds[scene.i] && (
              <BracketRoundPanel
                round={run.bracketRounds[scene.i]}
                key={`br${scene.i}`}
              />
            )}
          </>
        )}

        {scene.t === "final" && (
          <ResultCard
            run={run}
            formation={formation}
            picks={picks}
            strength={strength}
            showMedias={showMedias}
            onReplay={onReplay}
            onNewGame={onNewGame}
          />
        )}
      </div>

      {scene.t !== "final" && (
        <div className="sticky bottom-20 z-10 mt-5">
          <Button size="full" variant="primary" disabled={!ready} onClick={next} className="h-13 text-base shadow-xl">
            {ready ? (
              <>
                {nextLabel} <ChevronRight className="h-5 w-5" />
              </>
            ) : (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Jugando…
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function SceneProgress({ scenes, idx, run }: { scenes: Scene[]; idx: number; run: RunResult }) {
  const scene = scenes[idx];
  const phase =
    scene.t === "ko"
      ? KO_DISPLAY[run.knockout[scene.i].round] ?? run.knockout[scene.i].round
      : scene.t === "final"
      ? "Resultado final"
      : "Fase de grupos";
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-bold uppercase tracking-wide text-pulpo-300">{phase}</p>
      <div className="flex items-center gap-1">
        {scenes.map((_, i) => (
          <span
            key={i}
            className={cn("h-1.5 rounded-full transition-all", i === idx ? "w-5 bg-pulpo-400" : i < idx ? "w-1.5 bg-pulpo-700" : "w-1.5 bg-surface-3")}
          />
        ))}
      </div>
    </div>
  );
}

function GroupIntro({
  run,
  userTeam,
  userAvatarUrl,
}: {
  run: RunResult;
  userTeam: TeamLite;
  userAvatarUrl?: string | null;
}) {
  const rivals = run.groupMatches.map((m) => m.away.team);
  const teams = [run.user.team, ...rivals];
  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-5 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-pulpo-300">Tu grupo en el Mundial</p>
      <p className="mt-1 text-sm text-muted">Juegas contra estas 3 selecciones. Pasan los 2 primeros.</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {teams.map((t) => {
          const isUser = t.id === userTeam.id;
          return (
            <div
              key={t.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border p-2.5",
                isUser ? "border-pulpo-400 bg-pulpo-500/15" : "border-border bg-surface/50"
              )}
            >
              {isUser && userAvatarUrl ? (
                <Avatar src={userAvatarUrl} name={userTeam.name} size={34} />
              ) : (
                <TeamFlag team={t} size={34} />
              )}
              <span className="min-w-0 flex-1 truncate text-left text-sm font-semibold">{t.name}</span>
              {isUser && <span className="text-[10px] font-bold text-pulpo-300">TÚ</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GroupResult({ run }: { run: RunResult }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-4">
      <div className="mb-3 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-pulpo-300">Clasificación del grupo</p>
        <p
          className={cn(
            "mt-1 text-lg font-extrabold",
            run.advanced ? "text-pitch-400" : "text-danger"
          )}
        >
          {run.advanced ? "¡Clasificado a eliminatorias! 🎉" : "Eliminado en la fase de grupos 😞"}
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-[1.5rem_1fr_2rem_2rem_2.2rem] gap-1 bg-surface-2 px-3 py-1.5 text-[10px] font-bold uppercase text-muted-foreground">
          <span>#</span>
          <span>Selección</span>
          <span className="text-center">PJ</span>
          <span className="text-center">DG</span>
          <span className="text-center">Pts</span>
        </div>
        {run.groupTable.map((r, i) => (
          <Row key={r.team.id} r={r} pos={i + 1} qualifies={i < 2} />
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">Los 2 primeros pasan de ronda.</p>
    </div>
  );
}

function Row({ r, pos, qualifies }: { r: GroupRow; pos: number; qualifies: boolean }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[1.5rem_1fr_2rem_2rem_2.2rem] items-center gap-1 px-3 py-2 text-sm",
        r.isUser ? "bg-pulpo-500/15 font-bold" : "bg-surface/40"
      )}
    >
      <span className={cn("flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold", qualifies ? "bg-pitch-500/25 text-pitch-400" : "text-muted-foreground")}>
        {pos}
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <TeamFlag team={r.team} size={22} />
        <span className="truncate">{r.team.name}</span>
        {r.isUser && <span className="text-[9px] font-bold text-pulpo-300">TÚ</span>}
      </span>
      <span className="text-center tabular-nums text-muted">{r.pj}</span>
      <span className="text-center tabular-nums text-muted">{r.gf - r.gc > 0 ? `+${r.gf - r.gc}` : r.gf - r.gc}</span>
      <span className="text-center tabular-nums font-extrabold">{r.pts}</span>
    </div>
  );
}

/** Panel con el resto de resultados de una ronda de eliminatorias. */
function BracketRoundPanel({ round }: { round: BracketRound }) {
  const others = round.matches.slice(1); // match[0] es el del usuario
  if (others.length === 0) return null;
  return (
    <div className="mt-3 rounded-2xl border border-border bg-surface/60 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Resto de {KO_DISPLAY[round.name] ?? round.name}
      </p>
      <div className="space-y-2">
        {others.map((m, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              <TeamFlag team={m.home.team} size={18} />
              <span className={cn("truncate font-medium", m.winner === "home" ? "text-foreground" : "text-muted")}>
                {m.home.team.code ?? m.home.team.name}
              </span>
            </span>
            <span className="shrink-0 font-extrabold tabular-nums">
              {m.homeGoals}
              <span className="px-0.5 text-muted-foreground">-</span>
              {m.awayGoals}
              {m.homePens != null && (
                <span className="ml-1 text-[10px] text-muted">
                  ({m.homePens}-{m.awayPens}p)
                </span>
              )}
            </span>
            <span className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
              <span className={cn("truncate text-right font-medium", m.winner === "away" ? "text-foreground" : "text-muted")}>
                {m.away.team.code ?? m.away.team.name}
              </span>
              <TeamFlag team={m.away.team} size={18} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultCard({
  run,
  formation,
  picks,
  strength,
  showMedias,
  onReplay,
  onNewGame,
}: {
  run: RunResult;
  formation: Formation;
  picks: (PickedPlayer | null)[];
  strength: LineupStrength;
  showMedias: boolean;
  onReplay: () => void;
  onNewGame: () => void;
}) {
  const emoji = resultEmoji(run);
  const glow = run.champion
    ? "from-warning/25 via-surface/80 to-primary/15 border-warning/50"
    : run.advanced
    ? "from-pulpo-500/20 via-surface/80 to-surface/60 border-pulpo-500/40"
    : "from-danger/15 via-surface/80 to-surface/60 border-border";

  return (
    <div className="space-y-4">
      <div className={cn("relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 text-center", glow)}>
        <div className="text-6xl">{emoji}</div>
        <h2 className="mt-2 text-2xl font-black leading-tight">{run.reachedLabel}</h2>
        <p className="mt-1 text-sm font-semibold text-muted">Tu 11 de 11 países</p>
        <div className="mt-3 flex justify-center gap-2 text-[11px]">
          {showMedias && <Stat label="Media" v={strength.avgRating} />}
          {showMedias && <Stat label="Ataque" v={strength.attack} />}
          <Stat label="Química" v={`${strength.chemistry}%`} />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface/60 p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Tu camino</p>
        <div className="space-y-1.5">
          <PathRow
            label="Fase de grupos"
            detail={`${run.groupTable.find((r) => r.isUser)?.pts ?? 0} pts`}
            state={run.advanced ? "win" : "loss"}
          />
          {run.knockout.map((tie) => {
            const m = tie.match;
            const score = `${m.homeGoals}-${m.awayGoals}${m.homePens != null ? ` (${m.homePens}-${m.awayPens}p)` : ""}`;
            return (
              <PathRow
                key={tie.round}
                label={KO_DISPLAY[tie.round] ?? tie.round}
                detail={`vs ${m.away.team.code ?? m.away.team.name} · ${score}`}
                state={tie.userWon ? "win" : "loss"}
              />
            );
          })}
        </div>
      </div>

      <details className="rounded-2xl border border-border bg-surface/60 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-pulpo-200">Ver mi 11 ({formation.name})</summary>
        <div className="mt-3">
          <FormationPitch formation={formation} picks={picks} showMedias={showMedias} />
        </div>
      </details>

      <ShareEleven run={run} emoji={emoji} strength={strength} showMedias={showMedias} />

      <div className="flex gap-2">
        <Button size="full" variant="secondary" onClick={onReplay} className="flex-1">
          <RotateCcw className="h-4 w-4" /> Otra vez
        </Button>
        <Button size="full" variant="outline" onClick={onNewGame} className="flex-1">
          <Dice5 className="h-4 w-4" /> Nuevo 11
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: string | number }) {
  return (
    <span className="rounded-full bg-surface-3/70 px-2.5 py-1">
      <span className="text-muted-foreground">{label} </span>
      <span className="font-extrabold tabular-nums">{v}</span>
    </span>
  );
}

function PathRow({ label, detail, state }: { label: string; detail: string; state: "win" | "loss" }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          state === "win" ? "bg-pitch-500/20 text-pitch-400" : "bg-danger/15 text-danger"
        )}
      >
        {state === "win" ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      </span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span className="text-xs text-muted">{detail}</span>
    </div>
  );
}

function ShareEleven({
  run,
  emoji,
  strength,
  showMedias,
}: {
  run: RunResult;
  emoji: string;
  strength: LineupStrength;
  showMedias: boolean;
}) {
  const [busy, setBusy] = useState(false);

  const imageUrl =
    `/api/og/eleven?name=${encodeURIComponent("Mi 11 de 11 países")}` +
    `&res=${encodeURIComponent(run.reachedLabel)}&emoji=${encodeURIComponent(emoji)}` +
    (showMedias ? `&ov=${strength.avgRating}` : "") +
    `&chem=${strength.chemistry}`;
  const text = `Monté un 11 con jugadores de 11 países distintos y llegó a "${run.reachedLabel}" ${emoji} en El Pulpo. ¿Mejoras mi 11? elpulpo.vercel.app`;

  async function share() {
    setBusy(true);
    try {
      const abs = `${window.location.origin}${imageUrl}`;
      try {
        const res = await fetch(abs);
        const blob = await res.blob();
        const file = new File([blob], "mi-11-mundial.png", { type: "image/png" });
        const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
        if (nav.canShare?.({ files: [file] }) && navigator.share) {
          await navigator.share({ files: [file], text });
          return;
        }
      } catch {
        /* fallback */
      }
      if (navigator.share) {
        await navigator.share({ text, url: window.location.origin });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success("Texto copiado · pégalo en WhatsApp");
    } catch {
      /* cancelado */
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="full" variant="primary" onClick={share} loading={busy} className="h-13 text-base">
      {!busy && <Share2 className="h-5 w-5" />} Compartir mi Mundial
    </Button>
  );
}
