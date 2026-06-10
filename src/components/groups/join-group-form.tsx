"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("join_group_by_code", { code: code.trim() });
    setLoading(false);
    if (error || !data) {
      toast.error("Código no válido. Revísalo e inténtalo de nuevo.");
      return;
    }
    toast.success("¡Te has unido al grupo!");
    router.push(`/app/groups/${data}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 pt-4">
      <div className="rounded-lg border border-border bg-surface/50 p-5 text-center">
        <KeyRound className="mx-auto h-10 w-10 text-pulpo-300" />
        <p className="mt-3 text-sm text-muted">
          Pide a tu amigo el código de invitación del grupo y pégalo aquí.
        </p>
      </div>
      <div>
        <Label htmlFor="code">Código de invitación</Label>
        <Input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          autoCapitalize="characters"
          className="text-center text-lg font-bold tracking-[0.3em] uppercase"
          maxLength={10}
        />
      </div>
      <Button type="submit" size="full" loading={loading}>Unirme</Button>
    </form>
  );
}

export function JoinGroupForm() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
