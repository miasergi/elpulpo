"use client";

import { useEffect, useState } from "react";
import { X, Share, Plus } from "lucide-react";
import { PulpoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DONE_KEY = "pulpo-install-done"; // installed or permanently dismissed
const SNOOZE_KEY = "pulpo-install-snooze-until"; // re-offer after this timestamp
const VISITS_KEY = "pulpo-install-visits"; // only offer from the 2nd visit on

const SNOOZE_DAYS = 30;

function shouldOffer(): boolean {
  if (localStorage.getItem(DONE_KEY)) return false;

  const snoozeUntil = Number(localStorage.getItem(SNOOZE_KEY) || 0);
  if (Date.now() < snoozeUntil) return false;

  // Count one visit per browser session; don't nag on the very first visit.
  let visits = Number(localStorage.getItem(VISITS_KEY) || 0);
  if (!sessionStorage.getItem("pulpo-visit-counted")) {
    sessionStorage.setItem("pulpo-visit-counted", "1");
    visits += 1;
    localStorage.setItem(VISITS_KEY, String(visits));
  }
  return visits >= 2;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (standalone) {
      localStorage.setItem(DONE_KEY, "1");
      return;
    }

    const onInstalled = () => {
      localStorage.setItem(DONE_KEY, "1");
      setOpen(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    if (!shouldOffer()) return () => window.removeEventListener("appinstalled", onInstalled);

    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    if (isIOS) {
      // Deferred so the page settles before the hint slides in.
      const t = setTimeout(() => {
        setIosHint(true);
        setOpen(true);
      }, 1500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function snooze() {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86_400_000));
    setOpen(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(DONE_KEY, "1");
      setOpen(false);
    } else {
      snooze();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-[4.75rem] z-50 mx-auto max-w-md px-4 pb-safe">
      <div className="relative flex items-center gap-3 rounded-xl border border-pulpo-500/40 bg-surface-2/95 p-3 shadow-xl backdrop-blur-lg">
        <button
          onClick={snooze}
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
