import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PlayerIndex } from "@/lib/games/minigames";

export const dynamic = "force-dynamic";

/** Índice completo de jugadores del mundial con datos de selección.
 *  Usado por: Quiz club, ¿Quién es?, Tiki-Taka-Toe. */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [{ data: teamsRaw }, { data: playersRaw }] = await Promise.all([
    supabase.from("teams").select("id,name,code,flag_url"),
    supabase.from("players").select("id,name,club,photo_url,number,position,team_id").limit(2000).order("id"),
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

  return NextResponse.json({ players });
}
