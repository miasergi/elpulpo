import { cn } from "@/lib/utils";

export interface TeamLite {
  id: string;
  name: string;
  short_name?: string | null;
  code?: string | null;
  flag_url?: string | null;
}

export function TeamFlag({
  team,
  size = 32,
  className,
}: {
  team?: TeamLite | null;
  size?: number;
  className?: string;
}) {
  if (!team) {
    return (
      <div
        className={cn("flex items-center justify-center rounded-full bg-surface-3 text-muted-foreground", className)}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        ?
      </div>
    );
  }
  return (
    <div
      className={cn("flex items-center justify-center overflow-hidden rounded-full bg-surface-3", className)}
      style={{ width: size, height: size }}
    >
      {team.flag_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.flag_url} alt={team.name} className="h-full w-full object-cover" />
      ) : (
        <span className="font-bold text-muted" style={{ fontSize: size * 0.34 }}>
          {team.code ?? team.short_name ?? team.name.slice(0, 3).toUpperCase()}
        </span>
      )}
    </div>
  );
}
