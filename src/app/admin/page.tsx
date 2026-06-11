import { requireAdmin } from "@/lib/admin";
import { getActiveCompetition, getMatches } from "@/lib/queries";
import { getCompetitionTeams } from "@/lib/bonus";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { MarketAnswer } from "@/components/admin/admin-bonus-list";
import { BackHeader } from "@/components/app/back-header";
import { SyncButton } from "@/components/admin/sync-button";
import { AdminMatchList } from "@/components/admin/admin-match-list";
import { AdminBonusList } from "@/components/admin/admin-bonus-list";
import { AdminUserList } from "@/components/admin/admin-user-list";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const competition = await getActiveCompetition();
  const matches = competition ? await getMatches(competition.id) : [];

  let bonusMarkets: Awaited<ReturnType<typeof fetchBonus>> = [];
  let teams: Awaited<ReturnType<typeof getCompetitionTeams>> = [];
  let bonusAnswers: Record<string, MarketAnswer[]> = {};
  if (competition) {
    [bonusMarkets, teams] = await Promise.all([
      fetchBonus(competition.id),
      getCompetitionTeams(competition.id),
    ]);
    bonusAnswers = await fetchAnswers(bonusMarkets.filter((m) => m.kind === "text").map((m) => m.id));
  }

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

        {bonusMarkets.length > 0 && (
          <section>
            <h2 className="mb-2 font-semibold">Resolver bonus</h2>
            <AdminBonusList markets={bonusMarkets} teams={teams} answers={bonusAnswers} />
          </section>
        )}

        <section>
          <h2 className="mb-1 font-semibold">Usuarios Pro</h2>
          <p className="mb-2 text-xs text-muted">
            Los usuarios Pro no ven anuncios. Actívalo a dedo a quien quieras.
          </p>
          <AdminUserList users={await fetchUsers()} />
        </section>
      </div>
    </div>
  );
}

/** Distinct user answers per text market (service role: sees all groups). */
async function fetchAnswers(marketIds: string[]): Promise<Record<string, MarketAnswer[]>> {
  if (marketIds.length === 0) return {};
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("bonus_predictions")
    .select("market_id, answer_text")
    .in("market_id", marketIds)
    .not("answer_text", "is", null);

  const byMarket: Record<string, Map<string, MarketAnswer>> = {};
  for (const row of data ?? []) {
    const answer = (row.answer_text ?? "").trim();
    if (!answer) continue;
    const key = answer.toLowerCase();
    byMarket[row.market_id] ??= new Map();
    const existing = byMarket[row.market_id].get(key);
    if (existing) existing.count += 1;
    else byMarket[row.market_id].set(key, { answer, count: 1 });
  }
  return Object.fromEntries(
    Object.entries(byMarket).map(([id, m]) => [id, [...m.values()].sort((a, b) => b.count - a.count)])
  );
}

async function fetchUsers() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id,display_name,username,avatar_url,is_pro")
    .order("created_at", { ascending: true });
  return data ?? [];
}

async function fetchBonus(competitionId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bonus_markets")
    .select("id,label,kind,points,resolved,correct_team_id,correct_text")
    .eq("competition_id", competitionId)
    .order("created_at", { ascending: true });
  return data ?? [];
}
