import Link from "next/link";
import { Gamepad2, ChevronRight, Shirt, Sparkles, Lock } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { AdBanner } from "@/components/ads/ad-banner";

export const dynamic = "force-dynamic";

export default async function GamesPage() {
  const { profile } = await requireProfile();

  return (
    <div className="px-5">
      <PageHeader title="Minijuegos" subtitle="Pequeños retos para presumir con tus amigos" />

      <Link
        href="/app/games/eleven"
        className="group relative mt-2 block overflow-hidden rounded-xl border border-pulpo-500/40 bg-gradient-to-br from-pulpo-500/20 via-surface/80 to-primary/15 p-5"
      >
        <span className="absolute right-4 top-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
          Nuevo
        </span>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-pulpo-500/20 text-pulpo-200">
            <Shirt className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold">El 11 del mundial</h2>
            <p className="text-sm text-muted">
              Gira la ruleta de países y ficha 11 jugadores de 11 selecciones. Luego juega su Mundial partido a partido.
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted">
          <span className="flex items-center gap-1.5 text-pulpo-300">
            <Sparkles className="h-3.5 w-3.5" /> ¿Hasta dónde llegarás?
          </span>
          <span className="flex items-center gap-1 font-semibold text-foreground transition-transform group-hover:translate-x-0.5">
            Jugar <ChevronRight className="h-4 w-4" />
          </span>
        </div>
      </Link>

      {/* Próximamente: deja claro que esto es una sección que va a crecer. */}
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-border bg-surface/40 p-4 text-muted">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-3">
          <Gamepad2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground/80">Más minijuegos en camino</p>
          <p className="text-xs">Quinielas exprés, duelos 1vs1, trivial mundialista…</p>
        </div>
        <Lock className="h-4 w-4 text-muted-foreground" />
      </div>

      {!profile.is_pro && <AdBanner className="mt-6" />}
    </div>
  );
}
