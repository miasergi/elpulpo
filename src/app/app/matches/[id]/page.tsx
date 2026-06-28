import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getActiveGroup, getMatchById, getMatchPredictions, getMyPredictions, getMyMembership } from "@/lib/queries";
import { BackHeader } from "@/components/app/back-header";
import { PredictionCard } from "@/components/match/prediction-card";
import { PredictionsList } from "@/components/match/predictions-list";
import { PredictionDistribution } from "@/components/match/prediction-distribution";
import { TeamFlag } from "@/components/match/team-flag";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { kickoffLabel, isLocked, statusBadge } from "@/lib/format";
import { awardsAdvanceBonus } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireProfile();

  const match = await getMatchById(id);
  if (!match) notFound();

  const locked = isLocked(match.status, match.kickoff_at);
  const badge = statusBadge(match.status, match.minute);
  const group = await getActiveGroup(profile.active_group_id);
  const [mine, predictions, membership] = await Promise.all([
    getMyPredictions(profile.id, group?.id ?? null),
    locked && group ? getMatchPredictions(id, profile.id, group.id) : Promise.resolve([]),
    getMyMembership(profile.id, group?.id ?? null),
  ]);
  const myPred = mine.get(id);

  return (
    <div className="px-5">
      <BackHeader title={match.stage ?? "Partido"} />

      {/* Scoreboard */}
      <div className="rounded-lg border border-border bg-surface/60 p-5">
        <div className="mb-3 text-center text-xs text-muted-foreground">
          {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : kickoffLabel(match.kickoff_at)}
        </div>
        <div className="flex items-center justify-around">
          <ScoreboardTeam team={match.home_team} />
          <div className="px-3 text-3xl font-extrabold tabular-nums">
            {match.home_score != null && match.away_score != null
              ? `${match.home_score} - ${match.away_score}`
              : "vs"}
          </div>
          <ScoreboardTeam team={match.away_team} />
        </div>
      </div>

      {/* Your prediction (editable if open) */}
      <div className="mt-5">
        {!locked ? (
          <>
            <p className="mb-2 text-sm font-medium text-muted">Tu predicción</p>
            <PredictionCard
              match={match}
              initialHome={myPred?.home ?? null}
              initialAway={myPred?.away ?? null}
              initialWinnerTeamId={myPred?.winnerTeamId ?? null}
              userId={profile.id}
              groupId={group?.id ?? null}
              scoring={
                group
                  ? { exact: group.pts_exact, diff: group.pts_goal_diff, result: group.pts_result }
                  : null
              }
              underdogTeamId={membership?.underdog_team_id ?? null}
            />
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              {group
                ? `Predicción para ${group.name} · las de los demás se revelan al empezar.`
                : "Las predicciones de los demás se revelan al empezar el partido."}
            </p>
          </>
        ) : (
          <>
            <PredictionDistribution
              predictions={predictions}
              homeName={match.home_team?.short_name ?? match.home_team?.name ?? "Local"}
              awayName={match.away_team?.short_name ?? match.away_team?.name ?? "Visitante"}
            />
            <PredictionsList
              predictions={predictions}
              actualHome={match.home_score}
              actualAway={match.away_score}
              actualWinnerTeamId={match.winner_team_id}
              homeTeamId={match.home_team?.id ?? null}
              awayTeamId={match.away_team?.id ?? null}
              homeName={match.home_team?.short_name ?? match.home_team?.name ?? "Local"}
              awayName={match.away_team?.short_name ?? match.away_team?.name ?? "Visitante"}
              awardAdvance={awardsAdvanceBonus(match.stage)}
              currentUserId={profile.id}
            />
          </>
        )}
      </div>
    </div>
  );
}

function ScoreboardTeam({ team }: { team: { id: string; name: string; short_name?: string | null; flag_url?: string | null; code?: string | null } | null }) {
  const inner = (
    <>
      <TeamFlag team={team} size={52} />
      <span className="text-center text-sm font-semibold">{team?.short_name ?? team?.name ?? "?"}</span>
    </>
  );
  if (!team) return <div className="flex flex-1 flex-col items-center gap-2">{inner}</div>;
  return (
    <Link href={`/app/teams/${team.id}`} className="flex flex-1 flex-col items-center gap-2" title={`Ver plantilla de ${team.name}`}>
      {inner}
    </Link>
  );
}
