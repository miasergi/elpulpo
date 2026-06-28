"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Check, Lock, Users, Target, Zap } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { playTick } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { predictionPoints, matchMultiplier, needsTiebreakWinner, awardsAdvanceBonus, type ScoringRules } from "@/lib/scoring";
import { TeamFlag, type TeamLite } from "./team-flag";
import { kickoffLabel, isLocked, statusBadge } from "@/lib/format";
import type { MatchStatus } from "@/lib/database.types";

export interface MatchWithTeams {
  id: string;
  kickoff_at: string;
  status: MatchStatus;
  minute: number | null;
  home_score: number | null;
  away_score: number | null;
  winner_team_id: string | null;
  stage: string | null;
  home_team: TeamLite | null;
  away_team: TeamLite | null;
}

export function PredictionCard({
  match,
  initialHome,
  initialAway,
  initialWinnerTeamId,
  userId,
  groupId,
  scoring = null,
  underdogTeamId = null,
  linkToDetail = false,
}: {
  match: MatchWithTeams;
  initialHome: number | null;
  initialAway: number | null;
  initialWinnerTeamId: string | null;
  userId: string;
  /** Group the prediction belongs to; null = user has no active group yet. */
  groupId: string | null;
  /** Active group's scoring rules; enables the points display. */
  scoring?: ScoringRules | null;
  /** The user's underdog pick in this group (its matches score double). */
  underdogTeamId?: string | null;
  linkToDetail?: boolean;
}) {
  const locked = isLocked(match.status, match.kickoff_at);
  const router = useRouter();
  const [home, setHome] = useState<number | null>(initialHome);
  const [away, setAway] = useState<number | null>(initialAway);
  const [winnerTeamId, setWinnerTeamId] = useState<string | null>(initialWinnerTeamId);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const badge = statusBadge(match.status, match.minute);
  const canAwardAdvance = awardsAdvanceBonus(match.stage);

  function bump(side: "home" | "away", delta: number) {
    if (locked || !groupId) return;
    const setter = side === "home" ? setHome : setAway;
    setter((v) => Math.max(0, Math.min(99, (v ?? 0) + delta)));
    setState("idle");
  }

  function pickWinner(teamId: string | null) {
    if (locked || !groupId || !teamId) return;
    setWinnerTeamId(teamId);
    setState("idle");
  }

  // Debounced auto-save once both scores are set.
  useEffect(() => {
    if (locked || !groupId || home === null || away === null) return;
    const tiebreakWinnerId = canAwardAdvance && home === away ? winnerTeamId : null;
    if (canAwardAdvance && home === away && !tiebreakWinnerId) return;
    if (home === initialHome && away === initialAway && tiebreakWinnerId === initialWinnerTeamId) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      // Re-check at save time: the page may have been open since before kickoff.
      if (isLocked(match.status, match.kickoff_at)) {
        toast.error("El partido ya ha empezado: predicción cerrada");
        router.refresh();
        return;
      }
      setState("saving");
      const supabase = createClient();
      const { error } = await supabase
        .from("predictions")
        .upsert(
          {
            user_id: userId,
            match_id: match.id,
            group_id: groupId,
            home_score: home,
            away_score: away,
            winner_team_id: tiebreakWinnerId,
          },
          { onConflict: "user_id,match_id,group_id" }
        );
      if (error) {
        setState("idle");
        toast.error(
          /locked/i.test(error.message)
            ? "El partido ya ha empezado: predicción cerrada"
            : "No se pudo guardar la predicción"
        );
      } else {
        setState("saved");
        playTick("success");
        // Refresh the RSC payload so back/forward navigation shows the
        // saved prediction (pages are reused from the client cache).
        router.refresh();
      }
    }, 700);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home, away, winnerTeamId]);

  const predicted = home !== null && away !== null;
  const needsWinner = canAwardAdvance && needsTiebreakWinner(home, away);
  const predictionComplete = predicted && (!needsWinner || !!winnerTeamId);
  const hasResult = match.home_score !== null && match.away_score !== null;

  // x2 multiplier (España / underdog pick) and points earned.
  const mult = matchMultiplier(match.home_team, match.away_team, underdogTeamId);
  const isDoubleTeam = match.home_team?.double_points || match.away_team?.double_points;
  const basePts =
    scoring && predictionComplete && locked && hasResult
      ? predictionPoints(
          home!,
          away!,
          match.home_score,
          match.away_score,
          scoring,
          winnerTeamId,
          match.winner_team_id,
          match.home_team?.id ?? null,
          match.away_team?.id ?? null,
          canAwardAdvance
        )
      : null;
  const earned = basePts !== null ? basePts * mult : null;
  const hitExact =
    locked && hasResult && predicted && match.home_score === home && match.away_score === away;

  return (
    <div
      className={cn(
        "rounded-lg border bg-surface/70 p-4 transition-colors",
        hitExact
          ? "border-pitch-500/70 bg-pitch-500/5"
          : earned !== null && earned > 0
            ? "border-pulpo-500/50"
            : !locked && predicted
              ? "border-pitch-500/40"
              : "border-border"
      )}
    >
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate rounded-full bg-primary/10 px-2 py-0.5 font-medium text-pulpo-300">
            {match.stage ?? "Partido"}
          </span>
          {mult > 1 && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold text-warning">
              <Zap className="h-3 w-3" /> x2 {isDoubleTeam ? "España" : "tu tapado"}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {badge ? (
            <Badge variant={badge.variant}>{badge.label}</Badge>
          ) : (
            <span>{kickoffLabel(match.kickoff_at)}</span>
          )}
          {locked && <Lock className="h-3 w-3" />}
          {!locked && predicted && <Check className="h-3.5 w-3.5 text-pitch-400" />}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <TeamSide team={match.home_team} />

        <div className="flex shrink-0 items-center gap-2">
          <Stepper
            value={home}
            locked={locked}
            onInc={() => bump("home", 1)}
            onDec={() => bump("home", -1)}
          />
          <span className="text-muted-foreground">-</span>
          <Stepper
            value={away}
            locked={locked}
            onInc={() => bump("away", 1)}
            onDec={() => bump("away", -1)}
          />
        </div>

        <TeamSide team={match.away_team} align="right" />
      </div>

      {needsWinner && (
        <div className="mt-3 rounded-md border border-border bg-surface/50 p-2">
          <p className="mb-2 text-center text-[11px] font-medium text-muted">
            En empate, elige quien pasa por penaltis
          </p>
          <div className="grid grid-cols-2 gap-2">
            <WinnerButton
              team={match.home_team}
              selected={winnerTeamId === match.home_team?.id}
              locked={locked}
              onClick={() => pickWinner(match.home_team?.id ?? null)}
            />
            <WinnerButton
              team={match.away_team}
              selected={winnerTeamId === match.away_team?.id}
              locked={locked}
              onClick={() => pickWinner(match.away_team?.id ?? null)}
            />
          </div>
        </div>
      )}

      {/* Footer: actual result / points / save state */}
      <div className="mt-3 flex h-5 items-center justify-center text-xs">
        {locked && hasResult ? (
          <span className="flex items-center gap-2 text-muted">
            <span>
              Resultado:{" "}
              <span className="font-semibold text-foreground">
                {match.home_score} - {match.away_score}
              </span>
            </span>
            {earned !== null && (
              <span
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-0.5 font-bold",
                  earned > 0 ? "bg-pitch-500/15 text-pitch-400" : "bg-surface-3 text-muted-foreground"
                )}
              >
                {hitExact && <Target className="h-3.5 w-3.5" />}
                {earned > 0 ? `+${earned} pts` : "0 pts"}
                {match.status === "live" && " (de momento)"}
              </span>
            )}
            {earned === null && hitExact && (
              <span className="flex items-center gap-1 text-pitch-400">
                <Target className="h-3.5 w-3.5" /> ¡Exacto!
              </span>
            )}
          </span>
        ) : locked && !predictionComplete ? (
          <span className="text-muted-foreground">No predijiste este partido</span>
        ) : !groupId ? (
          <Link href="/app/groups" className="font-medium text-pulpo-300">
            Únete a un grupo para predecir →
          </Link>
        ) : state === "saving" ? (
          <span className="text-muted-foreground">Guardando…</span>
        ) : state === "saved" ? (
          <span className="flex items-center gap-1 text-pitch-400">
            <Check className="h-3.5 w-3.5" /> Guardado
          </span>
        ) : needsWinner && !winnerTeamId ? (
          <span className="text-warning">Elige quien pasa para guardar</span>
        ) : predictionComplete ? (
          <span className="flex items-center gap-1 text-pitch-400/80">
            <Check className="h-3.5 w-3.5" /> Predicción guardada
          </span>
        ) : (
          <span className="text-muted-foreground">Pon tu marcador</span>
        )}
      </div>

      {locked && linkToDetail && (
        <Link
          href={`/app/matches/${match.id}`}
          className="mt-2 flex items-center justify-center gap-1.5 border-t border-border/60 pt-2.5 text-xs font-medium text-pulpo-300"
        >
          <Users className="h-3.5 w-3.5" /> Ver predicciones de todos
        </Link>
      )}
    </div>
  );
}

