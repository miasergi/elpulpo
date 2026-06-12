import Link from "next/link";
import { Sparkles } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { kickoffLabel } from "@/lib/format";
import { getActiveCompetition, getActiveGroup, getMatches, getMyMembership } from "@/lib/queries";
import { getBonusMarkets, getCompetitionTeams } from "@/lib/bonus";
import { BackHeader } from "@/components/app/back-header";
import { BonusForm } from "@/components/bonus/bonus-form";
import { UnderdogPicker } from "@/components/bonus/underdog-picker";
import { GroupBadge } from "@/components/groups/group-badge";

export const dynamic = "force-dynamic";

export default async function BonusPage() {
  const { profile } = await requireProfile();
  const competition = await getActiveCompetition();

  if (!competition) {
    return (
      <div className="px-5">
        <BackHeader title="Bonus" />
        <p className="mt-10 text-center text-sm text-muted">Aún no hay apuestas bonus disponibles.</p>
      </div>
    );
  }

  const group = await getActiveGroup(profile.active_group_id);
  const [{ markets, answers }, teams, membership, matches] = await Promise.all([
    getBonusMarkets(competition.id, profile.id, group?.id ?? null),
    getCompetitionTeams(competition.id),
    getMyMembership(profile.id, group?.id ?? null),
    getMatches(competition.id),
  ]);
  const firstKickoff = matches[0]?.kickoff_at;
  const tournamentStarted = !!firstKickoff && new Date(firstKickoff) <= new Date();
  // Latest deadline among still-open markets, to tell people how long they have.
  const openDeadline = markets
    .filter((m) => !m.resolved && m.closes_at && new Date(m.closes_at) > new Date())
    .map((m) => m.closes_at!)
    .sort()
    .at(-1);

  if (!group) {
    return (
      <div className="px-5">
        <BackHeader title="Bonus del torneo" />
        <p className="mt-10 text-center text-sm text-muted">
          Los bonus se responden por grupo, como las predicciones.
          <br />
          <Link href="/app/groups" className="font-medium text-pulpo-300">
            Únete a un grupo para jugar →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="px-5">
      <BackHeader title="Bonus del torneo" />
      {openDeadline ? (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-muted">
            <span className="font-semibold text-warning">¡Plazo ampliado!</span> Tienes hasta{" "}
            <span className="font-semibold text-foreground">{kickoffLabel(openDeadline).toLowerCase()}</span> para
            configurar tus apuestas. Acierta y suma puntos extra.
          </p>
        </div>
      ) : (
        <p className="mb-2 text-sm text-muted">
          Acierta estas preguntas para sumar puntos extra. Se cierran al empezar el torneo.
        </p>
      )}
      <Link
        href="/app/profile"
        className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2 text-xs text-muted"
      >
        <GroupBadge icon={group.icon} color={group.color} logoUrl={group.logo_url} size={20} rounded="rounded-md" />
        Respondiendo para <span className="font-semibold text-foreground">{group.name}</span>
      </Link>

      <div className="mb-4">
        <UnderdogPicker
          teams={teams.filter((t) => t.is_underdog)}
          groupId={group.id}
          initialPick={membership?.underdog_team_id ?? null}
          closed={tournamentStarted}
        />
      </div>

      {markets.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted">Todavía no hay preguntas bonus.</p>
      ) : (
        <BonusForm
          markets={markets.map((m) => ({
            id: m.id,
            key: m.key,
            label: m.label,
            kind: m.kind,
            points: m.points,
            closes_at: m.closes_at,
            resolved: m.resolved,
            correct_team_id: m.correct_team_id,
            correct_text: m.correct_text,
            current: answers.get(m.id)
              ? { team_id: answers.get(m.id)!.team_id, answer_text: answers.get(m.id)!.answer_text }
              : null,
          }))}
          teams={teams}
          userId={profile.id}
          groupId={group.id}
        />
      )}
    </div>
  );
}
