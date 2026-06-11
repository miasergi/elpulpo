import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamFlag } from "@/components/match/team-flag";
import { Badge } from "@/components/ui/badge";
import { kickoffLabel, statusBadge, isLocked } from "@/lib/format";
import type { KnockoutRound } from "@/lib/tournament";
import type { MatchRow } from "@/lib/queries";

export function Bracket({ rounds }: { rounds: KnockoutRound[] }) {
  return (
    <div className="space-y-6">
      {rounds.map((round) => (
        <section key={round.key}>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
            <span className="h-4 w-1 rounded-full bg-pulpo-400" />
            {round.label}
            <span className="text-xs font-normal text-muted-foreground">
              ({round.matches.length})
            </span>
          </h3>
          <div className="space-y-2">
            {round.matches.map((m) => (
              <KoMatch key={m.id} match={m} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function KoMatch({ match }: { match: MatchRow }) {
  const finished = match.status === "finished" && match.home_score != null && match.away_score != null;
  const badge = statusBadge(match.status, match.minute);
  const homeWon = finished && match.home_score! > match.away_score!;
  const awayWon = finished && match.away_score! > match.home_score!;
  // Predictable once the teams are set and it hasn't kicked off.
  const predictable =
    !isLocked(match.status, match.kickoff_at) && !!match.home_team && !!match.away_team;

  const inner = (
    <>
      <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="truncate">{match.stage}</span>
        {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : <span>{kickoffLabel(match.kickoff_at)}</span>}
      </div>
      <KoSide team={match.home_team} score={match.home_score} winner={homeWon} dim={awayWon} />
      <div className="my-1 h-px bg-border/50" />
      <KoSide team={match.away_team} score={match.away_score} winner={awayWon} dim={homeWon} />
      {predictable && (
        <div className="mt-2 flex items-center justify-center gap-1 border-t border-border/60 pt-2 text-[11px] font-medium text-pulpo-300">
          Predecir este cruce <ChevronRight className="h-3 w-3" />
        </div>
      )}
    </>
  );

  if (predictable) {
    return (
      <Link href={`/app/matches/${match.id}`} className="block rounded-lg border border-pulpo-500/40 bg-surface/60 p-3">
        {inner}
      </Link>
    );
  }
  return <div className="rounded-lg border border-border bg-surface/60 p-3">{inner}</div>;
}

function KoSide({
  team,
  score,
  winner,
  dim,
}: {
  team: MatchRow["home_team"];
  score: number | null;
  winner: boolean;
  dim: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", dim && "opacity-50")}>
      <TeamFlag team={team} size={24} />
      <span className={cn("flex-1 truncate text-sm", winner ? "font-bold" : "font-medium")}>
        {team?.short_name ?? team?.name ?? "Por definir"}
      </span>
      {winner && <span className="text-xs text-pitch-400">▶</span>}
      <span className={cn("w-6 text-center text-base tabular-nums", winner ? "font-bold" : "font-medium")}>
        {score ?? "–"}
      </span>
    </div>
  );
}
