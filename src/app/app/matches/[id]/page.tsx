import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getMatchById, getMatchPredictions, getMyPredictions } from "@/lib/queries";
import { BackHeader } from "@/components/app/back-header";
import { PredictionCard } from "@/components/match/prediction-card";
import { PredictionsList } from "@/components/match/predictions-list";
import { PredictionDistribution } from "@/components/match/prediction-distribution";
import { TeamFlag } from "@/components/match/team-flag";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { kickoffLabel, isLocked, statusBadge } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireProfile();

  const match = await getMatchById(id);
  if (!match) notFound();

  const locked = isLocked(match.status, match.kickoff_at);
  const badge = statusBadge(match.status, match.minute);
  const [mine, predictions] = await Promise.all([
    getMyPredictions(profile.id),
    locked ? getMatchPredictions(id, profile.id) : Promise.resolve([]),
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
          <div className="flex flex-1 flex-col items-center gap-2">
            <TeamFlag team={match.home_team} size={52} />
            <span className="text-center text-sm font-semibold">{match.home_team?.short_name ?? match.home_team?.name ?? "?"}</span>
          </div>
          <div className="px-3 text-3xl font-extrabold tabular-nums">
            {match.home_score != null && match.away_score != null
              ? `${match.home_score} - ${match.away_score}`
              : "vs"}
          </div>
          <div className="flex flex-1 flex-col items-center gap-2">
            <TeamFlag team={match.away_team} size={52} />
            <span className="text-center text-sm font-semibold">{match.away_team?.short_name ?? match.away_team?.name ?? "?"}</span>
          </div>
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
              userId={profile.id}
            />
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <Lock className="h-3 w-3" /> Las predicciones de los demás se revelan al empezar el partido.
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
              currentUserId={profile.id}
            />
          </>
        )}
      </div>
    </div>
  );
}
