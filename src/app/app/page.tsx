import Link from "next/link";
import { ChevronRight, Plus, Trophy, CalendarClock, Check } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getMyGroups, getActiveCompetition, getMatches, getUserPredictions } from "@/lib/queries";
import { getMyStanding } from "@/lib/groups";
import { PulpoMark } from "@/components/brand/logo";
import { HowToPlay } from "@/components/app/how-to-play";
import { GroupIcon } from "@/components/groups/group-icon";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { TeamFlag } from "@/components/match/team-flag";
import { kickoffLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { profile } = await requireProfile();
  const [groups, competition] = await Promise.all([
    getMyGroups(profile.id),
    getActiveCompetition(),
  ]);

  const standings = await Promise.all(
    groups.map(async (g) => ({ group: g, me: await getMyStanding(g.id!, profile.id) }))
  );

  // Next matches still open for predicting
  let nextMatches: Awaited<ReturnType<typeof getMatches>> = [];
  let predicted = new Map<string, { home: number; away: number }>();
  if (competition) {
    const all = await getMatches(competition.id);
    nextMatches = all.filter((m) => m.status === "scheduled").slice(0, 3);
    predicted = await getUserPredictions(profile.id, nextMatches.map((m) => m.id));
  }

  return (
    <div className="px-5 pt-4">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">Hola,</p>
          <h1 className="text-2xl font-bold">{profile.display_name}</h1>
        </div>
        <Link href="/app/profile">
          <Avatar src={profile.avatar_url} name={profile.display_name} size={44} />
        </Link>
      </div>

      <HowToPlay />

      {/* Next matches */}
      <section className="mt-7">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <CalendarClock className="h-4 w-4 text-pulpo-300" /> Próximos partidos
          </h2>
          <Link href="/app/matches" className="text-sm text-pulpo-300">Ver todos</Link>
        </div>

        {nextMatches.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface/50 p-5 text-center text-sm text-muted">
            No hay partidos próximos por ahora.
          </div>
        ) : (
          <Link href="/app/matches" className="block space-y-2">
            {nextMatches.map((m) => {
              const has = predicted.has(m.id);
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface/50 p-3"
                >
                  <div className="flex items-center gap-2">
                    <TeamFlag team={m.home_team} size={26} />
                    <span className="text-sm font-medium">{m.home_team?.code ?? m.home_team?.short_name ?? "?"}</span>
                    <span className="text-xs text-muted-foreground">vs</span>
                    <span className="text-sm font-medium">{m.away_team?.code ?? m.away_team?.short_name ?? "?"}</span>
                    <TeamFlag team={m.away_team} size={26} />
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-muted-foreground">{kickoffLabel(m.kickoff_at)}</div>
                    <div className={cn("flex items-center justify-end gap-1 text-[11px]", has ? "text-pitch-400" : "text-warning")}>
                      {has ? (<><Check className="h-3 w-3" /> Predicho</>) : "Sin predecir"}
                    </div>
                  </div>
                </div>
              );
            })}
          </Link>
        )}
      </section>

      {/* My groups */}
      <section className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <Trophy className="h-4 w-4 text-pulpo-300" /> Mis grupos
          </h2>
          <Link href="/app/groups" className="text-sm text-pulpo-300">Ver todos</Link>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface/40 p-6 text-center">
            <PulpoMark size={56} className="mx-auto" />
            <p className="mt-3 text-sm text-muted">
              Aún no tienes ningún grupo. ¡Crea una porra o únete con un código!
            </p>
            <div className="mt-4 flex gap-2">
              <Link href="/app/groups/new" className="flex-1">
                <Button size="full" variant="primary"><Plus className="h-4 w-4" /> Crear</Button>
              </Link>
              <Link href="/app/groups/join" className="flex-1">
                <Button size="full" variant="secondary">Unirme</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {standings.map(({ group, me }) => (
              <Link
                key={group.id}
                href={`/app/groups/${group.id}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface/60 p-3"
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${group.color}22` }}
                >
                  <GroupIcon name={group.icon} size={22} color={group.color} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{group.name}</p>
                  <p className="text-xs text-muted">
                    {me ? `${me.rank}º de ${me.total} · ${me.total_points} pts` : "Aún sin puntos"}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
