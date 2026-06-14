// Free data source: TheSportsDB (no signup needed with the public test key "3").
// FIFA World Cup league id = 4429. Group letters aren't provided, so we derive
// groups by clustering teams that face each other in the group stage.
import type { MatchStatus } from "@/lib/database.types";

const WC_LEAGUE = 4429;
const SEASON = "2026";

function key() {
  return process.env.THESPORTSDB_KEY || "3";
}

interface SdbEvent {
  idEvent: string;
  strEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  idHomeTeam: string;
  idAwayTeam: string;
  intRound: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strTimestamp: string | null;
  dateEvent: string | null;
  strTime: string | null;
  strHomeTeamBadge: string | null;
  strAwayTeamBadge: string | null;
  strVenue: string | null;
  strStatus: string | null;
  strGroup: string | null; // official group letter (A..L) for group-stage events
}

function mapStatus(s: string | null): MatchStatus {
  const v = (s || "").toLowerCase();
  if (!v || v.includes("not started") || v === "ns") return "scheduled";
  if (/(finish|ft|aet|full time|after)/.test(v)) return "finished";
  if (/(1st|2nd|half|live|playing|extra)/.test(v)) return "live";
  if (v.includes("postp")) return "postponed";
  if (/(cancel|abandon|awarded)/.test(v)) return "cancelled";
  return "scheduled";
}

