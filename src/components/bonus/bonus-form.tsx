"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Lock, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  closes_at: string | null;
  resolved: boolean;
  correct_team_id: string | null;
  correct_text: string | null;
  current: { team_id: string | null; answer_text: string | null } | null;
}

export function BonusForm({
  markets,
  teams,
  userId,
}: {
  markets: Market[];
  teams: Team[];
  userId: string;
}) {
  return (
    <div className="space-y-4 pb-8">
      {markets.map((m) => (
        <MarketCard key={m.id} market={m} teams={teams} userId={userId} />
      ))}
    </div>
  );
}

function MarketCard({ market, teams, userId }: { market: Market; teams: Team[]; userId: string }) {
  const closed = market.resolved || (market.closes_at ? new Date(market.closes_at) <= new Date() : false);
  const [teamId, setTeamId] = useState(market.current?.team_id ?? "");
  const [text, setText] = useState(market.current?.answer_text ?? "");
  const [saved, setSaved] = useState(false);

  async function save(nextTeam?: string, nextText?: string) {
    const supabase = createClient();
    const { error } = await supabase.from("bonus_predictions").upsert(
      {
        user_id: userId,
        market_id: market.id,
        team_id: market.kind === "team" ? (nextTeam ?? teamId) || null : null,
        answer_text: market.kind === "text" ? (nextText ?? text) || null : null,
      },
      { onConflict: "user_id,market_id" }
    );
    if (error) toast.error("No se pudo guardar");
    else {
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 font-medium">
          <Trophy className="h-4 w-4 text-pulpo-300" /> {market.label}
        </span>
        <Badge variant="accent">+{market.points} pts</Badge>
      </div>

      {market.kind === "team" ? (
        <select
          value={teamId}
          disabled={closed}
          onChange={(e) => {
            setTeamId(e.target.value);
            save(e.target.value);
          }}
          className="h-12 w-full rounded-md border border-border bg-surface-2 px-3 text-sm disabled:opacity-60"
        >
          <option value="">Elige un equipo…</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      ) : (
        <Input
          value={text}
          disabled={closed}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => save(undefined, text)}
          placeholder="Tu respuesta…"
        />
      )}

      <div className="mt-2 flex h-4 items-center justify-between text-xs">
        {closed ? (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Lock className="h-3 w-3" /> Cerrado
          </span>
        ) : saved ? (
          <span className="text-pitch-400">Guardado ✓</span>
        ) : (
          <span />
        )}
        {market.resolved && market.correct_text && (
          <span className="text-muted">Respuesta: {market.correct_text}</span>
        )}
      </div>
    </div>
  );
}
