import Link from "next/link";
import { Trophy, ChevronRight, CalendarX2 } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getActiveCompetition, getMatches, getUserPredictions } from "@/lib/queries";
import { PredictionCard } from "@/components/match/prediction-card";
import { PageHeader } from "@/components/app/page-header";
import { dayHeading, dayKey } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const { profile } = await requireProfile();
  const competition = await getActiveCompetition();

  if (!competition) {
    return (
      <div className="px-5">
        <PageHeader title="Partidos" />
        <EmptyState />
      </div>
    );
  }

  const matches = await getMatches(competition.id);
  const predictions = await getUserPredictions(
    profile.id,
    matches.map((m) => m.id)
  );

  // Group by day
  const days = new Map<string, typeof matches>();
  for (const m of matches) {
    const key = dayKey(m.kickoff_at);
    if (!days.has(key)) days.set(key, []);
    days.get(key)!.push(m);
  }

  const pending = matches.filter(
    (m) => m.status === "scheduled" && !predictions.has(m.id)
  ).length;

  return (
    <div className="px-5">
      <PageHeader
        title="Partidos"
        subtitle={`${competition.name} · ${pending} sin predecir`}
      />

      <Link
        href="/app/bonus"
        className="mt-2 flex items-center gap-3 rounded-lg border border-pulpo-500/40 bg-pulpo-500/10 p-3.5"
      >
        <Trophy className="h-5 w-5 text-pulpo-300" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Bonus del torneo</p>
          <p className="text-xs text-muted">Campeón, máximo goleador y más puntos extra</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>

      {matches.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6 pt-2">
          {[...days.entries()].map(([key, dayMatches]) => (
            <section key={key}>
              <h2 className="mb-2 text-sm font-semibold capitalize text-muted">
                {dayHeading(dayMatches[0].kickoff_at)}
              </h2>
              <div className="space-y-3">
                {dayMatches.map((m) => {
                  const p = predictions.get(m.id);
                  return (
                    <PredictionCard
                      key={m.id}
                      match={m}
                      initialHome={p?.home ?? null}
                      initialAway={p?.away ?? null}
                      userId={profile.id}
                      linkToDetail
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-16 flex flex-col items-center text-center text-muted">
      <CalendarX2 className="h-12 w-12 text-muted-foreground" />
      <p className="mt-4 text-sm">
        Aún no hay partidos cargados.
        <br />
        Cuando arranque el Mundial 2026 aparecerán aquí.
      </p>
    </div>
  );
}
