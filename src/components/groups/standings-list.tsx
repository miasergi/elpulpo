"use client";

import { useState } from "react";
import { Medal, BarChart3, ChevronDown, Zap, Check, X, EyeOff } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { TeamFlag } from "@/components/match/team-flag";
import { cn } from "@/lib/utils";
import type { StandingRow, MemberBonusInfo } from "@/lib/groups";

const MEDAL_COLOR = ["text-[#f5c542]", "text-[#cbd5e1]", "text-[#cd7f32]"];

export function StandingsList({
  rows,
  currentUserId,
  bonusBoard,
  tournamentStarted = true,
}: {
  rows: StandingRow[];
  currentUserId: string;
  /** Per-member underdog + bonus answers (as visible to the caller). */
  bonusBoard?: Record<string, MemberBonusInfo>;
  tournamentStarted?: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <div className="mt-10 text-center text-sm text-muted">
        <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3">Aún no hay puntos. ¡Empieza a predecir partidos!</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {rows.map((r) => {
        const isMe = r.user_id === currentUserId;
        const info = bonusBoard?.[r.user_id];
        const open = expanded === r.user_id;
        return (
          <div
            key={r.user_id}
            className={cn(
              "rounded-lg border",
              isMe ? "border-primary/60 bg-primary/10" : "border-border bg-surface/50"
            )}
          >
            <button
              type="button"
              onClick={() => setExpanded(open ? null : r.user_id)}
              className="flex w-full items-center gap-3 p-3 text-left"
            >
              <div className="flex w-7 shrink-0 items-center justify-center text-lg font-bold tabular-nums">
                {r.rank <= 3 ? (
                  <Medal className={cn("h-5 w-5", MEDAL_COLOR[r.rank - 1])} />
                ) : (
                  <span className="text-muted">{r.rank}</span>
                )}
              </div>
              <Avatar src={r.avatar_url} name={r.display_name} size={36} />
              <div className="min-w-0 flex-1">
                <p className={cn("truncate font-semibold", isMe && "text-pulpo-200")}>
                  {r.display_name} {isMe && <span className="text-xs text-muted">(tú)</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.played} jugados · {r.exacts} exactos
                  {r.bonus_points > 0 && ` · +${r.bonus_points} bonus`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold tabular-nums">{r.total_points}</p>
                <p className="text-[10px] text-muted-foreground">pts</p>
              </div>
              {info && (
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
                />
              )}
            </button>

            {open && info && (
              <MemberBonusPanel info={info} isMe={isMe} tournamentStarted={tournamentStarted} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function MemberBonusPanel({
  info,
  isMe,
  tournamentStarted,
}: {
  info: MemberBonusInfo;
  isMe: boolean;
  tournamentStarted: boolean;
}) {
  const showUnderdog = isMe || tournamentStarted;
  return (
    <div className="space-y-2.5 border-t border-border/60 px-3 pb-3 pt-2.5 text-sm">
      {/* Underdog pick */}
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 text-xs font-medium text-warning">
          <Zap className="h-3.5 w-3.5" /> Tapado x2:
        </span>
        {!showUnderdog ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <EyeOff className="h-3 w-3" /> se revela al empezar el torneo
          </span>
        ) : info.underdog ? (
          <span className="flex items-center gap-1.5 text-xs font-medium">
            <TeamFlag team={info.underdog} size={18} /> {info.underdog.name}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">sin elegir</span>
        )}
      </div>

      {/* Bonus answers */}
      {info.answers.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {isMe
            ? "No has respondido ningún bonus todavía."
            : tournamentStarted
              ? "No respondió ningún bonus."
              : "Sus bonus se revelan cuando empiece el torneo."}
        </p>
      ) : (
        <div className="space-y-1">
          {info.answers.map((a) => (
            <div key={a.label} className="flex items-center gap-2 text-xs">
              <span className="min-w-0 flex-1 truncate text-muted">{a.label}</span>
              <span className="truncate font-medium">{a.answer}</span>
              {a.status === "correct" ? (
                <span className="flex shrink-0 items-center gap-0.5 font-semibold text-pitch-400">
                  <Check className="h-3.5 w-3.5" /> +{a.points}
                </span>
              ) : a.status === "wrong" ? (
                <X className="h-3.5 w-3.5 shrink-0 text-danger" />
              ) : (
                <span className="shrink-0 text-[10px] text-muted-foreground">+{a.points}?</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
