"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/app", label: "Inicio", icon: Home, exact: true },
  { href: "/app/matches", label: "Partidos", icon: CalendarDays },
  { href: "/app/groups", label: "Grupos", icon: Users },
  { href: "/app/profile", label: "Perfil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 backdrop-blur-lg pb-safe">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-pulpo-300" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "fill-pulpo-500/20")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
