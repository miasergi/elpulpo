import Link from "next/link";
import { Trophy, Users, Zap, Target, MessageCircle, Bell } from "lucide-react";
import { Wordmark, PulpoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Target, title: "Predice cada partido", desc: "Marcador exacto, ganador o empate. Cuanto más afines, más puntos." },
  { icon: Users, title: "Grupos con tus amigos", desc: "Crea una porra privada con un código y reta a quien quieras." },
  { icon: Zap, title: "Ranking en vivo", desc: "La clasificación se actualiza en tiempo real mientras ruedan los partidos." },
  { icon: Trophy, title: "Bonus del torneo", desc: "Acierta el campeón y el máximo goleador para puntos extra." },
  { icon: MessageCircle, title: "Chat de grupo", desc: "Pica a tus amigos y celebra los aciertos sin salir de la app." },
  { icon: Bell, title: "Avisos a tiempo", desc: "Te recordamos cuando un partido está a punto de cerrar." },
];

export default function LandingPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10 pt-safe">
      <header className="flex items-center justify-between py-5">
        <Wordmark />
        <Link href="/login">
          <Button variant="ghost" size="sm">Entrar</Button>
        </Link>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center pt-8 text-center">
        <div className="relative animate-float">
          <div className="absolute inset-0 -z-10 rounded-full bg-orange-500/25 blur-3xl" />
          <PulpoMark size={148} />
        </div>
        <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight">
          Predice el <span className="text-brand-gradient">Mundial 2026</span> con tus amigos
        </h1>
        <p className="mt-4 text-balance text-muted">
          Crea tu grupo, mete tus pronósticos y descubre quién es el verdadero oráculo. 🐙
        </p>

        <div className="mt-8 flex w-full flex-col gap-3">
          <Link href="/signup" className="w-full">
            <Button size="full" variant="primary">Crear mi grupo gratis</Button>
          </Link>
          <Link href="/login" className="w-full">
            <Button size="full" variant="secondary">Ya tengo cuenta</Button>
          </Link>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Gratis · Sin anuncios · Instálalo en tu móvil
        </p>
      </section>

      {/* How it scores */}
      <section className="mt-12 rounded-lg border border-border bg-surface/60 p-5">
        <h2 className="text-sm font-semibold text-muted">CÓMO SE PUNTÚA</h2>
        <ul className="mt-3 space-y-2.5 text-sm">
          <li className="flex items-center justify-between">
            <span>🎯 Marcador exacto</span>
            <span className="font-bold text-pitch-400">+5 pts</span>
          </li>
          <li className="flex items-center justify-between">
            <span>📊 Acertar la diferencia de goles</span>
            <span className="font-bold text-pitch-400">+3 pts</span>
          </li>
          <li className="flex items-center justify-between">
            <span>✅ Acertar el ganador (1·X·2)</span>
            <span className="font-bold text-pitch-400">+2 pts</span>
          </li>
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Cada grupo puede ajustar su propio sistema de puntos.
        </p>
      </section>

      {/* Features */}
      <section className="mt-10 grid grid-cols-2 gap-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-lg border border-border bg-surface/50 p-4">
            <f.icon className="h-6 w-6 text-pulpo-300" />
            <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="mt-12 text-center">
        <h2 className="text-2xl font-bold">¿Listo para jugar?</h2>
        <Link href="/signup" className="mt-5 block">
          <Button size="full" variant="accent">Empezar ahora</Button>
        </Link>
      </section>

      <footer className="mt-12 text-center text-xs text-muted-foreground">
        El Pulpo · En homenaje a Paul, el pulpo que lo predijo todo en 2010.
      </footer>
    </div>
  );
}
