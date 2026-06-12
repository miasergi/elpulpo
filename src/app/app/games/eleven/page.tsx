import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BackHeader } from "@/components/app/back-header";
import { ElevenGame } from "@/components/games/eleven-game";
import { pickRandom, randomSeed, type RawPlayer, type TeamLite } from "@/lib/games/eleven";

export const dynamic = "force-dynamic";

export default async function ElevenPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  await requireProfile();
  const { t } = await searchParams;
  const supabase = await createClient();

  // Las 48 selecciones (rivales + banderas). Solo las que tienen plantilla.
  const { data: teamsRaw } = await supabase
    .from("teams")
    .select("id,name,code,flag_url")
    .order("name", { ascending: true });
  const teams: TeamLite[] = (teamsRaw ?? []).filter((t) => t.code);

  // La selección que te toca: la pedida (?t=) o una al azar.
  const myTeam = (t && teams.find((x) => x.id === t)) || pickRandom(teams) || null;

  let squad: RawPlayer[] = [];
  if (myTeam) {
    const { data } = await supabase
      .from("players")
      .select("id,name,number,position,club,club_badge,photo_url")
      .eq("team_id", myTeam.id)
      .order("number", { ascending: true, nullsFirst: false });
    squad = (data ?? []) as RawPlayer[];
  }

  return (
    <div className="px-5">
      <BackHeader title="El 11 del mundial" />
      {!myTeam || squad.length < 11 ? (
        <p className="mt-12 text-center text-sm text-muted">
          No hay plantillas disponibles para jugar todavía.
        </p>
      ) : (
        <ElevenGame
          key={myTeam.id}
          myTeam={myTeam}
          squad={squad}
          // El rival se elige del resto de selecciones.
          pool={teams.filter((x) => x.id !== myTeam.id)}
          // Semilla para que cada partida sea distinta.
          seed={randomSeed()}
        />
      )}
    </div>
  );
}
