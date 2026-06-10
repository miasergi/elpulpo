"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Check, Lock, Users, Target } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { playTick } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
  stage: string | null;
  home_team: TeamLite | null;
  away_team: TeamLite | null;
}

export function PredictionCard({
  match,
  initialHome,
  initialAway,
  userId,
  linkToDetail = false,
}: {
  match: MatchWithTeams;
  initialHome: number | null;
  initialAway: number | null;
  userId: string;
  linkToDetail?: boolean;
}) {
  const locked = isLocked(match.status, match.kickoff_at);
  const router = useRouter();
  const [home, setHome] = useState<number | null>(initialHome);
  const [away, setAway] = useState<number | null>(initialAway);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const badge = statusBadge(match.status, match.minute);

  function bump(side: "home" | "away", delta: number) {
    if (locked) return;
    const setter = side === "home" ? setHome : setAway;
    setter((v) => Math.max(0, Math.min(99, (v ?? 0) + delta)));
    setState("idle");
  }

  // Debounced auto-save once both scores are set.
  useEffect(() => {
    if (locked || home === null || away === null) return;
    if (home === initialHome && away === initialAway) return;
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
          { user_id: userId, match_id: match.id, home_score: home, away_score: away },
          { onConflict: "user_id,match_id" }
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
  }, [home, away]);

  const predicted = home !== null && away !== null;
  const hitExact =
    locked && match.home_score === home && match.away_score === away && predicted;

  return (
    <div
      className={cn(
        "rounded-lg border bg-surface/70 p-4 transition-colors",
        hitExact ? "border-pitch-500/60" : "border-border"
      )}
    >
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate">{match.stage ?? "Partido"}</span>
        <span className="flex items-center gap-2">
          {badge ? (
            <Badge variant={badge.variant}>{badge.label}</Badge>
          ) : (
            <span>{kickoffLabel(match.kickoff_at)}</span>
          )}
          {locked && <Lock className="h-3 w-3" />}
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

      {/* Footer: actual result / save state */}
      <div className="mt-3 flex h-5 items-center justify-center text-xs">
        {locked && match.home_score !== null ? (
          <span className="text-muted">
            Resultado real:{" "}
            <span className="font-semibold text-foreground">
              {match.home_score} - {match.away_score}
            </span>
            {hitExact && (
              <span className="ml-2 inline-flex items-center gap-1 text-pitch-400">
                <Target className="h-3.5 w-3.5" /> ¡Exacto!
              </span>
            )}
          </span>
        ) : locked && !predicted ? (
          <span className="text-muted-foreground">No predijiste este partido</span>
        ) : state === "saving" ? (
          <span className="text-muted-foreground">Guardando…</span>
        ) : state === "saved" ? (
          <span className="flex items-center gap-1 text-pitch-400">
            <Check className="h-3.5 w-3.5" /> Guardado
          </span>
        ) : !predicted ? (
          <span className="text-muted-foreground">Pon tu marcador</span>
        ) : null}
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

function TeamSide({ team, align = "left" }: { team: TeamLite | null; align?: "left" | "right" }) {
  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-2", align === "right" && "flex-row-reverse")}>
      <TeamFlag team={team} size={36} />
      <span className={cn("truncate text-sm font-medium", align === "right" && "text-right")}>
        {team?.short_name ?? team?.name ?? "Por definir"}
      </span>
    </div>
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
