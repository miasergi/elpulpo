import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { replay } from "@/lib/games/career/engine";
import type { Json } from "@/lib/database.types";
import type { Decision, Identity } from "@/lib/games/career/types";

export const dynamic = "force-dynamic";

/**
 * Guarda el avance de una carrera del Simulador de Carrera.
 *
 * No se confía en lo que manda el cliente: se rehace la carrera aquí con la
 * semilla y las decisiones, y el resumen se recalcula en el servidor. Así el
 * ranking del grupo no se puede inflar tocando la petición.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: {
    id?: string | null;
    seed?: number;
    identity?: Identity;
    decisions?: Decision[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const seed = Number(body.seed);
  const identity = body.identity;
  const decisions = Array.isArray(body.decisions) ? body.decisions.slice(0, 200) : [];

  if (!Number.isFinite(seed) || !identity?.countryCode || !identity?.position) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Rehacer la carrera valida de paso que las decisiones son coherentes.
  let state;
  try {
    state = replay(seed, identity, decisions);
  } catch {
    return NextResponse.json({ error: "invalid_career" }, { status: 400 });
  }

  const finished = state.phase === "summary";
  const summary = finished ? buildSummary(state) : null;

  // Las columnas son jsonb; el tipo Json del cliente es más estricto que
  // nuestros objetos, y aquí ya sabemos que son serializables porque acaban
  // de sobrevivir a `replay`.
  const row = {
    user_id: auth.user.id,
    seed,
    identity: state.identity as unknown as Json,
    decisions: decisions as unknown as Json,
    finished,
    summary: summary as unknown as Json,
  };

  if (body.id) {
    const { error } = await supabase
      .from("career_runs")
      .update(row)
      .eq("id", body.id)
      .eq("user_id", auth.user.id);
    if (error) return NextResponse.json({ error: "save_failed" }, { status: 500 });
    return NextResponse.json({ id: body.id });
  }

  // Solo puede haber una carrera a medias: la anterior se descarta.
  await supabase.from("career_runs").delete().eq("user_id", auth.user.id).eq("finished", false);

  const { data, error } = await supabase.from("career_runs").insert(row).select("id").single();
  if (error) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

type ReplayState = ReturnType<typeof replay>;

function buildSummary(state: ReplayState) {
  const trophies = state.seasons.flatMap((s) => s.trophies);
  return {
    lastName: state.identity.lastName,
    countryCode: state.identity.countryCode,
    position: state.identity.position,
    seasons: state.totals.seasons,
    appearances: state.totals.appearances,
    goals: state.totals.goals,
    assists: state.totals.assists,
    trophies: state.totals.trophies,
    awards: state.totals.awards,
    peakOverall: state.seasons.reduce((m, s) => Math.max(m, s.overall), 0),
    peakValue: state.seasons.reduce((m, s) => Math.max(m, s.marketValue), 0),
    ballonDors: state.seasons.filter((s) => s.awards.includes("ballon_dor")).length,
    worldCups: trophies.filter((t) => t === "world_cup").length,
    leagues: trophies.filter((t) => t === "league").length,
    finalClubId: state.seasons[state.seasons.length - 1]?.clubId ?? null,
  };
}
