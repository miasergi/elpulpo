"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SyncButton() {
  const [loading, setLoading] = useState<"matches" | "squads" | null>(null);
  const router = useRouter();

  async function sync(kind: "matches" | "squads") {
    setLoading(kind);
    const res = await fetch(`/api/admin/sync${kind === "squads" ? "?squads=1" : ""}`, {
      method: "POST",
    });
    const json = await res.json();
    setLoading(null);
    if (json.ok) {
      toast.success(
        kind === "squads"
          ? `Plantillas: ${json.players} jugadores de ${json.teams} selecciones`
          : `Sincronizado: ${json.matches} partidos, ${json.teams} equipos`
      );
      router.refresh();
    } else {
      toast.error(json.error || "Error al sincronizar");
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={() => sync("matches")} loading={loading === "matches"} size="full" variant="primary">
        <RefreshCw className="h-4 w-4" /> Sincronizar partidos
      </Button>
      <Button onClick={() => sync("squads")} loading={loading === "squads"} size="full" variant="secondary">
        <Users className="h-4 w-4" /> Sincronizar plantillas (FIFA)
      </Button>
    </div>
  );
}
