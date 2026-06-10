import { PulpoMark } from "@/components/brand/logo";

export default function Loading() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3">
      <PulpoMark size={56} className="animate-pulse" />
      <p className="text-sm text-muted-foreground">Cargando…</p>
    </div>
  );
}
