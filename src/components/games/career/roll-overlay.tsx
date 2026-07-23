"use client";

import { useEffect, useState } from "react";
import { Check, DoorOpen, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fillPlaceholders, type OutcomeText } from "@/lib/games/career/text";

/** Lo que hay que animar tras una decisión con azar. */
export type Roll =
  | {
      kind: "event";
      positive: OutcomeText;
      negative: OutcomeText;
      /** Qué salió de verdad. */
      result: "positive" | "negative" | "neutral";
      values: Record<string, string | undefined>;
    }
  | { kind: "exit"; accepted: boolean };

/**
 * Suspense de dados: parpadea entre las dos posibilidades unas cuantas veces
 * y aterriza en la que tocó, para que se sienta la suerte antes de ver el
 * resultado. Al terminar llama a `onDone`.
 */
export function RollOverlay({ roll, onDone }: { roll: Roll; onDone: () => void }) {
  const [phase, setPhase] = useState<"rolling" | "done">("rolling");
  const [flash, setFlash] = useState(0);

  const landed = roll.kind === "exit" ? (roll.accepted ? "positive" : "negative") : roll.result;

  useEffect(() => {
    // Parpadeo cada 130 ms; a los ~1,2 s se fija el resultado y se espera un
    // poco antes de continuar.
    let ticks = 0;
    const spin = setInterval(() => {
      ticks += 1;
      setFlash((f) => f + 1);
      if (ticks >= 9) {
        clearInterval(spin);
        setPhase("done");
      }
    }, 130);
    return () => clearInterval(spin);
  }, []);

  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(onDone, 1150);
    return () => clearTimeout(t);
  }, [phase, onDone]);

  const highlight = phase === "done" ? landed : flash % 2 === 0 ? "positive" : "negative";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-6 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-widest text-pulpo-300">
          {phase === "rolling" ? "Suerte…" : landed === "positive" ? "¡Bien!" : "Vaya…"}
        </p>

        {roll.kind === "exit" ? (
          <ExitFaces highlight={highlight} settled={phase === "done"} />
        ) : (
          <EventFaces roll={roll} highlight={highlight} settled={phase === "done"} />
        )}
      </div>
    </div>
  );
}

function EventFaces({
  roll,
  highlight,
  settled,
}: {
  roll: Extract<Roll, { kind: "event" }>;
  highlight: "positive" | "negative" | "neutral";
  settled: boolean;
}) {
  return (
    <div className="mt-4 space-y-2.5">
      <Face
        tone="positive"
        active={highlight === "positive"}
        settled={settled}
        probability={roll.positive.probability}
        text={fillPlaceholders(roll.positive.text, roll.values)}
      />
      <Face
        tone="negative"
        active={highlight === "negative"}
        settled={settled}
        probability={roll.negative.probability}
        text={fillPlaceholders(roll.negative.text, roll.values)}
      />
    </div>
  );
}

function ExitFaces({ highlight, settled }: { highlight: "positive" | "negative" | "neutral"; settled: boolean }) {
  return (
    <div className="mt-4 space-y-2.5">
      <Face tone="positive" active={highlight === "positive"} settled={settled} text="El club te deja salir" icon={<DoorOpen className="h-4 w-4" />} />
      <Face tone="negative" active={highlight === "negative"} settled={settled} text="El club te retiene" icon={<Lock className="h-4 w-4" />} />
    </div>
  );
}

function Face({
  tone,
  active,
  settled,
  probability,
  text,
  icon,
}: {
  tone: "positive" | "negative";
  active: boolean;
  settled: boolean;
  probability?: number;
  text: string;
  icon?: React.ReactNode;
}) {
  const good = tone === "positive";
  const dim = settled && !active;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3 transition-all duration-150",
        active
          ? good
            ? "scale-[1.03] border-pitch-400 bg-pitch-500/20"
            : "scale-[1.03] border-danger bg-danger/15"
          : "border-border bg-surface-2/50",
        dim && "opacity-35"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          good ? "bg-pitch-500/25 text-pitch-400" : "bg-danger/20 text-danger"
        )}
      >
        {icon ?? (good ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />)}
      </span>
      {probability != null && (
        <span className="shrink-0 rounded bg-surface-3/80 px-1.5 py-0.5 text-[11px] font-bold tabular-nums">
          {probability}%
        </span>
      )}
      <span className="min-w-0 flex-1 text-left text-sm font-medium">{text}</span>
    </div>
  );
}
