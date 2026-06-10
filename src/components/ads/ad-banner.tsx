"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT; // ca-pub-XXXXXXXX
const SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT; // display ad unit id

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/** Responsive AdSense display unit. Renders nothing until the env vars are
 *  set (account approved). Callers hide it for Pro users. */
export function AdBanner({ className }: { className?: string }) {
  const ref = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!CLIENT || !SLOT || !ref.current) return;
    // Each <ins> must be pushed exactly once.
    if (ref.current.getAttribute("data-ad-status")) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense not ready / blocked — fail silently.
    }
  }, []);

  if (!CLIENT || !SLOT) return null;

  return (
    <div className={cn("overflow-hidden rounded-lg", className)}>
      <ins
        ref={ref}
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={CLIENT}
        data-ad-slot={SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
