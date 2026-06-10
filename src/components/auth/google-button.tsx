"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function GoogleButton({ next }: { next?: string }) {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback${
      next ? `?next=${encodeURIComponent(next)}` : ""
    }`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      toast.error("No se pudo conectar con Google");
      setLoading(false);
    }
  }

  return (
    <Button variant="secondary" size="full" onClick={signIn} loading={loading} type="button">
      {!loading && (
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#FFC107"
            d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 7.4 29.3 5.5 24 5.5 13.8 5.5 5.5 13.8 5.5 24S13.8 42.5 24 42.5 42.5 34.2 42.5 24c0-1.2-.1-2.3-.3-3.5z"
          />
          <path
            fill="#FF3D00"
            d="M6.3 13.2l6.6 4.8C14.7 14.1 19 11.5 24 11.5c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 7.4 29.3 5.5 24 5.5 16.3 5.5 9.7 9.9 6.3 13.2z"
          />
          <path
            fill="#4CAF50"
            d="M24 42.5c5.2 0 9.9-2 13.5-5.2l-6.2-5.3c-2 1.5-4.6 2.3-7.3 2.3-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.6 38 16.2 42.5 24 42.5z"
          />
          <path
            fill="#1976D2"
            d="M43.6 20.5H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.3C41.2 36.6 42.5 30.7 42.5 24c0-1.2-.1-2.3-.3-3.5z"
          />
        </svg>
      )}
      Continuar con Google
    </Button>
  );
}
