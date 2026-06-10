import { requireProfile } from "@/lib/auth";
import { getActiveCompetition } from "@/lib/queries";
import { getBonusMarkets, getCompetitionTeams } from "@/lib/bonus";
import { BackHeader } from "@/components/app/back-header";
import { BonusForm } from "@/components/bonus/bonus-form";

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

  const [{ markets, answers }, teams] = await Promise.all([
    getBonusMarkets(competition.id, profile.id),
    getCompetitionTeams(competition.id),
  ]);

  return (
    <div className="px-5">
      <BackHeader title="Bonus del torneo" />
      <p className="mb-4 text-sm text-muted">
        Acierta estas preguntas para sumar puntos extra. Se cierran al empezar el torneo.
      </p>
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
        />
      )}
    </div>
  );
}
