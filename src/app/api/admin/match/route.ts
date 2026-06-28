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
  const { data: match } = await supabase
    .from("matches")
    .select("home_team_id, away_team_id")
    .eq("id", body.id)
    .maybeSingle();
  const winnerTeamId =
    body.home_score != null && body.away_score != null && body.home_score === body.away_score
      ? null
      : body.home_score != null && body.away_score != null && body.home_score > body.away_score
        ? match?.home_team_id ?? null
        : body.home_score != null && body.away_score != null && body.home_score < body.away_score
          ? match?.away_team_id ?? null
          : null;
  const { error } = await supabase
    .from("matches")
    .update({
      home_score: body.home_score,
      away_score: body.away_score,
      winner_team_id: winnerTeamId,
      status: body.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
