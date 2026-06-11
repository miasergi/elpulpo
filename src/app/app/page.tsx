import Link from "next/link";
import { ChevronRight, Plus, Trophy, CalendarClock, Check, Repeat } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import {
  getMyGroups,
  getActiveCompetition,
  getActiveGroup,
  getMatches,
  getMyPredictions,
  getMyBonusCount,
} from "@/lib/queries";
import { getMyStandings } from "@/lib/groups";
import { PulpoMark } from "@/components/brand/logo";
import { GettingStarted } from "@/components/app/getting-started";
import { WorldCupHero } from "@/components/app/world-cup-hero";
import { GroupBadge } from "@/components/groups/group-badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TeamFlag } from "@/components/match/team-flag";
import { AdBanner } from "@/components/ads/ad-banner";
import { kickoffLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { profile } = await requireProfile();
  const [groups, competition, activeGroup, predicted, bonusCount] = await Promise.all([
    getMyGroups(profile.id),
    getActiveCompetition(),
    getActiveGroup(profile.active_group_id),
    getMyPredictions(profile.id, profile.active_group_id),
    getMyBonusCount(profile.id, profile.active_group_id),
  ]);

  const [standings, allMatches] = await Promise.all([
    getMyStandings(groups.map((g) => g.id!), profile.id),
    competition ? getMatches(competition.id) : Promise.resolve([]),
  ]);

  const nextMatches = allMatches.filter((m) => m.status === "scheduled").slice(0, 3);
  const me = activeGroup ? standings.get(activeGroup.id) : null;

  return (
    <div className="px-5 pt-4">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">Hola,</p>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            {profile.display_name}
            {profile.is_pro && <Badge variant="accent">PRO</Badge>}
          </h1>
        </div>
        <Link href="/app/profile">
          <Avatar src={profile.avatar_url} name={profile.display_name} size={44} />
        </Link>
      </div>

      {competition && <WorldCupHero competitionName={competition.name} matches={allMatches} />}

      <GettingStarted
        hasGroup={groups.length > 0}
        hasPrediction={predicted.size > 0}
        hasBonus={bonusCount > 0}
      />

      {/* Active group */}
      <section className="mt-7">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <Trophy className="h-4 w-4 text-pulpo-300" /> Mi grupo
          </h2>
          {groups.length > 1 && (
            <Link href="/app/profile" className="flex items-center gap-1 text-sm text-pulpo-300">
              <Repeat className="h-3.5 w-3.5" /> Cambiar
            </Link>
          )}
        </div>

        {!activeGroup ? (
          <div className="rounded-lg border border-dashed border-border bg-surface/40 p-6 text-center">
            <PulpoMark size={56} className="mx-auto" />
            <p className="mt-3 text-sm text-muted">
              Cada grupo tiene sus propias predicciones, como una liga fantasy.
              <br />
              ¡Crea una porra o únete con un código!
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
          <>
            <Link
              href="/app/groups"
              className="flex items-center gap-3 rounded-lg border border-pulpo-500/40 bg-surface/60 p-3.5"
            >
              <GroupBadge
                icon={activeGroup.icon}
                color={activeGroup.color}
                logoUrl={activeGroup.logo_url}
                size={48}
                rounded="rounded-lg"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{activeGroup.name}</p>
                <p className="text-xs text-muted">
                  {me ? `Vas ${me.rank}º de ${me.total} · ${me.total_points} pts` : "Aún sin puntos"}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
            {groups.length > 1 && (
              <p className="mt-1.5 text-center text-xs text-muted-foreground">
                Tienes {groups.length} grupos · cambia de grupo desde tu perfil
              </p>
            )}
          </>
        )}
      </section>

      {/* Next matches */}
      <section className="mt-8">
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

      {!profile.is_pro && <AdBanner className="mt-8" />}
    </div>
  );
}
