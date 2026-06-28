import Link from "next/link";
import { Trophy, ChevronRight } from "lucide-react";
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
        <p className="mt-12 text-center text-sm text-muted">Aun no hay competicion activa.</p>
      </div>
    );
  }

  const { groups, rounds, hasGroups, hasKnockout } = await getTournament(competition.id);

  return (
    <div className="px-5">
      <PageHeader title="El Mundial" subtitle={competition.name} />

      <Link
        href="/app/matches"
        className="mb-3 mt-1 flex items-center gap-3 rounded-lg border border-pulpo-500/40 bg-pulpo-500/10 p-3.5"
      >
        <Trophy className="h-5 w-5 text-pulpo-300" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Haz tus porras de eliminatorias</p>
          <p className="text-xs text-muted">1X2, marcador exacto y equipo que pasa de ronda</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>

      <TournamentTabs
        hasGroups={hasGroups}
        hasKnockout={hasKnockout}
        groups={
          <div className="grid grid-cols-1 gap-3">
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
