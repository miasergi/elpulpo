"use client";

import { useEffect } from "react";
import { playTick, haptic } from "@/lib/sound";

const INTERACTIVE = "button, a, [role='button'], input[type='submit'], label[for], summary, .sound-tap";

/** Plays a subtle click + light haptic on any interactive tap, app-wide. */
export function SoundFx() {
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const hit = el.closest(INTERACTIVE) as HTMLElement | null;
      if (!hit || hit.hasAttribute("disabled") || hit.getAttribute("aria-disabled") === "true") return;
      const success = hit.dataset.sound === "success";
      playTick(success ? "success" : "tap");
      haptic(success ? 14 : 7);
    }
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return null;
}
