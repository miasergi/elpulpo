"use client";

import { useEffect, useRef, useState } from "react";
import { User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Suggestion {
  name: string;
  team: string | null;
  nationality: string | null;
  photo: string | null;
}

/** Free-text answer input with player-name autocomplete. */
export function PlayerInput({
  value,
  onChange,
  onPick,
  onBlurSave,
  disabled = false,
  placeholder = "Escribe un jugador…",
}: {
  value: string;
  onChange: (v: string) => void;
  /** Called when the user picks a suggestion (should also save). */
  onPick: (name: string) => void;
  /** Called on blur with the current text (existing save-on-blur behaviour). */
  onBlurSave: () => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const picked = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Debounced lookup while typing.
  useEffect(() => {
    if (disabled) return;
    if (timer.current) clearTimeout(timer.current);
    const q = value.trim();
    if (q.length < 3 || picked.current) {
      picked.current = false;
      setSuggestions([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/players/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const { players } = (await res.json()) as { players: Suggestion[] };
        setSuggestions(players);
        setOpen(players.length > 0);
      } catch {
        // network hiccup — just skip suggestions
      }
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, disabled]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          // Let a suggestion tap win over blur-save.
          setTimeout(() => {
            if (!picked.current) onBlurSave();
          }, 150);
        }}
        placeholder={placeholder}
      />
      {open && (
        <ul className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-xl">
          {suggestions.map((s) => (
            <li key={`${s.name}-${s.team}`}>
              <button
                type="button"
                onPointerDown={() => {
                  picked.current = true;
                }}
                onClick={() => {
                  setOpen(false);
                  setSuggestions([]);
                  onPick(s.name);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-2"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-3">
                  {s.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.photo} alt="" className="h-full w-full object-cover object-top" loading="lazy" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{s.name}</span>
                  <span className={cn("block truncate text-xs text-muted-foreground")}>
                    {[s.team, s.nationality].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
