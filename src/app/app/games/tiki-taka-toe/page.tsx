import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BackHeader } from "@/components/app/back-header";
import { TikiTakaToe } from "@/components/games/tiki-taka-toe";
import { generateTikiGrid } from "@/lib/games/minigames";
import type { PlayerIndex } from "@/lib/games/minigames";

export const dynamic = "force-dynamic";

export default async function TikiTakaToePageComponent() {
  await requireProfile();
  const supabase = await createClient();

  const [{ data: teamsRaw }, { data: playersRaw }] = await Promise.all([
    supabase.from("teams").select("id,name,code,flag_url"),
    supabase
      .from("players")
      .select("id,name,club,photo_url,number,position,team_id")
      .not("club", "is", null)
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
  const grid = generateTikiGrid(players, today);

  if (!grid) {
    return (
      <div className="px-5">
        <BackHeader title="Tiki-Taka-Toe" />
        <p className="mt-16 text-center text-sm text-muted">
          No hay rejilla disponible hoy. ¡Prueba mañana!
        </p>
      </div>
    );
  }

  return (
    <div className="px-5">
      <BackHeader title="Tiki-Taka-Toe" />
      <TikiTakaToe grid={grid} allPlayers={players} today={today} />
    </div>
  );
}
