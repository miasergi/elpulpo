import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!(await getAdminUser())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await request.json()) as {
    id: string;
    correct_team_id: string | null;
    correct_text: string | null;
    resolved: boolean;
  };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("bonus_markets")
    .update({
      correct_team_id: body.correct_team_id,
      correct_text: body.correct_text,
      resolved: body.resolved,
    })
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
