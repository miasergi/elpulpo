import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { getActiveCompetition, getActiveGroup } from "@/lib/queries";
import { getBonusMarkets, getCompetitionTeams } from "@/lib/bonus";
import { BackHeader } from "@/components/app/back-header";
import { BonusForm } from "@/components/bonus/bonus-form";
import { GroupIcon } from "@/components/groups/group-icon";

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
  const [{ markets, answers }, teams] = await Promise.all([
    getBonusMarkets(competition.id, profile.id, group?.id ?? null),
    getCompetitionTeams(competition.id),
  ]);

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
      <p className="mb-2 text-sm text-muted">
        Acierta estas preguntas para sumar puntos extra. Se cierran al empezar el torneo.
      </p>
      <Link
        href="/app/profile"
        className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2 text-xs text-muted"
      >
        <GroupIcon name={group.icon} size={16} color={group.color} />
        Respondiendo para <span className="font-semibold text-foreground">{group.name}</span>
      </Link>
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
