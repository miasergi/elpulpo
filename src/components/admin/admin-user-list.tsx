"use client";

import { useState } from "react";
import { Gem } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface AdminUser {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  is_pro: boolean;
}

/** Admin: hand-pick which users get the Pro (ad-free) tier. */
export function AdminUserList({ users }: { users: AdminUser[] }) {
  const [rows, setRows] = useState(users);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(user: AdminUser) {
    setBusy(user.id);
    const res = await fetch("/api/admin/pro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, isPro: !user.is_pro }),
    });
    setBusy(null);
    if (!res.ok) {
      toast.error("No se pudo cambiar el plan");
      return;
    }
    setRows((rs) => rs.map((r) => (r.id === user.id ? { ...r, is_pro: !user.is_pro } : r)));
    toast.success(!user.is_pro ? `${user.display_name} ahora es Pro` : `${user.display_name} vuelve al plan gratis`);
  }

  return (
    <div className="space-y-1.5">
      {rows.map((u) => (
        <div
          key={u.id}
          className="flex items-center gap-3 rounded-lg border border-border bg-surface/50 p-2.5"
        >
          <Avatar src={u.avatar_url} name={u.display_name} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{u.display_name}</p>
            <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
          </div>
          <button
            onClick={() => toggle(u)}
            disabled={busy === u.id}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
              u.is_pro
                ? "border-pitch-500/60 bg-pitch-500/15 text-pitch-400"
                : "border-border bg-surface-2 text-muted-foreground"
            )}
          >
            <Gem className="h-3.5 w-3.5" />
            {busy === u.id ? "…" : u.is_pro ? "Pro" : "Gratis"}
          </button>
        </div>
      ))}
    </div>
  );
}
