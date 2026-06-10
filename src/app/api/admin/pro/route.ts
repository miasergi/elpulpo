import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Grant/revoke the Pro tier (ad-free) for a user. Admin only. */
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { userId, isPro } = (await request.json()) as { userId?: string; isPro?: boolean };
  if (!userId || typeof isPro !== "boolean") {
    return NextResponse.json({ error: "userId e isPro son obligatorios" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("profiles").update({ is_pro: isPro }).eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
