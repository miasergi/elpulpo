"use client";

import { useMemo, useState } from "react";
import { CalendarCheck2, CalendarDays, CircleAlert, History, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { PredictionCard, type MatchWithTeams } from "./prediction-card";
import { dayHeading, dayKey } from "@/lib/format";
import type { ScoringRules } from "@/lib/scoring";

type Filter = "proximos" | "hoy" | "sin-predecir" | "resultados" | "todos";

export interface PredictionLite {
  home: number;
  away: number;
}

export function MatchesBrowser({
  matches,
  predictions,
  userId,
  groupId,
  scoring,
  underdogTeamId,
  now,
}: {
  matches: MatchWithTeams[];
  predictions: Record<string, PredictionLite>;
  userId: string;
  groupId: string | null;
  scoring: ScoringRules | null;
  underdogTeamId: string | null;
  /** Server timestamp, reused on the client so SSR and hydration agree. */
  now: string;
}) {
  const [filter, setFilter] = useState<Filter>("proximos");

  const { lists, counts } = useMemo(() => {
    const nowDate = new Date(now);
    const lockedNow = (m: MatchWithTeams) =>
      m.status !== "scheduled" || new Date(m.kickoff_at) <= nowDate;
    const today = dayKey(now);
    const open = matches.filter((m) => !lockedNow(m));
    const played = matches
      .filter(lockedNow)
      .sort((a, b) => new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime());
    const lists: Record<Filter, MatchWithTeams[]> = {
      proximos: open,
      hoy: matches.filter((m) => dayKey(m.kickoff_at) === today),
      "sin-predecir": open.filter((m) => !predictions[m.id]),
      resultados: played,
      todos: matches,
    };
    return {
      lists,
      counts: {
        hoy: lists.hoy.length,
        "sin-predecir": lists["sin-predecir"].length,
      },
    };
  }, [matches, predictions, now]);

  const tabs: { key: Filter; label: string; icon: typeof CalendarDays; count?: number }[] = [
    { key: "proximos", label: "Próximos", icon: CalendarDays },
    { key: "hoy", label: "Hoy", icon: CalendarCheck2, count: counts.hoy },
    { key: "sin-predecir", label: "Sin predecir", icon: CircleAlert, count: counts["sin-predecir"] },
    { key: "resultados", label: "Resultados", icon: History },
    { key: "todos", label: "Todos", icon: ListChecks },
  ];

  const visible = lists[filter];

  // Group by day, preserving the order of the active list.
  const days: { key: string; matches: MatchWithTeams[] }[] = [];
  for (const m of visible) {
    const key = dayKey(m.kickoff_at);
    const last = days[days.length - 1];
    if (last && last.key === key) last.matches.push(m);
    else days.push({ key, matches: [m] });
  }

  return (
    <div>
      {/* Filter chips */}
      <div className="no-scrollbar sticky top-0 z-20 -mx-5 flex gap-2 overflow-x-auto bg-background/85 px-5 py-2.5 backdrop-blur-lg">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              filter === t.key
                ? "border-primary/60 bg-primary/15 text-pulpo-200"
                : "border-border bg-surface/60 text-muted"
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {t.count != null && t.count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[11px] tabular-nums",
                  filter === t.key ? "bg-primary/25" : "bg-surface-3"
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="mt-12 text-center text-sm text-muted">
          {filter === "sin-predecir"
            ? "¡Al día! Has predicho todos los partidos abiertos."
            : filter === "hoy"
              ? "Hoy no hay partidos."
              : filter === "resultados"
                ? "Aún no hay partidos jugados."
                : "No hay partidos aquí."}
        </div>
      ) : (
        <div className="space-y-6 pt-2">
          {days.map(({ key, matches: dayMatches }) => (
            <section key={key}>
              <h2 className="mb-2 text-sm font-semibold capitalize text-muted">
                {dayHeading(dayMatches[0].kickoff_at)}
              </h2>
              <div className="space-y-3">
                {dayMatches.map((m) => {
                  const p = predictions[m.id];
                  return (
                    <PredictionCard
                      key={m.id}
                      match={m}
                      initialHome={p?.home ?? null}
                      initialAway={p?.away ?? null}
                      userId={userId}
                      groupId={groupId}
                      scoring={scoring}
                      underdogTeamId={underdogTeamId}
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
