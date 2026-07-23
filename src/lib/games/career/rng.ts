// ╔══════════════════════════════════════════════════════════════════╗
// ║  Aleatoriedad determinista con estado serializable                 ║
// ║                                                                    ║
// ║  A diferencia de `mulberry32` en lib/games/minigames.ts, aquí el   ║
// ║  estado viaja dentro de CareerState: cada tirada devuelve el       ║
// ║  siguiente estado en vez de mutar un closure. Es lo que hace que   ║
// ║  la carrera se pueda guardar y rehacer paso a paso.                ║
// ╚══════════════════════════════════════════════════════════════════╝

export interface Rng {
  state: number;
}

export interface Roll<T> {
  rng: Rng;
  value: T;
}

/** Avanza el generador y devuelve un número en [0, 1). */
export function next(rng: Rng): Roll<number> {
  let s = (rng.state + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  s = s | 0;
  return { rng: { state: s }, value: ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
}

/** Número real en [min, max). */
export function float(rng: Rng, min: number, max: number): Roll<number> {
  const r = next(rng);
  return { rng: r.rng, value: min + r.value * (max - min) };
}

/** Entero en [min, max], ambos incluidos. */
export function int(rng: Rng, min: number, max: number): Roll<number> {
  const r = next(rng);
  return { rng: r.rng, value: min + Math.floor(r.value * (max - min + 1)) };
}

/** ¿Ocurre algo con probabilidad `p`? */
export function chance(rng: Rng, p: number): Roll<boolean> {
  const r = next(rng);
  return { rng: r.rng, value: r.value < p };
}

/** Un elemento al azar. Lanza si la lista está vacía. */
export function pick<T>(rng: Rng, items: readonly T[]): Roll<T> {
  if (!items.length) throw new Error("pick() sobre una lista vacía");
  const r = int(rng, 0, items.length - 1);
  return { rng: r.rng, value: items[r.value] };
}

/** Un elemento al azar ponderado por `weight`. */
export function pickWeighted<T>(rng: Rng, items: readonly { item: T; weight: number }[]): Roll<T> {
  const total = items.reduce((n, i) => n + Math.max(0, i.weight), 0);
  if (total <= 0) return pick(rng, items.map((i) => i.item));
  const r = next(rng);
  let acc = r.value * total;
  for (const i of items) {
    acc -= Math.max(0, i.weight);
    if (acc <= 0) return { rng: r.rng, value: i.item };
  }
  return { rng: r.rng, value: items[items.length - 1].item };
}

/** `n` elementos distintos al azar (o todos, si hay menos). */
export function sample<T>(rng: Rng, items: readonly T[], n: number): Roll<T[]> {
  const pool = [...items];
  const out: T[] = [];
  let r = rng;
  while (pool.length && out.length < n) {
    const p = int(r, 0, pool.length - 1);
    r = p.rng;
    out.push(pool[p.value]);
    pool.splice(p.value, 1);
  }
  return { rng: r, value: out };
}

/** Baraja completa, sin mutar la entrada. */
export function shuffle<T>(rng: Rng, items: readonly T[]): Roll<T[]> {
  return sample(rng, items, items.length);
}

/** Semilla estable a partir de un texto (para ruidos independientes). */
export function seedFrom(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Semilla nueva para una carrera. Fuera del render (react-hooks/purity). */
export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
