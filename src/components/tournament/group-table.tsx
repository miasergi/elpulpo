import Link from "next/link";
import { cn } from "@/lib/utils";
import { TeamFlag } from "@/components/match/team-flag";
import type { StandingTeam } from "@/lib/tournament";

export function GroupTable({ label, standings }: { label: string; standings: StandingTeam[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface/60">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-sm font-bold">{label}</h3>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-pitch-500" />Clasifica</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" />Repesca</span>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="py-1.5 pl-3 text-left font-medium">#</th>
            <th className="py-1.5 text-left font-medium">Equipo</th>
            <th className="py-1.5 text-center font-medium">PJ</th>
            <th className="py-1.5 text-center font-medium">DG</th>
            <th className="py-1.5 pr-3 text-center font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((r) => (
            <tr key={r.team.id} className="border-t border-border/60">
              <td className="py-2 pl-3">
                <span
                  className={cn(
                    "flex h-5 w-1.5 rounded-full",
                    r.rank <= 2 ? "bg-pitch-500" : r.rank === 3 ? "bg-warning" : "bg-transparent"
                  )}
                />
              </td>
              <td className="py-2">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/app/teams/${r.team.id}`}
                    className="flex min-w-0 items-center gap-2"
                    title={`Ver plantilla de ${r.team.name}`}
                  >
                    <TeamFlag team={r.team} size={22} />
                    <span className="truncate font-medium">{r.team.short_name ?? r.team.name}</span>
                  </Link>
                  {r.form.length > 0 && (
                    <span className="ml-auto flex shrink-0 items-center gap-0.5 pl-1">
                      {r.form.slice(-3).map((f, i) => (
                        <span
                          key={i}
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            f === "W" ? "bg-pitch-500" : f === "D" ? "bg-muted-foreground" : "bg-danger"
                          )}
                          title={f === "W" ? "Victoria" : f === "D" ? "Empate" : "Derrota"}
                        />
                      ))}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-2 text-center tabular-nums text-muted">{r.played}</td>
              <td className="py-2 text-center tabular-nums text-muted">
                {r.gd > 0 ? `+${r.gd}` : r.gd}
              </td>
              <td className="py-2 pr-3 text-center text-base font-bold tabular-nums">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
