import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BackHeader } from "@/components/app/back-header";
import { QuienEs } from "@/components/games/quien-es";
import { dailyPlayer } from "@/lib/games/minigames";
import type { PlayerIndex } from "@/lib/games/minigames";

export const dynamic = "force-dynamic";

export default async function QuienEsPage() {
  await requireProfile();
  const supabase = await createClient();

  const [{ data: teamsRaw }, { data: playersRaw }] = await Promise.all([
    supabase.from("teams").select("id,name,code,flag_url"),
    supabase
      .from("players")
      .select("id,name,club,photo_url,number,position,team_id")
      .not("photo_url", "is", null)
      .order("id")
      .limit(2000),
  ]);

  const teamsMap = new Map((teamsRaw ?? []).map((t) => [t.id, t]));

  const players: PlayerIndex[] = (playersRaw ?? []).map((p) => {
    const team = teamsMap.get(p.team_id);
    return {
      id: p.id,
      name: p.name,
      club: p.club ?? null,
      photo_url: p.photo_url ?? null,
      number: p.number ?? null,
      position: p.position ?? null,
      team_id: p.team_id,
      team_code: team?.code ?? "",
      team_name: team?.name ?? "",
      team_flag: team?.flag_url ?? null,
    };
  });

  const today = new Date().toISOString().slice(0, 10);
  const daily = dailyPlayer(players, today);

  if (!daily) {
    return (
      <div className="px-5">
        <BackHeader title="¿Quién es?" />
        <p className="mt-16 text-center text-sm text-muted">No hay jugadores disponibles.</p>
      </div>
    );
  }

  return (
    <div className="px-5">
      <BackHeader title="¿Quién es?" />
      <QuienEs daily={daily} allPlayers={players} today={today} />
    </div>
  );
}
