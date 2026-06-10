import { cn } from "@/lib/utils";

/** The El Pulpo badge logo. */
export function PulpoMark({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/icon-256.png"
      alt="El Pulpo"
      width={size}
      height={size}
      className={cn("object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-bold tracking-tight", className)}>
      <PulpoMark size={32} />
      <span className="text-xl">
        El<span className="text-pulpo-300">Pulpo</span>
      </span>
    </span>
  );
}
