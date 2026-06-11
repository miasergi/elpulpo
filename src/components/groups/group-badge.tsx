import { GroupIcon } from "./group-icon";
import { cn } from "@/lib/utils";

/** A group's visual badge: the uploaded logo if it has one, otherwise the
 *  chosen icon on a tinted square. `size` is the box side in px. */
export function GroupBadge({
  icon,
  color,
  logoUrl,
  size = 44,
  rounded = "rounded-xl",
  className,
}: {
  icon: string;
  color: string;
  logoUrl?: string | null;
  size?: number;
  rounded?: string;
  className?: string;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        className={cn("shrink-0 object-cover", rounded, className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center", rounded, className)}
      style={{ width: size, height: size, backgroundColor: `${color}22` }}
    >
      <GroupIcon name={icon} size={Math.round(size * 0.5)} color={color} />
    </div>
  );
}
