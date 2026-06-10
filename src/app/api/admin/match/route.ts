import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import type { MatchStatus } from "@/lib/database.types";

export async function POST(request: Request) {
  if (!(await getAdminUser())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await request.json()) as {
    id: string;
    home_score: number | null;
    away_score: number | null;
    status: MatchStatus;
  };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("matches")
    .update({
      home_score: body.home_score,
      away_score: body.away_score,
      status: body.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