function WinnerButton({
  team,
  selected,
  locked,
  onClick,
}: {
  team: TeamLite | null;
  selected: boolean;
  locked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked || !team}
      className={cn(
        "flex min-w-0 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors disabled:opacity-70",
        selected
          ? "border-pitch-500/70 bg-pitch-500/15 text-pitch-400"
          : "border-border bg-surface-2 text-muted hover:bg-surface-3"
      )}
    >
      {selected && <Check className="h-3.5 w-3.5" />}
      <span className="truncate">{team?.short_name ?? team?.name ?? "Por definir"}</span>
    </button>
  );
}

function TeamSide({ team, align = "left" }: { team: TeamLite | null; align?: "left" | "right" }) {
  const inner = (
    <>
      <TeamFlag team={team} size={36} />
      <span className={cn("truncate text-sm font-medium", align === "right" && "text-right")}>
        {team?.short_name ?? team?.name ?? "Por definir"}
      </span>
    </>
  );
  const cls = cn(
    "flex min-w-0 flex-1 items-center gap-2",
    align === "right" && "flex-row-reverse"
  );
  if (!team) return <div className={cls}>{inner}</div>;
  return (
    <Link href={`/app/teams/${team.id}`} className={cls} title={`Ver plantilla de ${team.name}`}>
      {inner}
    </Link>
  );
}

function Stepper({
  value,
  locked,
  onInc,
  onDec,
}: {
  value: number | null;
  locked: boolean;
  onInc: () => void;
  onDec: () => void;
}) {
  if (locked) {
    return (
      <div className="flex h-12 w-10 items-center justify-center rounded-md bg-surface-3 text-xl font-bold tabular-nums">
        {value ?? "–"}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onInc}
        className="flex h-7 w-10 items-center justify-center rounded-md bg-surface-3 text-muted hover:bg-primary/30 hover:text-foreground active:scale-95"
        aria-label="Subir"
      >
        <Plus className="h-4 w-4" />
      </button>
      <div className="flex h-9 w-10 items-center justify-center rounded-md bg-surface-2 text-2xl font-bold tabular-nums">
        {value ?? "–"}
      </div>
      <button
        type="button"
        onClick={onDec}
        className="flex h-7 w-10 items-center justify-center rounded-md bg-surface-3 text-muted hover:bg-primary/30 hover:text-foreground active:scale-95 disabled:opacity-40"
        disabled={(value ?? 0) <= 0}
        aria-label="Bajar"
      >
        <Minus className="h-4 w-4" />
      </button>
    </div>
  );
}
