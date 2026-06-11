import Link from "next/link";
import { Trophy, ChevronRight, CalendarX2, Repeat } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getActiveCompetition, getActiveGroup, getMatches, getMyPredictions, getMyMembership } from "@/lib/queries";
import { MatchesBrowser } from "@/components/match/matches-browser";
import { PageHeader } from "@/components/app/page-header";
import { GroupBadge } from "@/components/groups/group-badge";
import { AdBanner } from "@/components/ads/ad-banner";

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

  const group = await getActiveGroup(profile.active_group_id);
  const [matches, predictions, membership] = await Promise.all([
    getMatches(competition.id),
    getMyPredictions(profile.id, group?.id ?? null),
    getMyMembership(profile.id, group?.id ?? null),
  ]);

  return (
    <div className="px-5">
      {/* Non-sticky header so the filter chips can stick to the top. */}
      <header className="pb-1 pt-4">
        <h1 className="text-2xl font-extrabold tracking-tight">
          <span className="text-brand-gradient">Partidos</span>
        </h1>
        <p className="text-sm text-muted">{competition.name}</p>
      </header>

      {/* Active-group context: each group has its own predictions. */}
      {group ? (
        <Link
          href="/app/profile"
          className="mb-2 mt-1 flex items-center gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2"
        >
          <GroupBadge icon={group.icon} color={group.color} logoUrl={group.logo_url} size={20} rounded="rounded-md" />
          <span className="flex-1 truncate text-xs text-muted">
            Prediciendo para <span className="font-semibold text-foreground">{group.name}</span>
          </span>
          <span className="flex items-center gap-1 text-xs text-pulpo-300">
            <Repeat className="h-3 w-3" /> Cambiar
          </span>
        </Link>
      ) : (
        <Link
          href="/app/groups"
          className="mb-2 mt-1 flex items-center gap-2 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2.5 text-xs"
        >
          <span className="flex-1 text-muted">
            Cada grupo tiene sus propias predicciones.{" "}
            <span className="font-semibold text-warning">Únete a un grupo para empezar →</span>
          </span>
        </Link>
      )}

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

      {!profile.is_pro && <AdBanner className="mt-3" />}

      {matches.length === 0 ? (
        <EmptyState />
      ) : (
        <MatchesBrowser
          matches={matches}
          predictions={Object.fromEntries(predictions)}
          userId={profile.id}
          groupId={group?.id ?? null}
          scoring={
            group
              ? { exact: group.pts_exact, diff: group.pts_goal_diff, result: group.pts_result }
              : null
          }
          underdogTeamId={membership?.underdog_team_id ?? null}
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
