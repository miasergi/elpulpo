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

function teamName(t: unknown) {
  const o = (Array.isArray(t) ? t[0] : t) as { name?: string; code?: string } | null;
  return o?.code ?? o?.name ?? "?";
}

function points(ph: number, pa: number, ah: number, aa: number) {
  if (ph === ah && pa === aa) return 5;
  const same = Math.sign(ph - pa) === Math.sign(ah - aa);
  if (same && ph - pa === ah - aa) return 3;
  if (same) return 2;
  return 0;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = Date.now();

  const { data: subs } = await supabase.from("push_subscriptions").select("user_id");
  const subscribers = [...new Set((subs ?? []).map((s) => s.user_id))];
  if (subscribers.length === 0) {
    return NextResponse.json({ ok: true, reminders: 0, results: 0, note: "sin suscriptores" });
  }

  let reminders = 0;
  let results = 0;

  // ── 1. Kickoff reminders (matches starting in ~1h, to those who haven't predicted) ──
  const from = new Date(now + 50 * 60 * 1000).toISOString();
  const to = new Date(now + 70 * 60 * 1000).toISOString();
  const { data: upcoming } = await supabase
    .from("matches")
    .select("id, home:teams!matches_home_team_id_fkey(name,code), away:teams!matches_away_team_id_fkey(name,code)")
    .eq("status", "scheduled")
    .gte("kickoff_at", from)
    .lte("kickoff_at", to);

  for (const m of upcoming ?? []) {
    const { data: predicted } = await supabase
      .from("predictions")
      .select("user_id")
      .eq("match_id", m.id)
      .in("user_id", subscribers);
    const done = new Set((predicted ?? []).map((p) => p.user_id));
    const targets = subscribers.filter((u) => !done.has(u));
    if (targets.length === 0) continue;
    const { sent } = await sendToUsers(targets, {
      title: "¡Empieza pronto!",
      body: `${teamName(m.home)} vs ${teamName(m.away)} arranca en una hora. ¡Mete tu predicción!`,
      url: `/app/matches/${m.id}`,
    });
    reminders += sent;
  }

  // ── 2. Result notifications (matches that just finished — updated in the last ~12 min) ──
  const recently = new Date(now - 12 * 60 * 1000).toISOString();
  const { data: finished } = await supabase
    .from("matches")
    .select("id, home_score, away_score, home:teams!matches_home_team_id_fkey(name,code), away:teams!matches_away_team_id_fkey(name,code)")
    .eq("status", "finished")
    .not("home_score", "is", null)
    .gte("updated_at", recently);

  for (const m of finished ?? []) {
    const { data: preds } = await supabase
      .from("predictions")
      .select("user_id, home_score, away_score")
      .eq("match_id", m.id)
      .in("user_id", subscribers);
    // Predictions are per group now: one notification per user, best score.
    const byUser = new Map<string, { user_id: string; home_score: number; away_score: number }>();
    for (const p of preds ?? []) {
      const prev = byUser.get(p.user_id);
      if (
        !prev ||
        points(p.home_score, p.away_score, m.home_score!, m.away_score!) >
          points(prev.home_score, prev.away_score, m.home_score!, m.away_score!)
      ) {
        byUser.set(p.user_id, p);
      }
    }
    for (const p of byUser.values()) {
      const pts = points(p.home_score, p.away_score, m.home_score!, m.away_score!);
      const body =
        pts > 0
          ? `${teamName(m.home)} ${m.home_score}-${m.away_score} ${teamName(m.away)} · ¡Sumaste ${pts} pts!`
          : `${teamName(m.home)} ${m.home_score}-${m.away_score} ${teamName(m.away)} · Esta vez no puntuaste`;
      const { sent } = await sendToUsers([p.user_id], {
        title: "Final del partido",
        body,
        url: `/app/matches/${m.id}`,
      });
      results += sent;
    }
  }

  return NextResponse.json({ ok: true, reminders, results });
}
