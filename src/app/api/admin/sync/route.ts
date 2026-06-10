import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { syncWorldCup } from "@/lib/sync";

export const maxDuration = 60;

export async function POST() {
  if (!(await getAdminUser())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const result = await syncWorldCup();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
