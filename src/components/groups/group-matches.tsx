"use client";

import Link from "next/link";
import { CalendarClock, ChevronRight, History } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TeamFlag } from "@/components/match/team-flag";
import { kickoffLabel, statusBadge } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { GroupUpcomingMatch, GroupRecentMatch } from "@/lib/groups";
import type { MatchWithTeams } from "@/components/match/prediction-card";

interface ProfileLite {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export function GroupMatches({
  upcoming,
  recent,
  profiles,
  currentUserId,
}: {
  upcoming: GroupUpcomingMatch[];
  recent: GroupRecentMatch[];
  profiles: ProfileLite[];
  currentUserId: string;
}) {
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const total = profiles.length;

  if (upcoming.length === 0 && recent.length === 0) {
    return (
      <div className="mt-10 text-center text-sm text-muted">
        Aún no hay partidos cargados para esta competición.
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted">
            <CalendarClock className="h-4 w-4 text-pulpo-300" /> Próximos · ¿quién ha predicho ya?
          </h2>
          <div className="space-y-2">
            {upcoming.map(({ match, predictedIds }) => {
              const mePredicted = predictedIds?.includes(currentUserId) ?? false;
              return (
                <Link
                  key={match.id}
                  href={`/app/matches/${match.id}`}
                  className="block rounded-lg border border-border bg-surface/50 p-3"
                >
                  <MatchLine match={match} />
                  <div className="mt-2 flex items-center justify-between">
                    {predictedIds === null ? (
                      <span className="text-xs text-muted-foreground">
                        Las predicciones se revelan al empezar
                      </span>
                    ) : predictedIds.length === 0 ? (
                      <span className="text-xs text-muted-foreground">Aún nadie ha predicho</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="flex -space-x-1.5">
                          {predictedIds.slice(0, 5).map((id) => (
                            <Avatar
                              key={id}
                              src={byId.get(id)?.avatar_url}
                              name={byId.get(id)?.display_name}
                              size={20}
                              className="ring-2 ring-background"
                            />
                          ))}
                        </span>
                        <span className="text-xs text-muted">
                          {predictedIds.length}/{total} han predicho
                        </span>
                      </span>
                    )}
                    {predictedIds !== null &&
                      (mePredicted ? (
                        <Badge variant="accent">El tuyo está</Badge>
                      ) : (
                        <Badge variant="warning">Te falta el tuyo</Badge>
                      ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted">
            <History className="h-4 w-4 text-pulpo-300" /> Ya jugados · predicciones de todos
          </h2>
          <div className="space-y-3">
            {recent.map(({ match, predictions }) => (
              <div key={match.id} className="rounded-lg border border-border bg-surface/50 p-3">
                <Link href={`/app/matches/${match.id}`} className="block">
                  <MatchLine match={match} showScore />
                </Link>
                {predictions.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Nadie del grupo predijo este partido.
                  </p>
                ) : (
                  <div className="mt-2.5 space-y-1.5 border-t border-border/60 pt-2.5">
                    {predictions.map((p) => {
                      const isMe = p.user_id === currentUserId;
                      const prof = byId.get(p.user_id);
                      return (
                        <div key={p.user_id} className="flex items-center gap-2 text-sm">
                          <Avatar src={prof?.avatar_url} name={prof?.display_name} size={22} />
                          <span className={cn("min-w-0 flex-1 truncate", isMe && "font-semibold text-pulpo-200")}>
                            {prof?.display_name ?? "Jugador"} {isMe && <span className="text-xs text-muted">(tú)</span>}
                          </span>
                          <span className="tabular-nums text-muted">
                            {p.home}-{p.away}
                          </span>
                          <span
                            className={cn(
                              "w-9 text-right text-xs font-semibold tabular-nums",
                              p.points > 0 ? "text-pitch-400" : "text-muted-foreground"
                            )}
                          >
                            +{p.points}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
          <Link
            href="/app/matches"
            className="mt-3 flex items-center justify-center gap-1 text-sm font-medium text-pulpo-300"
          >
            Ver todos los partidos <ChevronRight className="h-4 w-4" />
          </Link>
        </section>
      )}
    </div>
  );
}

function MatchLine({ match, showScore = false }: { match: MatchWithTeams; showScore?: boolean }) {
  const badge = statusBadge(match.status, match.minute);
  const hasScore = showScore && match.home_score != null && match.away_score != null;
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <TeamFlag team={match.home_team} size={24} />
        <span className="truncate text-sm font-medium">
          {match.home_team?.code ?? match.home_team?.short_name ?? "?"}
        </span>
        <span className="text-sm font-bold tabular-nums">
          {hasScore ? `${match.home_score}-${match.away_score}` : "vs"}
        </span>
        <span className="truncate text-sm font-medium">
          {match.away_team?.code ?? match.away_team?.short_name ?? "?"}
        </span>
        <TeamFlag team={match.away_team} size={24} />
      </div>
      <span className="shrink-0 text-[11px] text-muted-foreground">
        {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : kickoffLabel(match.kickoff_at)}
      </span>
    </div>
  );
}
