import { Avatar } from "@/components/ui/avatar";
import { timeAgo } from "@/lib/format";
import type { ActivityItem } from "@/lib/groups";

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="mt-10 text-center text-sm text-muted">
        <div className="text-4xl">📰</div>
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
            <p className="flex-1 text-sm">
              <span className="font-semibold">{item.name}</span> se unió al grupo 👋
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
                <span className="text-xs text-pitch-400">🎯 Lo clavaron:</span>
                {item.exactHitters.map((h, j) => (
                  <span key={j} className="flex items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-xs">
                    <Avatar src={h.avatar_url} name={h.name} size={16} /> {h.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground">Nadie clavó el marcador exacto 😅</p>
            )}
          </div>
        )
      )}
    </div>
  );
}
