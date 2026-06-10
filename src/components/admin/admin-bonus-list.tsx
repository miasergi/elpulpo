"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

export function AdminBonusList({ markets, teams }: { markets: Market[]; teams: Team[] }) {
  return (
    <div className="space-y-2">
      {markets.map((m) => (
        <AdminBonusRow key={m.id} market={m} teams={teams} />
      ))}
    </div>
  );
}

function AdminBonusRow({ market, teams }: { market: Market; teams: Team[] }) {
  const [teamId, setTeamId] = useState(market.correct_team_id ?? "");
  const [text, setText] = useState(market.correct_text ?? "");
  const [resolved, setResolved] = useState(market.resolved);
  const [saving, setSaving] = useState(false);

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
      toast.success(markResolved ? "Bonus resuelto" : "Guardado");
    } else toast.error("Error al guardar");
  }

  return (
    <div className="rounded-lg border border-border bg-surface/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">{market.label}</span>
        {resolved ? <Badge variant="success">Resuelto</Badge> : <Badge variant="warning">Pendiente</Badge>}
      </div>
      {market.kind === "team" ? (
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="h-10 w-full rounded-md border border-border bg-surface-2 px-2 text-sm"
        >
          <option value="">Elige el equipo correcto…</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      ) : (
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Respuesta correcta" className="h-10" />
      )}
      <div className="mt-2 flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => save(false)} loading={saving} className="flex-1">
          Guardar
        </Button>
        <Button size="sm" variant="primary" onClick={() => save(true)} loading={saving} className="flex-1">
          <Check className="h-4 w-4" /> Marcar resuelto
        </Button>
      </div>
    </div>
  );
}
