"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PushToggle } from "./push-toggle";
import { StatsGrid } from "./stats-grid";
import { AchievementsGrid } from "./achievements-grid";
import { computeAchievements } from "@/lib/achievements";
import type { PlayerStats } from "@/lib/stats";

export function ProfileForm({
  profile,
  groupCount,
  stats,
}: {
  profile: {
    id: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
    favorite_team: string | null;
    email: string;
  };
  groupCount: number;
  stats: PlayerStats;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [favTeam, setFavTeam] = useState(profile.favorite_team ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim(), favorite_team: favTeam.trim() || null })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar");
      return;
    }
    toast.success("Perfil actualizado");
    router.refresh();
  }

  return (
    <div className="space-y-6 pb-8 pt-2">
      <div className="flex flex-col items-center">
        <Avatar src={profile.avatar_url} name={displayName} size={88} />
        <p className="mt-3 text-lg font-bold">{displayName}</p>
        <p className="text-sm text-muted">@{profile.username}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {groupCount} {groupCount === 1 ? "grupo" : "grupos"}
        </p>
      </div>

      <StatsGrid stats={stats} />

      <AchievementsGrid achievements={computeAchievements(stats)} />

      <div className="space-y-4">
        <div>
          <Label htmlFor="dn">Nombre visible</Label>
          <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} />
        </div>
        <div>
          <Label htmlFor="ft">Equipo favorito (opcional)</Label>
          <Input id="ft" value={favTeam} onChange={(e) => setFavTeam(e.target.value)} placeholder="Ej. España" maxLength={40} />
        </div>
        <div>
          <Label htmlFor="em">Email</Label>
          <Input id="em" value={profile.email} disabled />
        </div>
        <Button size="full" onClick={save} loading={saving}>Guardar cambios</Button>
      </div>

      <div className="rounded-lg border border-border bg-surface/50 p-4">
        <p className="mb-1 text-sm font-medium">Notificaciones</p>
        <p className="mb-3 text-xs text-muted">Te avisamos antes de que cierren los partidos.</p>
        <PushToggle userId={profile.id} />
      </div>

      <form action="/auth/signout" method="post">
        <Button type="submit" variant="outline" size="full">
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">El Pulpo · v0.1 🐙</p>
    </div>
  );
}
