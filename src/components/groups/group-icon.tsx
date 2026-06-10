import { Goal, Trophy, Flame, Crown, Target, Rocket, Star, Zap, Shield, Swords, type LucideIcon } from "lucide-react";

// Keys are stored in groups.icon. SVG only — no emojis.
export const GROUP_ICONS: { key: string; Icon: LucideIcon }[] = [
  { key: "goal", Icon: Goal },
  { key: "trophy", Icon: Trophy },
  { key: "flame", Icon: Flame },
  { key: "crown", Icon: Crown },
  { key: "target", Icon: Target },
  { key: "rocket", Icon: Rocket },
  { key: "star", Icon: Star },
  { key: "zap", Icon: Zap },
  { key: "shield", Icon: Shield },
  { key: "swords", Icon: Swords },
];

const MAP: Record<string, LucideIcon> = Object.fromEntries(GROUP_ICONS.map((i) => [i.key, i.Icon]));

export function GroupIcon({
  name,
  className,
  size = 22,
  color,
}: {
  name: string;
  className?: string;
  size?: number;
  color?: string;
}) {
  const Icon = MAP[name] ?? Goal; // legacy/emoji values fall back to Goal
  return <Icon className={className} size={size} style={color ? { color } : undefined} />;
}
