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
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const json = (await res.json()) as { events: SdbEvent[] | null };
  return json.events ?? [];
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
  // Group stage matchdays 1-3; rounds 4+ would be knockouts (empty pre-tournament).
  const groupRounds = [1, 2, 3];
  const koRounds = [4, 5, 6, 7];

  const groupEventsArr: SdbEvent[][] = [];
  for (const r of groupRounds) {
    groupEventsArr.push(await fetchRound(r));
  }
  const koEventsArr: SdbEvent[][] = [];
  for (const r of koRounds) {
    const ev = await fetchRound(r);
    if (ev.length) koEventsArr.push(ev);
  }

  const groupEvents = groupEventsArr.flat();
  const koEvents = koEventsArr.flat();

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

  const KO_NAMES: Record<number, string> = {
    4: "Dieciseisavos",
    5: "Octavos de final",
    6: "Cuartos de final",
    7: "Semifinales",
  };

  const fixtures = [
    ...groupEvents.map((ev) => ({
      fixture: norm(ev, ""),
      stage: groupLabel.get(uf.find(Number(ev.idHomeTeam))) ?? "Grupo ?",
    })),
    ...koEvents.map((ev) => ({
      fixture: norm(ev, ""),
      stage: KO_NAMES[Number(ev.intRound)] ?? "Eliminatorias",
    })),
  ];

  return fixtures.map(({ fixture, stage }) => ({ ...fixture, stage }));
}
