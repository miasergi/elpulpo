"use client";

import { useMemo } from "react";

const COLORS = ["#fb7e3c", "#ff5c9d", "#22d3ee", "#34d399", "#facc15", "#f1faf9"];

// Fuera del componente: la regla react-hooks/purity prohíbe Math.random en render.
function makePieces(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1.8 + Math.random() * 1.6,
    rotate: Math.random() * 360,
    color: COLORS[i % COLORS.length],
    size: 6 + Math.random() * 8,
    round: Math.random() > 0.5,
  }));
}

/** Lightweight dependency-free confetti burst. Mount it to fire once. */
export function Confetti({ count = 80 }: { count?: number }) {
  const pieces = useMemo(() => makePieces(count), [count]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-[-5%] animate-confetti"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.round ? "9999px" : "2px",
            transform: `rotate(${p.rotate}deg)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
