"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "./google-button";

export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/app";
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const displayName = String(form.get("display_name")).trim();
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: String(form.get("email")),
      password: String(form.get("password")),
      options: {
        data: { display_name: displayName, full_name: displayName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message.includes("registered") ? "Ese email ya está registrado" : "No se pudo crear la cuenta");
      return;
    }
    // If email confirmation is on, there's no session yet.
    if (data.session) {
      router.push(next);
      router.refresh();
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-5xl">📬</div>
        <h1 className="text-2xl font-bold">Revisa tu correo</h1>
        <p className="text-sm text-muted">
          Te hemos enviado un enlace para confirmar tu cuenta. Ábrelo y vuelve para empezar a jugar.
        </p>
        <Link href="/login"><Button variant="secondary" size="full">Volver a entrar</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Crea tu cuenta</h1>
        <p className="mt-1 text-sm text-muted">Únete y empieza a predecir el Mundial 2026.</p>
      </div>

      <GoogleButton next={next} />

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> o con tu email <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="display_name">Tu nombre</Label>
          <Input id="display_name" name="display_name" required placeholder="Ej. Sergi" maxLength={40} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="tu@email.com" />
        </div>
        <div>
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={6} placeholder="Mínimo 6 caracteres" />
        </div>
        <Button type="submit" size="full" loading={loading}>Crear cuenta</Button>
      </form>

      <p className="text-center text-sm text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-pulpo-300">Entra aquí</Link>
      </p>
    </div>
  );
}
