import { NextResponse } from "next/server";
import { syncWorldCupSportsDB, patchScoresFromAPIFootball } from "@/lib/sync";
import { syncSquadsFIFA } from "@/lib/fifa";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  const url = new URL(request.url);
  return header === `Bearer ${secret}` || url.searchParams.get("secret") === secret;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(request.url);

    if (url.searchParams.get("squads")) {
      const result = await syncSquadsFIFA(createServiceClient());
      return NextResponse.json({ ok: true, ...result });
    }

    // ?mode=patch → fast score-only sync via API-Football (used by the 22:00 UTC cron).
    if (url.searchParams.get("mode") === "patch") {
      const patch = await patchScoresFromAPIFootball();
      return NextResponse.json({ ok: true, ...patch });
    }

    // Full sync: TheSportsDB first (upserts teams + matches), then API-Football (corrects scores).
    // Sequential is intentional: patchScores must always overwrite any stale TheSportsDB status.
    const result = await syncWorldCupSportsDB();
    const patch = await patchScoresFromAPIFootball();
    return NextResponse.json({ ok: true, ...result, patched: patch.matches });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
