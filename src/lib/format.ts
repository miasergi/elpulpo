import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { MatchStatus } from "@/lib/database.types";

/** All kickoff times are shown in the app's timezone, regardless of where
 *  they render (Vercel servers run in UTC — formatting with the machine's
 *  local time showed times 2h behind for Spain). */
const TZ = process.env.NEXT_PUBLIC_TIME_ZONE || "Europe/Madrid";

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFmt = new Intl.DateTimeFormat("es-ES", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const shortDateFmt = new Intl.DateTimeFormat("es-ES", {
  timeZone: TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
});
const longDateFmt = new Intl.DateTimeFormat("es-ES", {
  timeZone: TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function timeAgo(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es });
}

/** Calendar day (yyyy-mm-dd) in the app timezone. */
export function dayKey(iso: string) {
  return dayKeyFmt.format(new Date(iso));
}

function relativeDay(iso: string): "today" | "tomorrow" | null {
  const key = dayKey(iso);
  const now = Date.now();
  if (key === dayKeyFmt.format(now)) return "today";
  if (key === dayKeyFmt.format(now + 24 * 3600 * 1000)) return "tomorrow";
  return null;
}

export function kickoffLabel(iso: string) {
  const d = new Date(iso);
  const time = timeFmt.format(d);
  const rel = relativeDay(iso);
  if (rel === "today") return `Hoy · ${time}`;
  if (rel === "tomorrow") return `Mañana · ${time}`;
  return `${shortDateFmt.format(d)} · ${time}`;
}

export function dayHeading(iso: string) {
  const rel = relativeDay(iso);
  if (rel === "today") return "Hoy";
  if (rel === "tomorrow") return "Mañana";
  // "jueves, 11 de junio" → "jueves 11 de junio"
  return longDateFmt.format(new Date(iso)).replace(",", "");
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
