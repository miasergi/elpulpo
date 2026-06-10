import { requireProfile } from "@/lib/auth";
import { getActiveCompetition } from "@/lib/queries";
import { getTournament } from "@/lib/tournament";
import { PageHeader } from "@/components/app/page-header";
import { GroupTable } from "@/components/tournament/group-table";
import { Bracket } from "@/components/tournament/bracket";
import { TournamentTabs } from "@/components/tournament/tournament-tabs";

export const dynamic = "force-dynamic";

export default async function TournamentPage() {
  await requireProfile();
  const competition = await getActiveCompetition();

  if (!competition) {
    return (
      <div className="px-5">
        <PageHeader title="El Mundial" />
        <p className="mt-12 text-center text-sm text-muted">Aún no hay competición activa. 🐙</p>
      </div>
    );
  }

  const { groups, rounds, hasGroups, hasKnockout } = await getTournament(competition.id);

  return (
    <div className="px-5">
      <PageHeader title="El Mundial" subtitle={competition.name} />
      <TournamentTabs
        hasGroups={hasGroups}
        hasKnockout={hasKnockout}
        groups={
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {groups.map((g) => (
              <GroupTable key={g.key} label={g.label} standings={g.standings} />
            ))}
          </div>
        }
        knockout={<Bracket rounds={rounds} />}
      />
    </div>
  );
}
