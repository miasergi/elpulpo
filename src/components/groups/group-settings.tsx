"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GroupIcon, GROUP_ICONS } from "./group-icon";

const COLORS = ["#fb7e3c", "#14b8a6", "#ff5c9d", "#22d3ee", "#f59e0b", "#a78bfa"];

/** Owner/admin edit of the group's name, description, icon and color. */
export function GroupSettings({
  groupId,
  initial,
}: {
  groupId: string;
  initial: { name: string; description: string | null; icon: string; color: string };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [icon, setIcon] = useState(initial.icon);
  const [color, setColor] = useState(initial.color);

  function reset() {
    setName(initial.name);
    setDescription(initial.description ?? "");
    setIcon(initial.icon);
    setColor(initial.color);
    setEditing(false);
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("El grupo necesita un nombre");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("groups")
      .update({ name: trimmed, description: description.trim() || null, icon, color })
      .eq("id", groupId);
    setSaving(false);
    if (error) {
      toast.error("No se pudieron guardar los cambios");
      return;
    }
    toast.success("Grupo actualizado");
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="rounded-lg border border-border bg-surface/50 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted">Datos del grupo</p>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs font-medium text-pulpo-300"
          >
            <Pencil className="h-3 w-3" /> Editar
          </button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${color}22` }}
          >
            <GroupIcon name={icon} size={24} color={color} />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{name}</p>
            <p className="truncate text-xs text-muted">
              {description || "Sin descripción"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-primary/40 bg-surface/60 p-4">
      <p className="text-sm font-medium text-muted">Editar grupo</p>

      <div className="flex items-center gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}22` }}
        >
          <GroupIcon name={icon} size={28} color={color} />
        </div>
        <div className="flex-1">
          <Label htmlFor="g-name">Nombre</Label>
          <Input id="g-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>

      <div>
        <Label htmlFor="g-desc">Descripción</Label>
        <Input
          id="g-desc"
          value={description}
          maxLength={120}
          placeholder="El que pierde paga las cervezas"
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <Label>Icono</Label>
        <div className="flex flex-wrap gap-2">
          {GROUP_ICONS.map(({ key, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setIcon(key)}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-lg border transition-colors",
                icon === key ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface-2 text-muted"
              )}
            >
              <Icon size={20} />
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

      <div className="flex gap-2">
        <Button size="sm" loading={saving} onClick={save} className="flex-1">
          Guardar cambios
        </Button>
        <Button size="sm" variant="outline" onClick={reset} className="flex-1">
          Cancelar
        </Button>
      </div>
    </div>
  );
}
