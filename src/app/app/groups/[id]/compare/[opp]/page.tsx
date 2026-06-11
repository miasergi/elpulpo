import { notFound, redirect } from "next/navigation";
import { Swords, Check, X } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getGroup, getHeadToHead } from "@/lib/groups";
import { BackHeader } from "@/components/app/back-header";
import { Avatar } from "@/components/ui/avatar";
import { TeamFlag } from "@/components/match/team-flag";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ComparePage({
  params,
}: {
  params: Promise<{ id: string; opp: string }>;
}) {
  const { id, opp } = await params;
  const { profile } = await requireProfile();
  if (profile.active_group_id !== id) redirect("/app/profile");
  if (opp === profile.id) redirect(`/app/groups/${id}`);

  const group = await getGroup(id);
  if (!group) notFound();

  const h2h = await getHeadToHead(group, profile.id, opp);
  if (!h2h) notFound();
  const { a, b, draws, matches } = h2h;

  return (
    <div className="px-5">
      <BackHeader title="Cara a cara" />

      {/* Header: two players + win tally */}
      <div className="rounded-xl border border-border bg-surface/60 p-4">
        <div className="flex items-center justify-between">
          <PlayerHead side={a} leading={a.total >= b.total} />
          <div className="flex flex-col items-center px-2">
            <Swords className="h-5 w-5 text-pulpo-300" />
            <span className="mt-1 text-2xl font-extrabold tabular-nums">
              {a.total}<span className="px-1 text-muted-foreground">-</span>{b.total}
            </span>
            <span className="text-[10px] text-muted-foreground">puntos</span>
          </div>
          <PlayerHead side={b} leading={b.total >= a.total} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Partidos ganados" a={a.wins} b={b.wins} />
          <div className="rounded-lg bg-surface-2 p-2">
            <p className="text-[10px] text-muted-foreground">Empates</p>
            <p className="text-lg font-bold tabular-nums">{draws}</p>
          </div>
          <Stat label="Exactos" a={a.exacts} b={b.exacts} />
        </div>
      </div>

      {/* Per-match comparison */}
      {matches.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted">
          Todavía no hay partidos jugados que comparar.
        </p>
      ) : (
        <div className="mt-5 space-y-2 pb-8">
          {matches.map((mm) => (
            <div key={mm.match.id} className="rounded-lg border border-border bg-surface/50 p-3">
              <div className="mb-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <TeamFlag team={mm.match.home_team} size={18} />
                <span className="font-semibold text-foreground">
                  {mm.match.home_team?.code ?? "?"} {mm.match.home_score}-{mm.match.away_score} {mm.match.away_team?.code ?? "?"}
                </span>
                <TeamFlag team={mm.match.away_team} size={18} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <CompareCell
                  pred={mm.aHome != null ? `${mm.aHome}-${mm.aAway}` : null}
                  pts={mm.aPts}
                  win={mm.winner === "a"}
                  align="left"
                />
                <span className="text-[10px] text-muted-foreground">vs</span>
                <CompareCell
                  pred={mm.bHome != null ? `${mm.bHome}-${mm.bAway}` : null}
                  pts={mm.bPts}
                  win={mm.winner === "b"}
                  align="right"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerHead({ side, leading }: { side: { name: string; avatar_url: string | null }; leading: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <Avatar src={side.avatar_url} name={side.name} size={56} className={cn(leading && "ring-2 ring-pitch-500")} />
      <span className="max-w-full truncate text-sm font-semibold">{side.name}</span>
    </div>
  );
}

function Stat({ label, a, b }: { label: string; a: number; b: number }) {
  return (
    <div className="rounded-lg bg-surface-2 p-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums">
        <span className={cn(a > b && "text-pitch-400")}>{a}</span>
        <span className="px-1 text-muted-foreground">·</span>
        <span className={cn(b > a && "text-pitch-400")}>{b}</span>
      </p>
    </div>
  );
}

function CompareCell({ pred, pts, win, align }: { pred: string | null; pts: number; win: boolean; align: "left" | "right" }) {
  return (
    <div className={cn("flex flex-1 flex-col", align === "left" ? "items-start" : "items-end")}>
      <span className="text-sm tabular-nums text-muted">{pred ?? "No jugó"}</span>
      <span
        className={cn(
          "flex items-center gap-1 text-sm font-bold tabular-nums",
          pts > 0 ? "text-pitch-400" : "text-muted-foreground"
        )}
      >
        {win && pts > 0 && <Check className="h-3.5 w-3.5" />}
        {pred ? (pts > 0 ? `+${pts}` : "0") : <X className="h-3.5 w-3.5" />}
      </span>
    </div>
  );
}
