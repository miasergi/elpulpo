import { format, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";
import type { MatchStatus } from "@/lib/database.types";

export function kickoffLabel(iso: string) {
  const d = new Date(iso);
  const time = format(d, "HH:mm");
  if (isToday(d)) return `Hoy · ${time}`;
  if (isTomorrow(d)) return `Mañana · ${time}`;
  return format(d, "EEE d MMM · HH:mm", { locale: es });
}

export function dayHeading(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "Hoy";
  if (isTomorrow(d)) return "Mañana";
  return format(d, "EEEE d 'de' MMMM", { locale: es });
}

export function dayKey(iso: string) {
  return format(new Date(iso), "yyyy-MM-dd");
}

export function isLocked(status: MatchStatus, kickoff: string) {
  return status !== "scheduled" || new Date(kickoff) <= new Date();
}

export function statusBadge(status: MatchStatus, minute?: number | null) {
  switch (status) {
    case "live":
      return { label: minute ? `${minute}'` : "EN VIVO", variant: "live" as const };
    case "finished":
      return { label: "Final", variant: "outline" as const };
    case "postponed":
      return { label: "Aplazado", variant: "warning" as const };
    case "cancelled":
      return { label: "Cancelado", variant: "danger" as const };
    default:
      return null;
  }
}
