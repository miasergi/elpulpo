import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { syncWorldCupSportsDB } from "@/lib/sync";
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
    const result = await syncWorldCupSportsDB();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
