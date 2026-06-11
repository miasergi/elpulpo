"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Upload, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GroupBadge } from "./group-badge";
import { GROUP_ICONS } from "./group-icon";

const COLORS = ["#fb7e3c", "#14b8a6", "#ff5c9d", "#22d3ee", "#f59e0b", "#a78bfa"];

/** Owner/admin edit of the group's name, description, icon, color and logo. */
export function GroupSettings({
  groupId,
  initial,
}: {
  groupId: string;
  initial: { name: string; description: string | null; icon: string; color: string; logo_url: string | null };
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [icon, setIcon] = useState(initial.icon);
  const [color, setColor] = useState(initial.color);
  const [logoUrl, setLogoUrl] = useState(initial.logo_url);

  function reset() {
    setName(initial.name);
    setDescription(initial.description ?? "");
    setIcon(initial.icon);
    setColor(initial.color);
    setLogoUrl(initial.logo_url);
    setEditing(false);
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      toast.error("Sube una imagen PNG, JPG o WEBP");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen debe pesar menos de 2 MB");
      return;
    }
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    // Stable-ish path with a cache-busting suffix from the file size.
    const path = `${groupId}/logo-${file.size}.${ext}`;
    const { error } = await supabase.storage
      .from("group-logos")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      setUploading(false);
      toast.error("No se pudo subir la imagen");
      return;
    }
    const { data } = supabase.storage.from("group-logos").getPublicUrl(path);
    setLogoUrl(`${data.publicUrl}?v=${Date.now()}`);
    setUploading(false);
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
      .update({ name: trimmed, description: description.trim() || null, icon, color, logo_url: logoUrl })
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
          <GroupBadge icon={icon} color={color} logoUrl={logoUrl} size={48} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{name}</p>
            <p className="truncate text-xs text-muted">{description || "Sin descripción"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-primary/40 bg-surface/60 p-4">
      <p className="text-sm font-medium text-muted">Editar grupo</p>

      {/* Logo + name */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="group relative shrink-0"
          title="Subir logo"
        >
          <GroupBadge icon={icon} color={color} logoUrl={logoUrl} size={56} />
          <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              <Upload className="h-5 w-5 text-white" />
            )}
          </span>
        </button>
        <div className="flex-1">
          <Label htmlFor="g-name">Nombre</Label>
          <Input id="g-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={onPickFile}
      />
      <div className="-mt-2 flex items-center gap-3 text-xs">
        <button type="button" onClick={() => fileInput.current?.click()} className="font-medium text-pulpo-300">
          {logoUrl ? "Cambiar logo" : "Subir logo personalizado"}
        </button>
        {logoUrl && (
          <button
            type="button"
            onClick={() => setLogoUrl(null)}
            className="flex items-center gap-1 text-muted-foreground"
          >
            <X className="h-3 w-3" /> Quitar logo
          </button>
        )}
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

      {/* Icon + color only matter when there's no custom logo. */}
      {!logoUrl && (
        <>
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
        </>
      )}

      <div className="flex gap-2">
        <Button size="sm" loading={saving} disabled={uploading} onClick={save} className="flex-1">
          Guardar cambios
        </Button>
        <Button size="sm" variant="outline" onClick={reset} className="flex-1">
          Cancelar
        </Button>
      </div>
    </div>
  );
}
