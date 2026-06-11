import Link from "next/link";
import { Radio, Check, Crown, Zap, CalendarClock } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { TeamFlag } from "@/components/match/team-flag";
import { kickoffLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TodayMatch } from "@/lib/groups";

/** Dashboard "today" hub: today's matches with the group's live points race. */
export function LiveToday({ matches, currentUserId }: { matches: TodayMatch[]; currentUserId: string }) {
  if (matches.length === 0) return null;
  const anyLive = matches.some((m) => m.live);

  return (
    <section className="mt-7">
      <h2 className="mb-2 flex items-center gap-2 font-semibold">
        {anyLive ? (
          <span className="flex items-center gap-1.5 text-danger">
            <Radio className="h-4 w-4 animate-pulse" /> En directo
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-pulpo-300" /> Hoy
          </span>
        )}
      </h2>

      <div className="space-y-2.5">
        {matches.map((tm) => (
          <TodayCard key={tm.match.id} tm={tm} currentUserId={currentUserId} />
        ))}
      </div>
    </section>
  );
}

function TodayCard({ tm, currentUserId }: { tm: TodayMatch; currentUserId: string }) {
  const { match: m } = tm;
  const top = tm.scorers[0]?.points ?? 0;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-surface/60",
        tm.live ? "border-danger/50" : "border-border"
      )}
    >
      <Link href={`/app/matches/${m.id}`} className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <TeamFlag team={m.home_team} size={24} />
          <span className="text-sm font-bold tabular-nums">
            {m.home_team?.code ?? "?"}
            {tm.locked && m.home_score != null ? (
              <> {m.home_score}<span className="mx-0.5 text-muted-foreground">-</span>{m.away_score} </>
            ) : (
              <span className="mx-1 text-xs font-normal text-muted-foreground">vs</span>
            )}
            {m.away_team?.code ?? "?"}
          </span>
          <TeamFlag team={m.away_team} size={24} />
        </div>
        {tm.live ? (
          <span className="flex items-center gap-1 rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold text-white">
            <Radio className="h-3 w-3 animate-pulse" /> {m.minute ? `${m.minute}'` : "EN VIVO"}
          </span>
        ) : tm.finished ? (
          <span className="text-[11px] font-medium text-muted-foreground">Final</span>
        ) : (
          <span className="text-[11px] text-muted-foreground">{kickoffLabel(m.kickoff_at)}</span>
        )}
      </Link>

      {/* Live / final points race */}
      {tm.locked && tm.scorers.length > 0 ? (
        <div className="divide-y divide-border/40 border-t border-border/60">
          {tm.scorers.slice(0, 5).map((s) => {
            const isMe = s.user_id === currentUserId;
            return (
              <div key={s.user_id} className={cn("flex items-center gap-2 px-3 py-1.5", isMe && "bg-primary/5")}>
                <Avatar src={s.avatar_url} name={s.display_name} size={22} />
                <span className={cn("flex-1 truncate text-xs", isMe && "font-semibold text-pulpo-200")}>
                  {s.display_name}
                  {isMe && <span className="ml-1 text-[10px] text-muted">(tú)</span>}
                </span>
                <span className="text-[11px] tabular-nums text-muted-foreground">{s.home}-{s.away}</span>
                <span
                  className={cn(
                    "flex w-10 items-center justify-end gap-0.5 text-xs font-bold tabular-nums",
                    s.points > 0 ? "text-pitch-400" : "text-muted-foreground"
                  )}
                >
                  {s.points === top && top > 0 && <Crown className="h-3 w-3 text-[#f5c542]" />}
                  {s.points > 0 ? `+${s.points}` : "0"}
                </span>
              </div>
            );
          })}
          {tm.live && (
            <p className="px-3 py-1 text-center text-[10px] text-muted-foreground">Puntos provisionales · en juego</p>
          )}
        </div>
      ) : tm.locked ? (
        <p className="border-t border-border/60 px-3 py-2 text-center text-[11px] text-muted-foreground">
          Nadie del grupo predijo este partido
        </p>
      ) : (
        <Link
          href={`/app/matches/${m.id}`}
          className="flex items-center justify-center gap-1.5 border-t border-border/60 py-2 text-xs font-medium"
        >
          {tm.iPredicted ? (
            <span className="flex items-center gap-1 text-pitch-400"><Check className="h-3.5 w-3.5" /> Ya predijiste · editar</span>
          ) : (
            <span className="flex items-center gap-1 text-warning"><Zap className="h-3.5 w-3.5" /> Pon tu predicción antes de empezar</span>
          )}
        </Link>
      )}
    </div>
  );
}
