"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SyncNowButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function sync() {
    setLoading(true);
    const res = await fetch("/api/admin/sync", { method: "POST" });
    const json = await res.json();
    setLoading(false);
    if (json.ok) {
      toast.success(`Sincronizado: ${json.matches} partidos`);
      router.refresh();
    } else {
      toast.error(json.error || "Error al sincronizar");
    }
  }

  return (
    <Button onClick={sync} loading={loading} size="full" variant="secondary">
      <RefreshCw className="h-4 w-4" /> Sincronizar partidos ahora
    </Button>
  );
}
