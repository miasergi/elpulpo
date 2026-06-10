"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { soundEnabled, setSoundEnabled, playTick } from "@/lib/sound";
import { cn } from "@/lib/utils";

export function SoundToggle() {
  const [on, setOn] = useState(true);

  useEffect(() => setOn(soundEnabled()), []);

  function toggle() {
    const next = !on;
    setOn(next);
    setSoundEnabled(next);
    if (next) playTick("success");
  }

  return (
    <button
      onClick={toggle}
      className="flex w-full items-center justify-between rounded-lg border border-border bg-surface/50 p-4"
    >
      <span className="flex items-center gap-3 text-sm font-medium">
        {on ? <Volume2 className="h-5 w-5 text-pulpo-300" /> : <VolumeX className="h-5 w-5 text-muted-foreground" />}
        Sonidos de la app
      </span>
      <span
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          on ? "bg-primary" : "bg-surface-3"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
            on ? "translate-x-[1.4rem]" : "translate-x-0.5"
          )}
        />
      </span>
    </button>
  );
}
