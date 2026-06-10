"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export function TournamentTabs({
  groups,
  knockout,
  hasGroups,
  hasKnockout,
}: {
  groups: React.ReactNode;
  knockout: React.ReactNode;
  hasGroups: boolean;
  hasKnockout: boolean;
}) {
  const [tab, setTab] = useState<"groups" | "ko">(hasGroups ? "groups" : "ko");

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-5 mb-4 flex border-b border-border bg-background/85 px-5 backdrop-blur-lg">
        <button
          onClick={() => setTab("groups")}
          className={cn(
            "flex-1 border-b-2 py-3 text-sm font-medium transition-colors",
            tab === "groups" ? "border-primary text-pulpo-200" : "border-transparent text-muted-foreground"
          )}
        >
          Grupos
        </button>
        <button
          onClick={() => setTab("ko")}
          className={cn(
            "flex-1 border-b-2 py-3 text-sm font-medium transition-colors",
            tab === "ko" ? "border-primary text-pulpo-200" : "border-transparent text-muted-foreground"
          )}
        >
          Eliminatorias
        </button>
      </div>

      {tab === "groups" ? (
        hasGroups ? groups : <Empty text="Aún no hay grupos cargados." />
      ) : hasKnockout ? (
        knockout
      ) : (
        <Empty text="El cuadro de eliminatorias aparecerá cuando terminen los grupos." />
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="mt-12 text-center text-sm text-muted">
      <Trophy className="mx-auto h-10 w-10 text-muted-foreground" />
      <p className="mt-3">{text}</p>
    </div>
  );
}
