import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendToUsers } from "@/lib/push";

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

  const supabase = createServiceClient();
  const now = Date.now();
  const from = new Date(now + 50 * 60 * 1000).toISOString(); // +50 min
  const to = new Date(now + 70 * 60 * 1000).toISOString(); // +70 min

  // Matches kicking off within the reminder window.
  const { data: matches } = await supabase
    .from("matches")
    .select("id, kickoff_at, home:teams!matches_home_team_id_fkey(name,code), away:teams!matches_away_team_id_fkey(name,code)")
    .eq("status", "scheduled")
    .gte("kickoff_at", from)
    .lte("kickoff_at", to);

  if (!matches || matches.length === 0) {
    return NextResponse.json({ ok: true, matches: 0, notified: 0 });
  }

  // All users with a push subscription.
  const { data: subs } = await supabase.from("push_subscriptions").select("user_id");
  const subscribers = [...new Set((subs ?? []).map((s) => s.user_id))];
  if (subscribers.length === 0) {
    return NextResponse.json({ ok: true, matches: matches.length, notified: 0 });
  }

  let totalSent = 0;
  for (const m of matches) {
    const { data: predicted } = await supabase
      .from("predictions")
      .select("user_id")
      .eq("match_id", m.id)
      .in("user_id", subscribers);
    const predictedSet = new Set((predicted ?? []).map((p) => p.user_id));
    const targets = subscribers.filter((u) => !predictedSet.has(u));
    if (targets.length === 0) continue;

    const home = (Array.isArray(m.home) ? m.home[0] : m.home) as { name: string; code: string | null } | null;
    const away = (Array.isArray(m.away) ? m.away[0] : m.away) as { name: string; code: string | null } | null;
    const { sent } = await sendToUsers(targets, {
      title: "⚽ ¡Empieza pronto!",
      body: `${home?.name ?? "?"} vs ${away?.name ?? "?"} arranca en una hora. ¡Mete tu predicción! 🐙`,
      url: `/app/matches/${m.id}`,
    });
    totalSent += sent;
  }

  return NextResponse.json({ ok: true, matches: matches.length, notified: totalSent });
}
