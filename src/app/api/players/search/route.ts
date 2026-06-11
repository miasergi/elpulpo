import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface SdbSearchPlayer {
  strPlayer: string;
  strTeam: string | null;
  strNationality: string | null;
  strPosition: string | null;
  strCutout: string | null;
  strThumb: string | null;
  strSport: string | null;
}

/** Player-name autocomplete, proxied to TheSportsDB (avoids CORS, hides key). */
export async function GET(request: Request) {
  // Only for signed-in users.
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return NextResponse.json({ players: [] });

  const key = process.env.THESPORTSDB_KEY || "3";
  const url = `https://www.thesportsdb.com/api/v1/json/${key}/searchplayers.php?p=${encodeURIComponent(q)}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return NextResponse.json({ players: [] });

  const json = (await res.json()) as { player: SdbSearchPlayer[] | null };
  const players = (json.player ?? [])
    .filter((p) => p.strSport === "Soccer")
    .slice(0, 8)
    .map((p) => ({
      name: p.strPlayer,
      team: p.strTeam,
      nationality: p.strNationality,
      position: p.strPosition,
      photo: p.strCutout || p.strThumb,
    }));

  return NextResponse.json({ players });
}
