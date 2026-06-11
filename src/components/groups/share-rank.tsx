"use client";

import { useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";

/** Share the player's group standing as an image (WhatsApp etc.). */
export function ShareRank({
  group,
  player,
  rank,
  total,
  of,
  played,
}: {
  group: string;
  player: string;
  rank: number;
  total: number;
  of: number;
  played: number;
}) {
  const [busy, setBusy] = useState(false);

  const imageUrl =
    `/api/og/rank?g=${encodeURIComponent(group)}&p=${encodeURIComponent(player)}` +
    `&r=${rank}&t=${total}&n=${of}&pl=${played}`;
  const text = `Voy ${rank}º de ${of} en "${group}" con ${total} pts 🐙 ¿Me ganas? elpulpo.vercel.app`;

  async function share() {
    setBusy(true);
    try {
      const abs = `${window.location.origin}${imageUrl}`;
      // Try sharing the actual image file (best on mobile / WhatsApp).
      try {
        const res = await fetch(abs);
        const blob = await res.blob();
        const file = new File([blob], "elpulpo-ranking.png", { type: "image/png" });
        const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
        if (nav.canShare?.({ files: [file] }) && navigator.share) {
          await navigator.share({ files: [file], text });
          return;
        }
      } catch {
        /* fall through to url/clipboard */
      }
      if (navigator.share) {
        await navigator.share({ text, url: window.location.origin });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success("Texto copiado · pégalo en WhatsApp");
    } catch {
      // user cancelled the share sheet — no error toast
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={share}
      disabled={busy}
      className="flex items-center justify-center gap-2 rounded-lg border border-pulpo-500/40 bg-pulpo-500/10 px-4 py-2.5 text-sm font-semibold text-pulpo-200 transition-colors hover:bg-pulpo-500/20 disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
      Compartir mi posición
    </button>
  );
}
