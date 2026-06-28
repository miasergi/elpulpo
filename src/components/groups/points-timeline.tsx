import { Trophy, ChevronUp, ChevronDown, Minus, Crown, Radio, LineChart } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TeamFlag } from "@/components/match/team-flag";
import { kickoffLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TimelineEntry, TimelinePlayer, BonusTimelineEntry } from "@/lib/groups";

export function BonusTimeline({ entries }: { entries: BonusTimelineEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <div className="mb-4 space-y-3">
      {entries.map((entry) => (
        <div key={entry.id} className="overflow-hidden rounded-lg border border-warning/35 bg-warning/10">
          <div className="flex items-center justify-between gap-2 border-b border-warning/20 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-warning">{entry.label}</p>
              <p className="text-[11px] text-muted">
                Correcto: <span className="font-semibold text-foreground">{entry.correctAnswer}</span>
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-bold text-warning">
              +{entry.points}
            </span>
          </div>
          <div className="divide-y divide-warning/10">
            {entry.players.map((p) => (
              <div key={p.user_id} className="flex items-center gap-2.5 px-3 py-2">
                <Avatar src={p.avatar_url} name={p.display_name} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.display_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.answer ? `Puso ${p.answer}` : "No respondio"}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-sm font-bold tabular-nums",
                    p.points > 0 ? "text-pitch-400" : "text-muted-foreground"
                  )}
                >
                  {p.points > 0 ? `+${p.points}` : "0"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PointsTimeline({
  entries,
  currentUserId,
}: {
  entries: TimelineEntry[];
  currentUserId: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="mt-10 text-center text-sm text-muted">
        <LineChart className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3">
          Aún no se ha jugado ningún partido.
          <br />
          Cuando terminen, aquí verás cuántos puntos sumó cada uno y cómo se mueve la clasificación.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-8">
      {entries.map((e) => (
        <MatchEntry key={e.match.id} entry={e} currentUserId={currentUserId} />
      ))}
    </div>
  );
}

function MatchEntry({ entry, currentUserId }: { entry: TimelineEntry; currentUserId: string }) {
  const { match: m } = entry;
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface/60">
      {/* Match header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-surface-2/50 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <TeamFlag team={m.home_team} size={22} />
          <span className="text-sm font-bold tabular-nums">
            {m.home_team?.code ?? m.home_team?.short_name ?? "?"} {m.home_score}
            <span className="mx-1 text-muted-foreground">-</span>
            {m.away_score} {m.away_team?.code ?? m.away_team?.short_name ?? "?"}
          </span>
          <TeamFlag team={m.away_team} size={22} />
        </div>
        {entry.live ? (
          <Badge variant="live">
            <Radio className="h-3 w-3 animate-pulse" /> EN VIVO
          </Badge>
        ) : (
          <span className="shrink-0 text-[11px] text-muted-foreground">{kickoffLabel(m.kickoff_at)}</span>
        )}
      </div>

      {/* Per-member breakdown */}
      <div className="divide-y divide-border/40">
        {entry.players.map((p) => (
          <PlayerLine
            key={p.user_id}
            p={p}
            isMe={p.user_id === currentUserId}
            isTop={entry.topPoints > 0 && p.points === entry.topPoints}
          />
        ))}
      </div>
    </div>
  );
}

function PlayerLine({ p, isMe, isTop }: { p: TimelinePlayer; isMe: boolean; isTop: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5 px-3 py-2", isMe && "bg-primary/5")}>
      {/* Rank + movement */}
      <div className="flex w-8 shrink-0 flex-col items-center leading-none">
        <span className="text-sm font-bold tabular-nums">{p.rank}º</span>
        <RankDelta delta={p.rankDelta} />
      </div>

      <Avatar src={p.avatar_url} name={p.display_name} size={28} />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-sm">
          <span className={cn("truncate font-medium", isMe && "text-pulpo-200")}>{p.display_name}</span>
          {isMe && <span className="text-[10px] text-muted">(tú)</span>}
          {isTop && <Crown className="h-3.5 w-3.5 shrink-0 text-[#f5c542]" />}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {p.predicted ? (
            <>
              Predijo <span className="font-medium text-muted">{p.home}-{p.away}</span>
            </>
          ) : (
            "No jugó este partido"
          )}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end leading-tight">
        <span
          className={cn(
            "flex items-center gap-1 text-sm font-bold tabular-nums",
            p.points > 0 ? "text-pitch-400" : "text-muted-foreground"
          )}
        >
          {p.mult > 1 && p.points > 0 && (
            <span className="rounded bg-warning/15 px-1 text-[9px] font-bold text-warning">x2</span>
          )}
          {p.points > 0 ? `+${p.points}` : p.predicted ? "0" : "—"}
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">{p.total} pts</span>
      </div>
    </div>
  );
}

function RankDelta({ delta }: { delta: number }) {
  if (delta > 0)
    return (
      <span className="flex items-center text-[10px] font-bold text-pitch-400">
        <ChevronUp className="h-3 w-3" />
        {delta}
      </span>
    );
  if (delta < 0)
    return (
      <span className="flex items-center text-[10px] font-bold text-danger">
        <ChevronDown className="h-3 w-3" />
        {-delta}
      </span>
    );
  return <Minus className="h-2.5 w-2.5 text-muted-foreground" />;
}

/** Small header used above the timeline. */
export function TimelineIntro() {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-lg border border-pulpo-500/30 bg-pulpo-500/10 p-3">
      <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-pulpo-300" />
      <p className="text-xs text-muted">
        El progreso de la porra partido a partido: cuántos puntos sumó cada uno y cómo cambió la
        clasificación. Se actualiza solo en cuanto hay marcador.
      </p>
    </div>
  );
}
