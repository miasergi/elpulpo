"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TeamPicker } from "@/components/bonus/team-picker";
import { cn } from "@/lib/utils";

interface Team {
  id: string;
  name: string;
  code: string | null;
  flag_url: string | null;
}

interface Market {
  id: string;
  label: string;
  kind: string;
  points: number;
  resolved: boolean;
  correct_team_id: string | null;
  correct_text: string | null;
}

export interface MarketAnswer {
  answer: string;
  count: number;
}

export function AdminBonusList({
  markets,
  teams,
  answers,
}: {
  markets: Market[];
  teams: Team[];
  /** Distinct user answers per text market, with how many people gave each. */
  answers: Record<string, MarketAnswer[]>;
}) {
  return (
    <div className="space-y-2">
      {markets.map((m) => (
        <AdminBonusRow key={m.id} market={m} teams={teams} given={answers[m.id] ?? []} />
      ))}
    </div>
  );
}

function AdminBonusRow({ market, teams, given }: { market: Market; teams: Team[]; given: MarketAnswer[] }) {
  const [teamId, setTeamId] = useState(market.correct_team_id ?? "");
  const [text, setText] = useState(market.correct_text ?? "");
  const [resolved, setResolved] = useState(market.resolved);
  const [saving, setSaving] = useState(false);

  // Valid answers are pipe-separated; tapping a chip toggles it.
  const accepted = text.split("|").map((s) => s.trim().toLowerCase()).filter(Boolean);

  function toggleAnswer(answer: string) {
    const key = answer.trim().toLowerCase();
    const list = text.split("|").map((s) => s.trim()).filter(Boolean);
    const next = accepted.includes(key)
      ? list.filter((s) => s.toLowerCase() !== key)
      : [...list, answer.trim()];
    setText(next.join("|"));
  }

  async function save(markResolved: boolean) {
    setSaving(true);
    const res = await fetch("/api/admin/bonus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: market.id,
        correct_team_id: market.kind === "team" ? teamId || null : null,
        correct_text: market.kind === "text" ? text || null : null,
        resolved: markResolved,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setResolved(markResolved);
      toast.success(markResolved ? "Bonus resuelto: puntos otorgados" : "Guardado");
    } else toast.error("Error al guardar");
  }

  return (
    <div className="rounded-lg border border-border bg-surface/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">{market.label}</span>
        <span className="flex items-center gap-1.5">
          <Badge variant="accent">+{market.points}</Badge>
          {resolved ? <Badge variant="success">Resuelto</Badge> : <Badge variant="warning">Pendiente</Badge>}
        </span>
      </div>

      {market.kind === "team" ? (
        <TeamPicker teams={teams} value={teamId} onChange={setTeamId} placeholder="Elige el equipo correcto…" />
      ) : (
        <>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Respuesta(s) correcta(s), separadas por |"
            className="h-10"
          />
          {given.length > 0 && (
            <div className="mt-2">
              <p className="mb-1 text-[11px] text-muted-foreground">
                Respuestas de la gente · toca las que des por buenas:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {given.map((g) => {
                  const on = accepted.includes(g.answer.trim().toLowerCase());
                  return (
                    <button
                      key={g.answer}
                      type="button"
                      onClick={() => toggleAnswer(g.answer)}
                      className={cn(
                        "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                        on
                          ? "border-pitch-500/60 bg-pitch-500/15 text-pitch-400"
                          : "border-border bg-surface-2 text-muted"
                      )}
                    >
                      {on && <Check className="h-3 w-3" />}
                      {g.answer}
                      <span className="text-[10px] text-muted-foreground">×{g.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <div className="mt-2 flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => save(false)} loading={saving} className="flex-1">
          Guardar
        </Button>
        <Button size="sm" variant="primary" onClick={() => save(true)} loading={saving} className="flex-1">
          <Check className="h-4 w-4" /> Resolver y dar puntos
        </Button>
      </div>
    </div>
  );
}