async function fetchRound(round: number): Promise<SdbEvent[]> {
  const url = `https://www.thesportsdb.com/api/v1/json/${key()}/eventsround.php?id=${WC_LEAGUE}&r=${round}&s=${SEASON}`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 8000);
  try {
    const res = await fetch(url, { cache: "no-store", signal: ac.signal });
    if (!res.ok) return [];
    const json = (await res.json()) as { events: SdbEvent[] | null };
    return json.events ?? [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export interface NormalisedSdbFixture {
  external_id: number;
  home: { external_id: number; name: string; flag_url: string | null };
  away: { external_id: number; name: string; flag_url: string | null };
  kickoff_at: string;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  round: number;
  venue: string | null;
}

// Union-Find for grouping teams that play each other in the group stage.
class UnionFind {
  parent = new Map<number, number>();
  find(x: number): number {
    if (!this.parent.has(x)) this.parent.set(x, x);
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    this.parent.set(x, root);
    return root;
  }
  union(a: number, b: number) {
    this.parent.set(this.find(a), this.find(b));
  }
}

function isoFrom(ev: SdbEvent): string {
  if (ev.strTimestamp) {
    // strTimestamp is UTC like "2026-06-11T19:00:00"
    return new Date(ev.strTimestamp + (ev.strTimestamp.endsWith("Z") ? "" : "Z")).toISOString();
  }
  const d = ev.dateEvent ?? "2026-06-11";
  const t = ev.strTime ?? "18:00:00";
  return new Date(`${d}T${t}Z`).toISOString();
}

/** Fetches WC2026 fixtures and assigns group labels (Grupo A..L) by clustering. */
export async function fetchWorldCupSportsDB() {
  // Group stage matchdays 1-3; rounds 4+ are knockouts (empty until the groups end).
  const groupRounds = [1, 2, 3];
  const koRounds = [4, 5, 6, 7, 8, 9, 10, 11, 12];

  // Fetch all rounds in parallel to stay within Vercel's function timeout.
  const [groupEventsArr, koEventsRaw] = await Promise.all([
    Promise.all(groupRounds.map((r) => fetchRound(r))),
    Promise.all(koRounds.map((r) => fetchRound(r))),
  ]);

  const groupEvents = groupEventsArr.flat();
  const koEvents = koEventsRaw.filter((evs) => evs.length > 0).flat();

  // Derive groups via union-find on group-stage opponents.
  const uf = new UnionFind();
  for (const ev of groupEvents) {
    uf.union(Number(ev.idHomeTeam), Number(ev.idAwayTeam));
  }
  // Earliest kickoff per component → order to assign A, B, C...
  const compEarliest = new Map<number, number>();
  for (const ev of groupEvents) {
    const root = uf.find(Number(ev.idHomeTeam));
    const t = new Date(isoFrom(ev)).getTime();
    compEarliest.set(root, Math.min(compEarliest.get(root) ?? Infinity, t));
  }
  const orderedRoots = [...compEarliest.entries()].sort((a, b) => a[1] - b[1]).map(([r]) => r);
  const groupLabel = new Map<number, string>();
  orderedRoots.forEach((root, i) => {
    groupLabel.set(root, `Grupo ${String.fromCharCode(65 + i)}`);
  });

  const norm = (ev: SdbEvent, stage: string): NormalisedSdbFixture => ({
    external_id: Number(ev.idEvent),
    home: { external_id: Number(ev.idHomeTeam), name: ev.strHomeTeam, flag_url: ev.strHomeTeamBadge },
    away: { external_id: Number(ev.idAwayTeam), name: ev.strAwayTeam, flag_url: ev.strAwayTeamBadge },
    kickoff_at: isoFrom(ev),
    status: mapStatus(ev.strStatus),
    home_score: ev.intHomeScore != null ? Number(ev.intHomeScore) : null,
    away_score: ev.intAwayScore != null ? Number(ev.intAwayScore) : null,
    round: Number(ev.intRound),
    venue: ev.strVenue,
  });

  // Label knockout rounds by how many matches they contain (robust to whatever
  // round numbers the source uses). 1-match rounds: latest by date = Final, the
  // earlier single = Tercer puesto.
  const koByRound = new Map<number, SdbEvent[]>();
  for (const ev of koEvents) {
    const r = Number(ev.intRound);
    if (!koByRound.has(r)) koByRound.set(r, []);
    koByRound.get(r)!.push(ev);
  }
  const singleRounds = [...koByRound.entries()]
    .filter(([, evs]) => evs.length === 1)
    .sort((a, b) => new Date(isoFrom(a[1][0])).getTime() - new Date(isoFrom(b[1][0])).getTime())
    .map(([r]) => r);
  const finalRound = singleRounds.at(-1);

  const koStage = (ev: SdbEvent): string => {
    const r = Number(ev.intRound);
    const count = koByRound.get(r)?.length ?? 0;
    switch (count) {
      case 16: return "Dieciseisavos de final";
      case 8: return "Octavos de final";
      case 4: return "Cuartos de final";
      case 2: return "Semifinales";
      case 1: return r === finalRound ? "Final" : "Tercer puesto";
      default: return "Eliminatorias";
    }
  };

  const fixtures = [
    ...groupEvents.map((ev) => ({
      fixture: norm(ev, ""),
      // Prefer the official group letter; fall back to derived clustering.
      stage: ev.strGroup
        ? `Grupo ${ev.strGroup.trim().toUpperCase()}`
        : groupLabel.get(uf.find(Number(ev.idHomeTeam))) ?? "Grupo ?",
    })),
    ...koEvents.map((ev) => ({
      fixture: norm(ev, ""),
      stage: koStage(ev),
    })),
  ];

  return fixtures.map(({ fixture, stage }) => ({ ...fixture, stage }));
}

// ─────────────────────────────────────────────────────────────────────
// Squad lookup (free tier returns up to ~10 featured players per team).
// ─────────────────────────────────────────────────────────────────────
export interface SdbPlayer {
  id: string;
  name: string;
  position: string | null;
  club: string | null;
  number: string | null;
  born: string | null;
  cutout: string | null;
  thumb: string | null;
}

interface SdbPlayerRaw {
  idPlayer: string;
  strPlayer: string;
  strPosition: string | null;
  strTeam: string | null;
  strNumber: string | null;
  dateBorn: string | null;
  strCutout: string | null;
  strThumb: string | null;
}

export async function getTeamPlayers(externalTeamId: number): Promise<SdbPlayer[]> {
  const url = `https://www.thesportsdb.com/api/v1/json/${key()}/lookup_all_players.php?id=${externalTeamId}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return [];
  const json = (await res.json()) as { player: SdbPlayerRaw[] | null };
  return (json.player ?? []).map((p) => ({
    id: p.idPlayer,
    name: p.strPlayer,
    position: p.strPosition,
    club: p.strTeam,
    number: p.strNumber,
    born: p.dateBorn,
    cutout: p.strCutout,
    thumb: p.strThumb,
  }));
}
