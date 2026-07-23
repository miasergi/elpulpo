// ╔══════════════════════════════════════════════════════════════════╗
// ║  Guardar y cargar carreras                                         ║
// ║                                                                    ║
// ║  Como el motor es determinista, en Supabase solo viven la semilla, ║
// ║  la identidad y las decisiones. `summary` es una copia de los      ║
// ║  totales para poder pintar el ranking del grupo sin rehacer todas  ║
// ║  las simulaciones.                                                 ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClient } from "@/lib/supabase/server";
import type { Decision, Identity } from "./types";

export interface CareerRunSummary {
  lastName: string;
  countryCode: string;
  position: string;
  seasons: number;
  appearances: number;
  goals: number;
  assists: number;
  trophies: number;
  awards: number;
  peakOverall: number;
  peakValue: number;
  ballonDors: number;
  worldCups: number;
  leagues: number;
  finalClubId: string | null;
}

export interface SavedCareer {
  id: string;
  seed: number;
  identity: Identity;
  decisions: Decision[];
  finished: boolean;
  summary: CareerRunSummary | null;
  updatedAt: string;
}

export interface GroupCareerEntry extends CareerRunSummary {
  runId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isMe: boolean;
}

interface CareerRunRow {
  id: string;
  user_id: string;
  seed: number;
  identity: Identity;
  decisions: Decision[] | null;
  finished: boolean;
  summary: CareerRunSummary | null;
  updated_at: string;
}

/** La carrera a medias del usuario, si tiene alguna. */
export async function getActiveCareer(userId: string): Promise<SavedCareer | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("career_runs")
    .select("id,user_id,seed,identity,decisions,finished,summary,updated_at")
    .eq("user_id", userId)
    .eq("finished", false)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? toSavedCareer(data as unknown as CareerRunRow) : null;
}

/** Las carreras ya terminadas, de la más reciente a la más antigua. */
export async function getFinishedCareers(userId: string, limit = 10): Promise<SavedCareer[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("career_runs")
    .select("id,user_id,seed,identity,decisions,finished,summary,updated_at")
    .eq("user_id", userId)
    .eq("finished", true)
    .order("updated_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => toSavedCareer(row as unknown as CareerRunRow));
}

/**
 * Ranking de carreras terminadas entre los miembros de un grupo. El RLS ya
 * limita lo que se puede leer; aquí solo se ordena y se adorna con el perfil.
 */
export async function getGroupCareerBoard(
  groupId: string,
  meId: string,
  limit = 25
): Promise<GroupCareerEntry[]> {
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);

  const memberIds = (members ?? []).map((m) => m.user_id as string);
  if (!memberIds.length) return [];

  const [{ data: runs }, { data: profileRows }] = await Promise.all([
    supabase
      .from("career_runs")
      .select("id,user_id,summary,updated_at")
      .in("user_id", memberIds)
      .eq("finished", true)
      .order("updated_at", { ascending: false }),
    supabase.from("profiles").select("id, display_name, avatar_url").in("id", memberIds),
  ]);

  const profiles = new Map((profileRows ?? []).map((p) => [p.id as string, p]));

  // Solo la mejor carrera de cada uno entra en el ranking.
  const best = new Map<string, GroupCareerEntry>();
  for (const run of runs ?? []) {
    const summary = run.summary as CareerRunSummary | null;
    if (!summary) continue;
    const userId = run.user_id as string;
    const entry: GroupCareerEntry = {
      ...summary,
      runId: run.id as string,
      userId,
      displayName: profiles.get(userId)?.display_name ?? "Jugador",
      avatarUrl: profiles.get(userId)?.avatar_url ?? null,
      isMe: userId === meId,
    };
    const current = best.get(userId);
    if (!current || careerScore(entry) > careerScore(current)) best.set(userId, entry);
  }

  return [...best.values()].sort((a, b) => careerScore(b) - careerScore(a)).slice(0, limit);
}

/**
 * Cómo de buena fue una carrera, en un solo número. Manda el palmarés y los
 * premios; la media máxima solo desempata.
 */
export function careerScore(entry: CareerRunSummary): number {
  return (
    entry.worldCups * 120 +
    entry.ballonDors * 100 +
    entry.trophies * 20 +
    entry.awards * 15 +
    entry.peakOverall * 2 +
    entry.goals * 0.2
  );
}

function toSavedCareer(row: CareerRunRow): SavedCareer {
  return {
    id: row.id,
    seed: Number(row.seed),
    identity: row.identity,
    decisions: Array.isArray(row.decisions) ? row.decisions : [],
    finished: row.finished,
    summary: row.summary,
    updatedAt: row.updated_at,
  };
}
