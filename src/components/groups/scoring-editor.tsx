"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Target, CircleCheck, Pencil, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FIELDS: { key: "pts_exact" | "pts_result"; label: string; Icon: LucideIcon }[] = [
  { key: "pts_exact", label: "Marcador exacto", Icon: Target },
  { key: "pts_result", label: "Acertar resultado (1X2)", Icon: CircleCheck },
];

/** Group scoring rules; the owner can edit them in place. */
export function ScoringEditor({
  groupId,
  initial,
  canEdit,
}: {
  groupId: string;
  initial: { pts_exact: number; pts_goal_diff: number; pts_result: number };
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState(initial);

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("groups").update(values).eq("id", groupId);
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar la puntuación");
      return;
    }
    toast.success("Puntuación actualizada para todo el grupo");
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border bg-surface/50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-muted">Sistema de puntos</p>
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs font-medium text-pulpo-300"
          >
            <Pencil className="h-3 w-3" /> Editar
          </button>
        )}
      </div>

      <div className="space-y-1.5 text-sm">
        {FIELDS.map(({ key, label, Icon }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-pulpo-300" /> {label}
            </span>
            {editing ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={values[key]}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      [key]: Math.max(0, Math.min(50, Number(e.target.value) || 0)),
                    }))
                  }
                  className="h-9 w-16 text-center"
                />
                <span className="text-xs text-muted-foreground">pts</span>
              </div>
            ) : (
              <span className="font-bold text-pitch-400">+{values[key]} pts</span>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" loading={saving} onClick={save} className="flex-1">
            Guardar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setValues(initial);
              setEditing(false);
            }}
            className="flex-1"
          >
            Cancelar
          </Button>
        </div>
      )}

      {editing && (
        <p className="mt-2 text-xs text-muted-foreground">
          Los cambios recalculan la clasificación de todo el grupo al instante.
        </p>
      )}
    </div>
  );
}
