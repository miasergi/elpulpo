"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const KEY = "pulpo-howto-dismissed";

const steps = [
  { n: "1", emoji: "👥", title: "Crea o únete a un grupo", desc: "Con un código invitas a tus amigos." },
  { n: "2", emoji: "🔮", title: "Predice los partidos", desc: "Pon tu marcador antes de que empiecen." },
  { n: "3", emoji: "🏆", title: "Suma puntos y gana", desc: "Cuanto más afines, más puntos. ¡A por el nº 1!" },
];

export function HowToPlay() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!localStorage.getItem(KEY));
  }, []);

  if (!show) return null;

  return (
    <div className="relative mt-6 overflow-hidden rounded-lg border border-pulpo-500/30 bg-surface/60 p-4">
      <button
        onClick={() => {
          localStorage.setItem(KEY, "1");
          setShow(false);
        }}
        className="absolute right-2 top-2 text-muted-foreground"
        aria-label="Cerrar"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="mb-3 text-sm font-semibold">¿Cómo se juega? 🐙</p>
      <div className="space-y-3">
        {steps.map((s) => (
          <div key={s.n} className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-base">
              {s.emoji}
            </div>
            <div>
              <p className="text-sm font-medium">{s.title}</p>
              <p className="text-xs text-muted">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
