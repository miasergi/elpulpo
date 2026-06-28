"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamFlag } from "@/components/match/team-flag";
import { kickoffLabel } from "@/lib/format";
import type { MatchRow } from "@/lib/queries";
import type { MatchStatus } from "@/lib/database.types";

export function AdminMatchList({ matches }: { matches: MatchRow[] }) {
  return (
    <div className="space-y-2">
      {matches.map((m) => (
        <AdminMatchRow key={m.id} match={m} />
      ))}
    </div>
  );
}

function AdminMatchRow({ match }: { match: MatchRow }) {
  const [home, setHome] = useState<string>(match.home_score?.toString() ?? "");
  const [away, setAway] = useState<string>(match.away_score?.toString() ?? "");
  const [status, setStatus] = useState<MatchStatus>(match.status);
  const [saving, setSaving] = useState(false);
  const homeNumber = home === "" ? null : Number(home);
  const awayNumber = away === "" ? null : Number(away);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/admin/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: match.id,
        home_score: homeNumber,
        away_score: awayNumber,
        status,
      }),
    });
    setSaving(false);
    if (res.ok) toast.success("Guardado");
    else toast.error("Error al guardar");
  }

  return (
    <div className="rounded-lg border border-border bg-surface/50 p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{match.stage}</span>
        <span>{kickoffLabel(match.kickoff_at)}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-1.5">
          <TeamFlag team={match.home_team} size={24} />
          <span className="truncate text-sm">{match.home_team?.code ?? match.home_team?.name}</span>
        </div>
        <input
          inputMode="numeric"
          value={home}
          onChange={(e) => setHome(e.target.value.replace(/\D/g, ""))}
          className="h-9 w-10 rounded-md border border-border bg-surface-2 text-center text-sm"
          maxLength={2}
        />
        <span>-</span>
        <input
          inputMode="numeric"
          value={away}
          onChange={(e) => setAway(e.target.value.replace(/\D/g, ""))}
          className="h-9 w-10 rounded-md border border-border bg-surface-2 text-center text-sm"
          maxLength={2}
        />
        <div className="flex flex-1 items-center justify-end gap-1.5">
          <span className="truncate text-right text-sm">{match.away_team?.code ?? match.away_team?.name}</span>
          <TeamFlag team={match.away_team} size={24} />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as MatchStatus)}
          className="h-9 flex-1 rounded-md border border-border bg-surface-2 px-2 text-xs"
        >
          <option value="scheduled">Programado</option>
          <option value="live">En vivo</option>
          <option value="finished">Finalizado</option>
          <option value="postponed">Aplazado</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <Button size="sm" onClick={save} loading={saving}>
          <Check className="h-4 w-4" /> Guardar
        </Button>
      </div>
    </div>
  );
}
