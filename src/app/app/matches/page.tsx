import Link from "next/link";
import { Trophy, ChevronRight, CalendarX2, Users } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getActiveCompetition, getMatches, getMyPredictions, getMyGroups } from "@/lib/queries";
import { MatchesBrowser } from "@/components/match/matches-browser";
import { PageHeader } from "@/components/app/page-header";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const { profile } = await requireProfile();
  const competition = await getActiveCompetition();

  if (!competition) {
    return (
      <div className="px-5">
        <PageHeader title="Partidos" />
        <EmptyState />
      </div>
    );
  }

  const [matches, predictions, groups] = await Promise.all([
    getMatches(competition.id),
    getMyPredictions(profile.id),
    getMyGroups(profile.id),
  ]);

  return (
    <div className="px-5">
      {/* Non-sticky header so the filter chips can stick to the top. */}
      <header className="pb-1 pt-4">
        <h1 className="text-2xl font-bold tracking-tight">Partidos</h1>
        <p className="text-sm text-muted">{competition.name}</p>
      </header>

      <Link
        href={groups.length > 0 ? "/app/groups" : "/app/groups/join"}
        className="mb-2 mt-1 flex items-center gap-2 text-xs text-muted"
      >
        <Users className="h-3.5 w-3.5 text-pulpo-300" />
        {groups.length > 0 ? (
          <>
            Tus predicciones cuentan en{" "}
            {groups.length === 1 ? "tu grupo" : `tus ${groups.length} grupos`} automáticamente
          </>
        ) : (
          <span className="text-warning">
            Únete a un grupo para competir con tus predicciones →
          </span>
        )}
      </Link>

      <Link
        href="/app/bonus"
        className="mb-1 mt-2 flex items-center gap-3 rounded-lg border border-pulpo-500/40 bg-pulpo-500/10 p-3.5"
      >
        <Trophy className="h-5 w-5 text-pulpo-300" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Bonus del torneo</p>
          <p className="text-xs text-muted">Campeón, goleador, ganadores de grupo… puntos extra</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>

      {matches.length === 0 ? (
        <EmptyState />
      ) : (
        <MatchesBrowser
          matches={matches}
          predictions={Object.fromEntries(predictions)}
          userId={profile.id}
          now={new Date().toISOString()}
        />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-16 flex flex-col items-center text-center text-muted">
      <CalendarX2 className="h-12 w-12 text-muted-foreground" />
      <p className="mt-4 text-sm">
        Aún no hay partidos cargados.
        <br />
        Cuando arranque el Mundial 2026 aparecerán aquí.
      </p>
    </div>
  );
}
