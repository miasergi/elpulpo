"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Plus, LogIn, Users } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GroupBadge } from "./group-badge";

export interface SwitcherGroup {
  id: string;
  name: string;
  icon: string;
  color: string;
  logo_url: string | null;
}

/** Biwenger-style league switcher: pick which group the whole app shows. */
export function GroupSwitcher({
  groups,
  activeGroupId,
  userId,
}: {
  groups: SwitcherGroup[];
  activeGroupId: string | null;
  userId: string;
}) {
  const router = useRouter();
  const [switching, setSwitching] = useState<string | null>(null);

  async function activate(groupId: string) {
    if (groupId === activeGroupId || switching) return;
    setSwitching(groupId);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ active_group_id: groupId })
      .eq("id", userId);
    setSwitching(null);
    if (error) {
      toast.error("No se pudo cambiar de grupo");
      return;
    }
    const name = groups.find((g) => g.id === groupId)?.name;
    toast.success(name ? `Ahora juegas en ${name}` : "Grupo cambiado");
    router.refresh();
  }

  return (
    <section className="mt-6">
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <Users className="h-4 w-4 text-pulpo-300" /> Mis grupos
      </h2>
      <p className="mb-2 text-xs text-muted">
        Cada grupo tiene sus propias predicciones. Elige cuál quieres ver y jugar.
      </p>

      <div className="space-y-1.5">
        {groups.map((g) => {
          const active = g.id === activeGroupId;
          return (
            <button
              key={g.id}
              onClick={() => activate(g.id)}
              disabled={switching !== null}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                active ? "border-primary/60 bg-primary/10" : "border-border bg-surface/50"
              )}
            >
              <GroupBadge icon={g.icon} color={g.color} logoUrl={g.logo_url} size={40} rounded="rounded-lg" />
              <span className={cn("min-w-0 flex-1 truncate font-medium", active && "text-pulpo-200")}>
                {g.name}
              </span>
              {active ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-pitch-400">
                  <Check className="h-3.5 w-3.5" /> Activo
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {switching === g.id ? "Cambiando…" : "Tocar para jugar aquí"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Link href="/app/groups/new">
          <Button size="full" variant="secondary"><Plus className="h-4 w-4" /> Crear grupo</Button>
        </Link>
        <Link href="/app/groups/join">
          <Button size="full" variant="outline"><LogIn className="h-4 w-4" /> Unirme</Button>
        </Link>
      </div>
    </section>
  );
}
