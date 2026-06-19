import { NextResponse } from "next/server";
import { patchScoresFromOpenFootball } from "@/lib/sync";
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

    // Both crons (4 AM UTC full + 22:00 UTC patch) use openfootball:
    // free, no API key, no plan limits, ~1s fetch, always up to date.
    const patch = await patchScoresFromOpenFootball();
    return NextResponse.json({ ok: true, ...patch });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
