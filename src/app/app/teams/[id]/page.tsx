import { notFound } from "next/navigation";
import { Zap, Shirt } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTeamPlayers, type SdbPlayer } from "@/lib/sports-db";
import { BackHeader } from "@/components/app/back-header";
import { TeamFlag } from "@/components/match/team-flag";
import { PlayerCard } from "@/components/teams/player-card";

export const dynamic = "force-dynamic";

const BUCKETS = [
  { key: "gk", label: "Porteros", test: /goalkeeper/i },
  { key: "def", label: "Defensas", test: /back|defen/i },
  { key: "mid", label: "Centrocampistas", test: /midfield/i },
  { key: "fwd", label: "Delanteros", test: /forward|wing|striker|attack(?!ing midfield)/i },
] as const;

function bucketOf(p: SdbPlayer) {
  const pos = p.position ?? "";
  for (const b of BUCKETS) if (b.test.test(pos)) return b.key;
  return "fwd";
}

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireProfile();

  const supabase = await createClient();
  const { data: team } = await supabase
    .from("teams")
    .select("id,name,short_name,code,flag_url,external_id,double_points,is_underdog")
    .eq("id", id)
    .maybeSingle();
  if (!team) notFound();

  const players = team.external_id ? await getTeamPlayers(team.external_id) : [];
  const grouped = BUCKETS.map((b) => ({
    ...b,
    players: players.filter((p) => bucketOf(p) === b.key),
  })).filter((b) => b.players.length > 0);

  return (
    <div className="px-5">
      <BackHeader title="" />

      {/* Team hero */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-pulpo-500/15 via-surface/80 to-primary/10 p-5">
        <div className="flex items-center gap-4">
          <TeamFlag team={team} size={64} />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold">{team.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {team.code && (
                <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-bold text-muted">
                  {team.code}
                </span>
              )}
              {team.double_points && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-bold text-warning">
                  <Zap className="h-3 w-3" /> Sus partidos valen x2
                </span>
              )}
              {team.is_underdog && (
                <span className="rounded-full bg-pulpo-500/15 px-2 py-0.5 text-[11px] font-bold text-pulpo-300">
                  Elegible como tapado
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Squad */}
      {grouped.length === 0 ? (
        <div className="mt-12 text-center text-sm text-muted">
          <Shirt className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3">Aún no tenemos la plantilla de esta selección.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-6 pb-8">
          {grouped.map((b) => (
            <section key={b.key}>
              <h2 className="mb-2 text-sm font-semibold text-muted">{b.label}</h2>
              <div className="grid grid-cols-2 gap-2">
                {b.players.map((p) => (
                  <PlayerCard key={p.id} player={p} />
                ))}
              </div>
            </section>
          ))}
          <p className="text-center text-[11px] text-muted-foreground">
            Jugadores destacados · datos de TheSportsDB
          </p>
        </div>
      )}
    </div>
  );
}
