import { getMatches, type MatchRow } from "@/lib/queries";
import type { TeamLite } from "@/components/match/team-flag";

export type FormResult = "W" | "D" | "L";

export interface StandingTeam {
  team: TeamLite;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  rank: number;
  form: FormResult[]; // chronological, last entries are most recent
}

const GROUP_RE = /grupo|group/i;

export function isGroupStage(stage: string | null) {
  return !!stage && GROUP_RE.test(stage);
}

/**
 * Computes a FIFA group table from its matches.
 * Tiebreakers (as the user asked): points → goal difference → goals for → name.
 */
export function computeGroupStandings(matches: MatchRow[]): StandingTeam[] {
  const table = new Map<string, StandingTeam>();
  const ensure = (t: TeamLite) => {
    if (!table.has(t.id)) {
      table.set(t.id, { team: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, rank: 0, form: [] });
    }
    return table.get(t.id)!;
  };

  // Register every team that appears (so unplayed groups still show all teams).
  for (const m of matches) {
    if (m.home_team) ensure(m.home_team);
    if (m.away_team) ensure(m.away_team);
  }

  // Process finished matches chronologically so "form" reads oldest → newest.
  const finished = matches
    .filter((m) => m.status === "finished" && m.home_score != null && m.away_score != null && m.home_team && m.away_team)
    .sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime());

  for (const m of finished) {
    const h = ensure(m.home_team!);
    const a = ensure(m.away_team!);
    h.played++; a.played++;
    h.gf += m.home_score!; h.ga += m.away_score!;
    a.gf += m.away_score!; a.ga += m.home_score!;
    if (m.home_score! > m.away_score!) { h.won++; h.points += 3; a.lost++; h.form.push("W"); a.form.push("L"); }
    else if (m.home_score! < m.away_score!) { a.won++; a.points += 3; h.lost++; a.form.push("W"); h.form.push("L"); }
    else { h.drawn++; a.drawn++; h.points++; a.points++; h.form.push("D"); a.form.push("D"); }
  }

  const rows = [...table.values()].map((r) => ({ ...r, gd: r.gf - r.ga }));
  rows.sort(
    (x, y) =>
      y.points - x.points ||
      y.gd - x.gd ||
      y.gf - x.gf ||
      x.team.name.localeCompare(y.team.name)
  );
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

export interface GroupBlock {
  key: string;
  label: string;
  standings: StandingTeam[];
}

export interface KnockoutRound {
  key: string;
  label: string;
  matches: MatchRow[];
}

// Canonical knockout ordering + display labels (matches API-Football round names loosely).
const KO_ORDER: [RegExp, string][] = [
  [/round of 32|treintaidos|32/i, "16avos de final"],
  [/round of 16|octavos|16/i, "Octavos de final"],
  [/quarter|cuartos/i, "Cuartos de final"],
  [/semi/i, "Semifinales"],
  [/3rd|third|tercer/i, "Tercer puesto"],
  [/final/i, "Final"],
];

function koLabel(stage: string): { label: string; order: number } {
  for (let i = 0; i < KO_ORDER.length; i++) {
    if (KO_ORDER[i][0].test(stage)) return { label: KO_ORDER[i][1], order: i };
  }
  return { label: stage, order: 99 };
}

export async function getTournament(competitionId: string) {
  const matches = await getMatches(competitionId);

  // Split group vs knockout.
  const groupMatches = matches.filter((m) => isGroupStage(m.stage));
  const koMatches = matches.filter((m) => m.stage && !isGroupStage(m.stage));

  // Group blocks
  const groupMap = new Map<string, MatchRow[]>();
  for (const m of groupMatches) {
    const key = (m.stage ?? "Grupo").trim();
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(m);
  }
  const groups: GroupBlock[] = [...groupMap.entries()]
    .map(([key, ms]) => ({ key, label: key, standings: computeGroupStandings(ms) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // Knockout rounds, ordered
  const koMap = new Map<string, { order: number; matches: MatchRow[] }>();
  for (const m of koMatches) {
    const { label, order } = koLabel(m.stage!);
    if (!koMap.has(label)) koMap.set(label, { order, matches: [] });
    koMap.get(label)!.matches.push(m);
  }
  const rounds: KnockoutRound[] = [...koMap.entries()]
    .map(([label, { order, matches }]) => ({
      key: label,
      label,
      order,
      matches: matches.sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime()),
    }))
    .sort((a, b) => a.order - b.order)
    .map(({ key, label, matches }) => ({ key, label, matches }));

  return { groups, rounds, hasGroups: groups.length > 0, hasKnockout: rounds.length > 0 };
}
