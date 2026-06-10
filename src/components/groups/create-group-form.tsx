"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { generateInviteCode, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ICONS = ["🐙", "⚽", "🏆", "🔥", "🦁", "🐉", "👑", "🎯", "💪", "🚀"];
const COLORS = ["#7c3aed", "#22c55e", "#ef4444", "#f59e0b", "#38bdf8", "#ec4899"];

export function CreateGroupForm({
  competitionId,
  competitionName,
}: {
  competitionId: string;
  competitionName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [icon, setIcon] = useState("🐙");
  const [color, setColor] = useState("#7c3aed");
  const [showScoring, setShowScoring] = useState(false);
  const [scoring, setScoring] = useState({ exact: 5, diff: 3, result: 2 });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name")).trim();
    if (!name) return;
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("create_group", {
      p_name: name,
      p_competition_id: competitionId,
      p_invite_code: generateInviteCode(),
      p_description: String(form.get("description") || "") || null,
      p_color: color,
      p_icon: icon,
      p_pts_exact: scoring.exact,
      p_pts_goal_diff: scoring.diff,
      p_pts_result: scoring.result,
    });
    setLoading(false);
    if (error || !data) {
      toast.error("No se pudo crear el grupo");
      return;
    }
    toast.success("¡Grupo creado! 🐙");
    router.push(`/app/groups/${data}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 pb-8">
      {/* Preview */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface/60 p-4">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-xl text-3xl"
          style={{ backgroundColor: `${color}22` }}
        >
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted">Competición</p>
          <p className="font-semibold">{competitionName}</p>
        </div>
      </div>

      <div>
        <Label htmlFor="name">Nombre del grupo</Label>
        <Input id="name" name="name" required maxLength={40} placeholder="Ej. La porra de los amigos" />
      </div>

      <div>
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Input id="description" name="description" maxLength={120} placeholder="El que pierde paga las cervezas 🍺" />
      </div>

      <div>
        <Label>Icono</Label>
        <div className="flex flex-wrap gap-2">
          {ICONS.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIcon(i)}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-lg border text-xl transition-colors",
                icon === i ? "border-primary bg-primary/15" : "border-border bg-surface-2"
              )}
            >
              {i}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Color</Label>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                "h-9 w-9 rounded-full border-2 transition-transform",
                color === c ? "scale-110 border-white" : "border-transparent"
              )}
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </div>

      {/* Advanced scoring */}
      <div className="rounded-lg border border-border bg-surface/50">
        <button
          type="button"
          onClick={() => setShowScoring((s) => !s)}
          className="flex w-full items-center justify-between p-4 text-sm font-medium"
        >
          Sistema de puntos
          <ChevronDown className={cn("h-4 w-4 transition-transform", showScoring && "rotate-180")} />
        </button>
        {showScoring && (
          <div className="space-y-3 border-t border-border p-4">
            {([
              ["exact", "🎯 Marcador exacto"],
              ["diff", "📊 Diferencia de goles"],
              ["result", "✅ Ganador (1X2)"],
            ] as const).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm">{label}</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={scoring[key]}
                    onChange={(e) =>
                      setScoring((s) => ({ ...s, [key]: Math.max(0, Number(e.target.value)) }))
                    }
                    className="h-9 w-16 text-center"
                  />
                  <span className="text-xs text-muted-foreground">pts</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button type="submit" size="full" loading={loading}>Crear grupo</Button>
    </form>
  );
}
