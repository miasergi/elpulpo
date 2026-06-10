import { cn } from "@/lib/utils";

/** Octopus mark — nod to Paul the Octopus, the legendary 2010 World Cup oracle. */
export function PulpoMark({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pulpoGrad" x1="0" y1="0" x2="64" y2="64">
          <stop stopColor="#9b66ff" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      {/* head */}
      <path
        d="M32 6c11 0 19 8 19 19v8c0 3-2 5-4 6-2 1-3 3-3 5 0 4-3 6-6 4-2-1-3-1-5 0-2 1-4 1-6 0-2-1-3-1-5 0-3 2-6 0-6-4 0-2-1-4-3-5-2-1-4-3-4-6v-8C13 14 21 6 32 6Z"
        fill="url(#pulpoGrad)"
      />
      {/* eyes */}
      <circle cx="25" cy="26" r="5" fill="#fff" />
      <circle cx="39" cy="26" r="5" fill="#fff" />
      <circle cx="26" cy="27" r="2.4" fill="#1c1930" />
      <circle cx="40" cy="27" r="2.4" fill="#1c1930" />
      {/* tentacle curls */}
      <path d="M16 44c-4 2-6 6-5 10" stroke="#6d28d9" strokeWidth="3" strokeLinecap="round" />
      <path d="M48 44c4 2 6 6 5 10" stroke="#6d28d9" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 52c0 4 2 7 6 8" stroke="#6d28d9" strokeWidth="3" strokeLinecap="round" />
      <path d="M28 52c0 4-2 7-6 8" stroke="#6d28d9" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-bold tracking-tight", className)}>
      <PulpoMark size={28} />
      <span className="text-xl">
        El<span className="text-pulpo-300">Pulpo</span>
      </span>
    </span>
  );
}
