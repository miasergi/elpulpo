import { requireProfile } from "@/lib/auth";
import { BackHeader } from "@/components/app/back-header";
import { CareerGame } from "@/components/games/career/career-game";
import { GroupCareerBoard } from "@/components/games/career/group-career-board";
import { getActiveCareer, getGroupCareerBoard } from "@/lib/games/career/store";

export const dynamic = "force-dynamic";

export default async function CareerPage() {
  const { profile } = await requireProfile();

  // La carrera a medias se retoma tal cual; el ranking solo si hay grupo activo.
  const [saved, board] = await Promise.all([
    getActiveCareer(profile.id),
    profile.active_group_id ? getGroupCareerBoard(profile.active_group_id, profile.id) : Promise.resolve([]),
  ]);

  return (
    <div className="px-5">
      <BackHeader title="Simulador de carrera" />

      <CareerGame saved={saved} />

      {board.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Las mejores carreras de tu grupo
          </h2>
          <GroupCareerBoard entries={board} />
        </section>
      )}
    </div>
  );
}
