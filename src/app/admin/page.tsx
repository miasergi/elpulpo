import { requireAdmin } from "@/lib/admin";
import { getActiveCompetition, getMatches } from "@/lib/queries";
import { BackHeader } from "@/components/app/back-header";
import { SyncButton } from "@/components/admin/sync-button";
import { AdminMatchList } from "@/components/admin/admin-match-list";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const competition = await getActiveCompetition();
  const matches = competition ? await getMatches(competition.id) : [];

  return (
    <div className="mx-auto max-w-md px-5 pb-16 pt-safe">
      <BackHeader title="Admin" />
      <div className="space-y-6 pt-2">
        <section className="rounded-lg border border-border bg-surface/60 p-4">
          <h2 className="font-semibold">Sincronización</h2>
          <p className="mb-3 mt-1 text-xs text-muted">
            Trae fixtures y resultados del Mundial 2026 desde API-Football.
          </p>
          <SyncButton />
        </section>

        <section>
          <h2 className="mb-2 font-semibold">
            Resultados {competition ? `· ${matches.length} partidos` : ""}
          </h2>
          {matches.length === 0 ? (
            <p className="text-sm text-muted">
              No hay partidos. Pulsa “Sincronizar” o créalos en Supabase.
            </p>
          ) : (
            <AdminMatchList matches={matches} />
          )}
        </section>
      </div>
    </div>
  );
}
