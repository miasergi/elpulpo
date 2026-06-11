"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Lock, Check } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { TeamFlag } from "@/components/match/team-flag";

interface UnderdogTeam {
  id: string;
  name: string;
  code: string | null;
  flag_url: string | null;
}

/** Pick one of the worst-ranked teams; all its matches score double for you. */
export function UnderdogPicker({
  teams,
  groupId,
  initialPick,
  closed,
}: {
  teams: UnderdogTeam[];
  groupId: string;
  initialPick: string | null;
  closed: boolean;
}) {
  const router = useRouter();
  const [pick, setPick] = useState<string | null>(initialPick);
  const [saving, setSaving] = useState(false);

  async function choose(teamId: string) {
    if (closed || saving) return;
    const next = teamId === pick ? null : teamId;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("set_underdog_pick", { gid: groupId, tid: next });
    setSaving(false);
    if (error) {
      toast.error(
        /cerrado/i.test(error.message) ? "El torneo ya ha empezado: tapado cerrado" : "No se pudo guardar"
      );
      return;
    }
    setPick(next);
    if (next) {
      const name = teams.find((t) => t.id === next)?.name;
      toast.success(`${name} es tu tapado: sus partidos te valen doble`);
    } else {
      toast.success("Tapado quitado");
    }
    router.refresh();
  }

  if (teams.length === 0) return null;

  return (
    <div className="rounded-lg border border-warning/40 bg-warning/5 p-4">
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-2 font-medium">
          <Zap className="h-4 w-4 text-warning" /> Tu tapado
        </span>
        <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-bold text-warning">
          x2 puntos
        </span>
      </div>
      <p className="mb-3 text-xs text-muted">
        Elige una de las selecciones más débiles: todas tus predicciones de sus partidos
        valen doble en este grupo. {closed ? "" : "Puedes cambiarlo hasta que empiece el torneo."}
      </p>

      <div className="grid grid-cols-5 gap-2">
        {teams.map((t) => {
          const selected = t.id === pick;
          return (
            <button
              key={t.id}
              onClick={() => choose(t.id)}
              disabled={closed || saving}
              title={t.name}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors disabled:opacity-60",
                selected
                  ? "border-warning bg-warning/15"
                  : "border-border bg-surface/60 hover:border-warning/50"
              )}
            >
              {selected && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-warning text-background">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <TeamFlag team={t} size={28} />
              <span className="w-full truncate text-center text-[10px] font-medium">
                {t.code ?? t.name}
              </span>
            </button>
          );
        })}
      </div>

      {closed && (
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" /> El torneo ya ha empezado: el tapado está cerrado.
        </p>
      )}
    </div>
  );
}
