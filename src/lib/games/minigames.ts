export interface PlayerIndex {
  id: string;
  name: string;
  club: string | null;
  photo_url: string | null;
  number: number | null;
  position: string | null;
  team_id: string;
  team_code: string;
  team_name: string;
  team_flag: string | null;
}

export interface TikiGrid {
  teams: { id: string; name: string; code: string; flag_url: string | null }[];
  clubs: string[];
  /** cells[teamCode][club] = valid player names (answer key, shown at game end) */
  cells: Record<string, Record<string, string[]>>;
}

// ─── PRNG ────────────────────────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Seed determinístico a partir de "YYYY-MM-DD". Mismo día = misma partida. */
export function dailySeed(dateStr: string): number {
  const n = parseInt(dateStr.replace(/-/g, ""), 10);
  let h = (n * 0x9e3779b9) >>> 0;
  h = h ^ (h >>> 16);
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h = h ^ (h >>> 13);
  return h >>> 0;
}

// ─── ¿Quién es? ──────────────────────────────────────────────────────────────

/** Jugador diario del modo ¿Quién es? (requiere foto). */
export function dailyPlayer(players: PlayerIndex[], dateStr: string): PlayerIndex | null {
  const pool = players.filter((p) => p.photo_url);
  if (!pool.length) return null;
  const seed = dailySeed(dateStr);
  return pool[seed % pool.length];
}

// ─── Tiki-Taka-Toe ───────────────────────────────────────────────────────────

/** Genera la rejilla diaria 3×3 (3 selecciones × 3 clubes) a partir de los jugadores. */
export function generateTikiGrid(players: PlayerIndex[], dateStr: string): TikiGrid | null {
  const seed = dailySeed(dateStr);
  const rng = mulberry32(seed);

  // Mapa: club → Map<teamCode, playerNames[]>
  const map = new Map<string, Map<string, string[]>>();
  for (const p of players) {
    if (!p.club || !p.team_code) continue;
    if (!map.has(p.club)) map.set(p.club, new Map());
    const tm = map.get(p.club)!;
    if (!tm.has(p.team_code)) tm.set(p.team_code, []);
    tm.get(p.team_code)!.push(p.name);
  }

  // Clubes con jugadores de ≥3 selecciones distintas del mundial
  const richClubs = seededShuffle(
    [...map.entries()].filter(([, tm]) => tm.size >= 3).map(([c]) => c),
    rng,
  );

  // Buscar primera combinación de 3 clubes que comparten ≥3 selecciones
  const limit = Math.min(richClubs.length, 30);
  for (let i = 0; i < limit; i++) {
    for (let j = i + 1; j < limit; j++) {
      for (let k = j + 1; k < limit; k++) {
        const clubs = [richClubs[i], richClubs[j], richClubs[k]];
        const shared = [...map.get(clubs[0])!.keys()].filter(
          (t) => map.get(clubs[1])!.has(t) && map.get(clubs[2])!.has(t),
        );
        if (shared.length < 3) continue;

        // Tomar las 3 primeras selecciones en orden alfabético (determinismo)
        const teams = [...shared].sort().slice(0, 3);

        const cells: Record<string, Record<string, string[]>> = {};
        for (const t of teams) {
          cells[t] = {};
          for (const c of clubs) cells[t][c] = map.get(c)!.get(t)!;
        }

        const teamInfo = teams.map((tc) => {
          const p = players.find((pl) => pl.team_code === tc)!;
          return { id: p.team_id, name: p.team_name, code: tc, flag_url: p.team_flag };
        });

        return { teams: teamInfo, clubs, cells };
      }
    }
  }

  return null;
}
