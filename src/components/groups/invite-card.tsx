"use client";

import { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function InviteCard({ code, groupName }: { code: string; groupName: string }) {
  const [copied, setCopied] = useState(false);

  const link =
    typeof window !== "undefined" ? `${window.location.origin}/app/groups/join?code=${code}` : "";

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Código copiado");
    setTimeout(() => setCopied(false), 1500);
  }

  async function share() {
    const text = `¡Únete a "${groupName}" en El Pulpo! 🐙 Usa el código ${code} o entra aquí:`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "El Pulpo", text, url: link });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(`${text} ${link}`);
      toast.success("Invitación copiada");
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface/60 p-4">
      <p className="text-sm font-medium text-muted">Invita a tus amigos</p>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 rounded-md border border-dashed border-border bg-surface-2 py-3 text-center text-2xl font-bold tracking-[0.3em]">
          {code}
        </div>
        <Button variant="secondary" size="icon" onClick={copy} aria-label="Copiar código">
          {copied ? <Check className="h-5 w-5 text-pitch-400" /> : <Copy className="h-5 w-5" />}
        </Button>
      </div>
      <Button variant="primary" size="full" className="mt-3" onClick={share}>
        <Share2 className="h-4 w-4" /> Compartir invitación
      </Button>
    </div>
  );
}
