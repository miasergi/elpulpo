import Link from "next/link";
import { ChevronRight, Shirt, Sparkles, HelpCircle, Grid3x3 } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { AdBanner } from "@/components/ads/ad-banner";

export const dynamic = "force-dynamic";

const GAMES = [
  {
    href: "/app/games/eleven",
    icon: <Shirt className="h-7 w-7" />,
    iconBg: "bg-pulpo-500/20 text-pulpo-200",
    cardBg: "border-pulpo-500/40 from-pulpo-500/20 via-surface/80 to-primary/15",
    badge: null,
    title: "El 11 del mundial",
    desc: "Gira la ruleta de países y ficha 11 jugadores de 11 selecciones. Luego juega su Mundial partido a partido.",
    tagline: "¿Hasta dónde llegarás?",
    taglineColor: "text-pulpo-300",
  },
  {
    href: "/app/games/quien-es",
    icon: <HelpCircle className="h-7 w-7" />,
    iconBg: "bg-warning/20 text-warning",
    cardBg: "border-warning/30 from-warning/10 via-surface/80 to-surface/40",
    badge: "Nuevo",
    title: "¿Quién es?",
    desc: "Adivina al jugador tapado en 8 intentos. Cuantos más falles, más pistas aparecen.",
    tagline: "Reto diario · se resetea a medianoche",
    taglineColor: "text-warning/80",
  },
  {
    href: "/app/games/club-quiz",
    icon: <span className="text-2xl">🎽</span>,
    iconBg: "bg-pink-500/20 text-pink-300",
    cardBg: "border-pink-500/30 from-pink-500/10 via-surface/80 to-surface/40",
    badge: "Nuevo",
    title: "¿De qué club es?",
    desc: "Aparece un jugador del mundial con su selección. ¿Sabes en qué club juega? ¡Encadena la racha más larga!",
    tagline: "¿Cuántos aciertas seguidos?",
    taglineColor: "text-pink-400",
  },
  {
    href: "/app/games/tiki-taka-toe",
    icon: <Grid3x3 className="h-7 w-7" />,
    iconBg: "bg-pitch-500/20 text-pitch-300",
    cardBg: "border-pitch-500/30 from-pitch-500/10 via-surface/80 to-surface/40",
    badge: "Nuevo",
    title: "Tiki-Taka-Toe",
    desc: "Rellena la rejilla 3×3: pon un jugador que coincida con la selección y el club de cada casilla.",
    tagline: "Rejilla diaria · menos intentos = mejor",
    taglineColor: "text-pitch-400",
  },
];

export default async function GamesPage() {
  const { profile } = await requireProfile();

  return (
    <div className="px-5">
      <PageHeader title="Minijuegos" subtitle="Pequeños retos para presumir con tus amigos" />

      <div className="mt-2 flex flex-col gap-3">
        {GAMES.map((g) => (
          <Link
            key={g.href}
            href={g.href}
            className={`group relative block overflow-hidden rounded-xl border bg-gradient-to-br p-5 ${g.cardBg}`}
          >
            {g.badge && (
              <span className="absolute right-4 top-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                {g.badge}
              </span>
            )}
            <div className="flex items-center gap-4">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${g.iconBg}`}>
                {g.icon}
              </div>
              <div className="min-w-0 pr-10">
                <h2 className="text-lg font-extrabold">{g.title}</h2>
                <p className="text-sm text-muted">{g.desc}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted">
              <span className={`flex items-center gap-1.5 ${g.taglineColor}`}>
                <Sparkles className="h-3.5 w-3.5" /> {g.tagline}
              </span>
              <span className="flex items-center gap-1 font-semibold text-foreground transition-transform group-hover:translate-x-0.5">
                Jugar <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {!profile.is_pro && <AdBanner className="mt-6" />}
    </div>
  );
}
