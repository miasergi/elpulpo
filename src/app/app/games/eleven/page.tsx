import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BackHeader } from "@/components/app/back-header";
import { ElevenGame } from "@/components/games/eleven-game";
import { randomSeed, type TeamLite } from "@/lib/games/eleven";

export const dynamic = "force-dynamic";

export default async function ElevenPage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const { data: teamsRaw } = await supabase
    .from("teams")
    .select("id,name,code,flag_url")
    .order("name", { ascending: true });
  const teams: TeamLite[] = (teamsRaw ?? []).filter((t) => t.code);

  return (
    <div className="px-5">
      <BackHeader title="El 11 del mundial" />
      {teams.length < 11 ? (
        <p className="mt-12 text-center text-sm text-muted">No hay selecciones disponibles para jugar todavía.</p>
      ) : (
        <ElevenGame teams={teams} seed={randomSeed()} userAvatarUrl={profile.avatar_url ?? null} />
      )}
    </div>
  );
}
