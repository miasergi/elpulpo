"use client";

import { useEffect, useState } from "react";
import { TeamFlag } from "@/components/match/team-flag";
import { Avatar } from "@/components/ui/avatar";
import { playTick, haptic } from "@/lib/sound";
import { cn } from "@/lib/utils";
import type { SimMatch } from "@/lib/games/eleven";

export function MatchReveal({
  match,
  label,
  knockout,
  userAvatarUrl,
  onRevealed,
}: {
  match: SimMatch;
  label: string;
  knockout: boolean;
  userAvatarUrl?: string | null;
  onRevealed?: (userWon: boolean, draw: boolean) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const userWon = match.winner === "home";
  const draw = match.homeGoals === match.awayGoals;

  useEffect(() => {
    const t = setTimeout(() => {
      setRevealed(true);
      playTick(userWon ? "success" : "tap");
      haptic(userWon ? 18 : 8);
      onRevealed?.(userWon, draw && !knockout);
    }, 1350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const outcome = !knockout && draw ? "draw" : userWon ? "win" : "loss";

  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-5">
      <p className="mb-4 text-center text-xs font-bold uppercase tracking-widest text-pulpo-300">{label}</p>

      <div className="flex items-center justify-between gap-2">
        <TeamSide
          name={match.home.team.name}
          flag={match.home.team}
          overall={match.home.overall}
          highlight
          isUser={!!match.home.isUser}
          userAvatarUrl={userAvatarUrl}
        />
        <div className="flex min-w-[88px] flex-col items-center">
          {revealed ? (
            <div className="animate-pop text-center">
              <div className="text-4xl font-black tabular-nums leading-none">
                {match.homeGoals}<span className="px-1 text-muted-foreground">-</span>{match.awayGoals}
              </div>
              {match.homePens != null && (
                <div className="mt-1 text-[11px] font-semibold text-muted">
                  {match.homePens}-{match.awayPens} en penaltis
                </div>
              )}
            </div>
          ) : (
            <Suspense />
          )}
        </div>
        <TeamSide
          name={match.away.team.name}
          flag={match.away.team}
          overall={match.away.overall}
        />
      </div>

      {revealed && (
        <div className="mt-4 flex justify-center animate-pop">
          <span
            className={cn(
              "rounded-full px-4 py-1 text-sm font-extrabold",
              outcome === "win" && "bg-pitch-500/20 text-pitch-400",
              outcome === "draw" && "bg-warning/15 text-warning",
              outcome === "loss" && "bg-danger/15 text-danger"
            )}
          >
            {outcome === "win" ? "¡VICTORIA!" : outcome === "draw" ? "EMPATE" : "DERROTA"}
          </span>
        </div>
      )}
    </div>
  );
}

function TeamSide({
  name,
  flag,
  overall,
  highlight,
  isUser,
  userAvatarUrl,
}: {
  name: string;
  flag: { id: string; name: string; code: string | null; flag_url: string | null };
  overall: number;
  highlight?: boolean;
  isUser?: boolean;
  userAvatarUrl?: string | null;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
      {isUser && userAvatarUrl ? (
        <Avatar src={userAvatarUrl} name={name} size={52} />
      ) : (
        <TeamFlag team={flag} size={52} />
      )}
      <p className={cn("max-w-full truncate text-xs font-bold", highlight && "text-pulpo-200")}>{name}</p>
      <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-bold tabular-nums text-muted">
        MEDIA {overall}
      </span>
    </div>
  );
}

function Suspense() {
  return (
    <div className="flex flex-col items-center gap-2 py-1">
      <div className="text-2xl animate-bounce">⚽</div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-pulpo-400"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
