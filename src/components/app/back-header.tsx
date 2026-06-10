"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function BackHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 -mx-5 mb-3 flex items-center justify-between gap-2 border-b border-border/60 bg-background/80 px-3 py-3 backdrop-blur-lg">
      <div className="flex items-center gap-1">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-2"
          aria-label="Volver"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">{title}</h1>
      </div>
      {action}
    </header>
  );
}
