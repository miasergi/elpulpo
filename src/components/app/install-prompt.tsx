"use client";

import { useEffect, useState } from "react";
import { X, Share, Plus } from "lucide-react";
import { PulpoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pulpo-install-dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (standalone) return;

    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    if (isIOS) {
      setIosHint(true);
      setOpen(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-[4.75rem] z-50 mx-auto max-w-md px-4 pb-safe">
      <div className="relative flex items-center gap-3 rounded-xl border border-pulpo-500/40 bg-surface-2/95 p-3 shadow-xl backdrop-blur-lg">
        <button
          onClick={dismiss}
          className="absolute right-2 top-2 text-muted-foreground"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
        <PulpoMark size={40} />
        <div className="min-w-0 flex-1 pr-4">
          <p className="text-sm font-semibold">Instala El Pulpo</p>
          {iosHint ? (
            <p className="text-xs text-muted">
              Pulsa <Share className="inline h-3 w-3" /> y luego <b>“Añadir a pantalla de inicio”</b>.
            </p>
          ) : (
            <p className="text-xs text-muted">Tenla en tu móvil como una app de verdad.</p>
          )}
        </div>
        {!iosHint && (
          <Button size="sm" onClick={install}>
            <Plus className="h-4 w-4" /> Instalar
          </Button>
        )}
      </div>
    </div>
  );
}
