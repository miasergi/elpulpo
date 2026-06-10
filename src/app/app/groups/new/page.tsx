import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getActiveCompetition } from "@/lib/queries";
import { CreateGroupForm } from "@/components/groups/create-group-form";
import { BackHeader } from "@/components/app/back-header";

export const dynamic = "force-dynamic";

export default async function NewGroupPage() {
  await requireProfile();
  const competition = await getActiveCompetition();
  if (!competition) {
    return (
      <div className="px-5">
        <BackHeader title="Crear grupo" />
        <p className="mt-10 text-center text-sm text-muted">
          No hay ninguna competición activa todavía. Vuelve cuando esté cargado el Mundial 2026.
        </p>
      </div>
    );
  }

  return (
    <div className="px-5">
      <BackHeader title="Crear grupo" />
      <CreateGroupForm competitionId={competition.id} competitionName={competition.name} />
    </div>
  );
}
