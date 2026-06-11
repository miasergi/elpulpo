"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamFlag } from "@/components/match/team-flag";

export interface PickerTeam {
  id: string;
  name: string;
  code: string | null;
  flag_url: string | null;
}

/** Team select with badges (native <select> can't render images). */
export function TeamPicker({
  teams,
  value,
  onChange,
  disabled = false,
  placeholder = "Elige un equipo…",
}: {
  teams: PickerTeam[];
  value: string;
  onChange: (teamId: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = teams.find((t) => t.id === value) ?? null;

  // Close when tapping outside.
  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const visible = query
    ? teams.filter((t) =>
        `${t.name} ${t.code ?? ""}`.toLowerCase().includes(query.toLowerCase())
      )
    : teams;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((o) => !o);
          setQuery("");
        }}
        className={cn(
          "flex h-12 w-full items-center gap-2.5 rounded-md border border-border bg-surface-2 px-3 text-left text-sm disabled:opacity-60",
          open && "border-primary/60"
        )}
      >
        {selected ? (
          <>
            <TeamFlag team={selected} size={24} />
            <span className="flex-1 truncate font-medium">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-border bg-surface shadow-xl">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar selección…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="text-muted-foreground"
                aria-label="Quitar selección"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {visible.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</li>
            ) : (
              visible.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(t.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-2",
                      t.id === value && "bg-primary/10 text-pulpo-200"
                    )}
                  >
                    <TeamFlag team={t} size={22} />
                    <span className="truncate">{t.name}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
