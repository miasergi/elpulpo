import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { Trophy, Radio, CalendarDays } from "lucide-react";
import { TeamFlag, type TeamLite } from "@/components/match/team-flag";
import type { MatchRow } from "@/lib/queries";
import { dayKey } from "@/lib/format";

const HOST_CODES = ["USA", "MEX", "CAN"];

/** Tournament-ambience hero: countdown before kickoff, live progress during. */
export function WorldCupHero({
  competitionName,
  matches,
}: {
  competitionName: string;
  matches: MatchRow[];
}) {
  if (matches.length === 0) return null;

  const now = new Date();
  const first = new Date(matches[0].kickoff_at);
  const daysLeft = differenceInCalendarDays(first, now);
  const started = first <= now;

  const finished = matches.filter((m) => m.status === "finished").length;
  const live = matches.filter((m) => m.status === "live").length;
  const today = matches.filter((m) => dayKey(m.kickoff_at) === dayKey(now.toISOString())).length;

  const teamIds = new Set<string>();
  const hostFlags: TeamLite[] = [];
  const seenHosts = new Set<string>();
  for (const m of matches) {
    for (const t of [m.home_team, m.away_team]) {
      if (!t) continue;
      teamIds.add(t.id);
      if (t.code && HOST_CODES.includes(t.code) && !seenHosts.has(t.code)) {
        seenHosts.add(t.code);
        hostFlags.push(t);
      }
    }
  }

  return (
    <Link
      href="/app/matches"
      className="relative mt-6 block overflow-hidden rounded-xl border border-pulpo-500/30 bg-gradient-to-br from-pulpo-500/20 via-surface/80 to-primary/15 p-4"
    >
      <div className="bg-wc26-bar absolute inset-x-0 top-0 h-1" />
      <Trophy className="absolute -right-4 -top-4 h-24 w-24 rotate-12 text-pulpo-500/15" />

      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-pulpo-300">
        <Trophy className="h-3.5 w-3.5" /> {competitionName}
      </div>

      {!started ? (
        <>
          <p className="mt-2 text-3xl font-extrabold">
            {daysLeft <= 0 ? "¡Empieza hoy!" : daysLeft === 1 ? "¡Empieza mañana!" : (
              <>
                Faltan <span className="text-pulpo-200">{daysLeft} días</span>
              </>
            )}
          </p>
          <p className="mt-1 text-sm text-muted">
            {teamIds.size} selecciones · {matches.length} partidos
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 flex items-center gap-2 text-2xl font-extrabold">
            {live > 0 ? (
              <>
                <Radio className="h-5 w-5 animate-pulse text-danger" />
                {live === 1 ? "1 partido en juego" : `${live} partidos en juego`}
              </>
            ) : today > 0 ? (
              <>
                <CalendarDays className="h-5 w-5 text-pulpo-300" />
                {today === 1 ? "1 partido hoy" : `${today} partidos hoy`}
              </>
            ) : (
              "El Mundial está en marcha"
            )}
          </p>
          <div className="mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pulpo-400 to-primary"
                style={{ width: `${Math.round((finished / matches.length) * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted">
              {finished} de {matches.length} partidos jugados
            </p>
          </div>
        </>
      )}

      {hostFlags.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5">
          {hostFlags.map((t) => (
            <TeamFlag key={t.id} team={t} size={20} />
          ))}
          <span className="ml-1 text-xs text-muted-foreground">EE. UU. · México · Canadá</span>
        </div>
      )}
    </Link>
  );
}
