import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { RawPlayer } from "@/lib/games/eleven";

export const dynamic = "force-dynamic";

/** Plantilla de una selección (para el minijuego "El 11 del mundial").
 *  Se carga bajo demanda cuando la ruleta cae en un país. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const teamId = new URL(request.url).searchParams.get("team")?.trim();
  if (!teamId) return NextResponse.json({ players: [] });

  const { data } = await supabase
    .from("players")
    .select("id,name,number,position,club,club_badge,photo_url")
    .eq("team_id", teamId)
    .order("number", { ascending: true, nullsFirst: false });

  return NextResponse.json({ players: (data ?? []) as RawPlayer[] });
}
