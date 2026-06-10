"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { X, Check, Users, Sparkles, Trophy, ChevronRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const KEY = "pulpo-onboarding-dismissed";

// Tiny external store over localStorage so dismissing re-renders without
// setState-in-effect (and the server snapshot renders nothing).
const listeners = new Set<() => void>();
const dismissStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  get: () => !!localStorage.getItem(KEY),
  getServer: () => true,
  dismiss() {
    localStorage.setItem(KEY, "1");
    listeners.forEach((l) => l());
  },
};

interface Step {
  Icon: LucideIcon;
  title: string;
  desc: string;
  done: boolean;
  href?: string;
}

/** First-steps checklist with real completion state. Hides itself when done. */
export function GettingStarted({
  hasGroup,
  hasPrediction,
  hasBonus,
}: {
  hasGroup: boolean;
  hasPrediction: boolean;
  hasBonus: boolean;
}) {
  const dismissed = useSyncExternalStore(dismissStore.subscribe, dismissStore.get, dismissStore.getServer);
  const allDone = hasGroup && hasPrediction && hasBonus;

  if (dismissed || allDone) return null;

  const steps: Step[] = [
    {
      Icon: Users,
      title: "Crea un grupo o únete a uno",
      desc: "Una porra privada con tus amigos: comparte el código y dentro.",
      done: hasGroup,
    },
    {
      Icon: Sparkles,
      title: "Predice los partidos",
      desc: "Pon tu marcador antes de que empiecen. Cada acierto suma.",
      done: hasPrediction,
      href: "/app/matches",
    },
    {
      Icon: Trophy,
      title: "Responde los bonus del torneo",
      desc: "Campeón, goleador, ganadores de grupo… puntos extra.",
      done: hasBonus,
      href: "/app/bonus",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="relative mt-6 overflow-hidden rounded-lg border border-pulpo-500/30 bg-surface/60 p-4">
      <button
        onClick={() => dismissStore.dismiss()}
        className="absolute right-2 top-2 text-muted-foreground"
        aria-label="Cerrar"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="mb-3 flex items-center justify-between pr-6">
        <p className="text-sm font-semibold">Primeros pasos</p>
        <span className="text-xs text-muted-foreground">{doneCount}/{steps.length}</span>
      </div>

      <div className="space-y-3">
        {steps.map((s) => {
          const inner = (
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  s.done ? "bg-pitch-500/20 text-pitch-400" : "bg-primary/15 text-primary"
                )}
              >
                {s.done ? <Check className="h-4 w-4" /> : <s.Icon className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium", s.done && "text-muted line-through")}>
                  {s.title}
                </p>
                {!s.done && <p className="text-xs text-muted">{s.desc}</p>}
              </div>
              {!s.done && s.href && (
                <ChevronRight className="mt-1.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </div>
          );
          return s.href && !s.done ? (
            <Link key={s.title} href={s.href} className="block">
              {inner}
            </Link>
          ) : (
            <div key={s.title}>{inner}</div>
          );
        })}
      </div>

      {!hasGroup && (
        <div className="mt-4 flex gap-2">
          <Link href="/app/groups/new" className="flex-1">
            <Button size="full" variant="primary">Crear grupo</Button>
          </Link>
          <Link href="/app/groups/join" className="flex-1">
            <Button size="full" variant="secondary">Tengo un código</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
