import { Newspaper, UserPlus, Target } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { timeAgo } from "@/lib/format";
import type { ActivityItem } from "@/lib/groups";

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="mt-10 text-center text-sm text-muted">
        <Newspaper className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3">Aún no hay actividad. Cuando se jueguen partidos aparecerá aquí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) =>
        item.type === "join" ? (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-surface/50 p-3">
            <Avatar src={item.avatar_url} name={item.name} size={32} />
            <p className="flex flex-1 items-center gap-1.5 text-sm">
              <UserPlus className="h-3.5 w-3.5 text-pulpo-300" />
              <span><span className="font-semibold">{item.name}</span> se unió al grupo</span>
            </p>
            <span className="text-[11px] text-muted-foreground">{timeAgo(item.at)}</span>
          </div>
        ) : (
          <div key={i} className="rounded-lg border border-border bg-surface/50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                {item.home} <span className="text-pulpo-300">{item.homeScore}-{item.awayScore}</span> {item.away}
              </p>
              <span className="text-[11px] text-muted-foreground">{timeAgo(item.at)}</span>
            </div>
            {item.exactHitters.length > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-pitch-400"><Target className="h-3.5 w-3.5" /> Lo clavaron:</span>
                {item.exactHitters.map((h, j) => (
                  <span key={j} className="flex items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-xs">
                    <Avatar src={h.avatar_url} name={h.name} size={16} /> {h.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground">Nadie clavó el marcador exacto</p>
            )}
          </div>
        )
      )}
    </div>
  );
}
