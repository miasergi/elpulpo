import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { patchScoresFromAPIFootball, syncWorldCupSportsDB } from "@/lib/sync";
import { syncSquadsFIFA } from "@/lib/fifa";
import { createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await getAdminUser())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    if (new URL(request.url).searchParams.get("squads")) {
      const result = await syncSquadsFIFA(createServiceClient());
      return NextResponse.json({ ok: true, ...result });
    }
    // Use API-Football for the manual button (1 HTTP call, fast, reliable).
    // Falls back to TheSportsDB full sync only if API-Football has no access.
    const patch = await patchScoresFromAPIFootball();
    if (patch.matches === 0 && "note" in patch) {
      const fallback = await syncWorldCupSportsDB();
      return NextResponse.json({ ok: true, source: "thesportsdb-fallback", matches: fallback.matches });
    }
    return NextResponse.json({ ok: true, ...patch });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
