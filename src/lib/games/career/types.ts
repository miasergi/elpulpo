// ╔══════════════════════════════════════════════════════════════════╗
// ║  Simulador de Carrera — tipos del motor                            ║
// ║                                                                    ║
// ║  Todo el motor es puro y determinista: dada una semilla y la lista ║
// ║  de decisiones, la carrera se reconstruye exactamente igual. Eso   ║
// ║  es lo que permite guardarla en Supabase sin guardar el estado.    ║
// ╚══════════════════════════════════════════════════════════════════╝

export type Confederation = "UEFA" | "CONMEBOL" | "CONCACAF" | "CAF" | "AFC" | "OFC";

/** Posición sobre el campo, en siglas españolas. */
export type Position =
  | "POR" | "LI" | "DFC" | "LD"
  | "MCD" | "MI" | "MC" | "MD" | "MCO"
  | "EI" | "DC" | "ED";

/** Perfil táctico: decide cuántos goles y asistencias te tocan. */
export type PlayStyle = "goalkeeper" | "defensive" | "support" | "creator" | "attacker";

/** Tu sitio en el equipo esta temporada. */
export type SquadRole = "starter" | "high_rotation" | "low_rotation" | "substitute";

export type Foot = "left" | "right";

export type Trophy =
  | "league" | "cup" | "continental_primary" | "continental_secondary"
  | "national_continental" | "world_cup";

export type Award = "ballon_dor" | "golden_boot" | "golden_glove";

// ── Datos ────────────────────────────────────────────────────────────

export interface CareerClub {
  id: string;
  name: string;
  short: string;
  abbr: string;
  crest: string | null;
  /** [nacional, continental, nivel] en escala 0-5. */
  rep: [number, number, number];
}

export interface CareerLeague {
  id: string;
  name: string;
  /** Código FIFA del país. */
  country: string;
  confederation: Confederation;
  /** 1 = primera división, 2 = segunda. */
  tier: 1 | 2;
  cup: string;
  clubs: CareerClub[];
}

export interface CareerCountry {
  code: string;
  /** ISO-3166 alpha-2 en minúsculas, para la bandera. */
  iso: string;
  name: string;
  confederation: Confederation;
  /** [continental, mundial, nivel] en escala 0-5. */
  rep: [number, number, number];
}

// ── Jugador ──────────────────────────────────────────────────────────

export interface Identity {
  lastName: string;
  number: number;
  foot: Foot;
  countryCode: string;
  position: Position;
}

export interface Player {
  age: number;
  overall: number;
  marketValue: number;
  position: Position;
  style: PlayStyle;
  countryCode: string;
}

export interface Stats {
  appearances: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  goalsConceded: number;
}

export interface Totals extends Stats {
  trophies: number;
  awards: number;
  seasons: number;
}

// ── Temporada ────────────────────────────────────────────────────────

export interface LeagueRow {
  clubId: string;
  name: string;
  abbr: string;
  crest: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
  isUser: boolean;
}

/** Un partido del torneo de selecciones. */
export interface NationalMatch {
  stage: string;
  rivalCode: string;
  rivalName: string;
  goalsFor: number;
  goalsAgainst: number;
  penaltiesFor?: number;
  penaltiesAgainst?: number;
  won: boolean;
}

export interface NationalRun {
  trophy: "national_continental" | "world_cup";
  /** Nombre del torneo ("Eurocopa", "Mundial"…). */
  tournament: string;
  matches: NationalMatch[];
  /** "Campeón", "Semifinales", "Fase de grupos"… */
  reachedLabel: string;
  won: boolean;
  stats: Stats;
}

export interface BallonDorEntry {
  name: string;
  clubName: string;
  countryCode: string;
  score: number;
  isUser: boolean;
}

export interface SeasonSnapshot {
  index: number;
  age: number;
  clubId: string;
  leagueId: string;
  tier: 1 | 2;
  role: SquadRole;
  overall: number;
  marketValue: number;
  stats: Stats;
  trophies: Trophy[];
  awards: Award[];
  /** Clasificación completa de la liga, con tu club marcado. */
  leagueTable: LeagueRow[];
  leaguePosition: number;
  relegated: boolean;
  promoted: boolean;
  onLoan: boolean;
  /** Recorrido con tu selección, si te convocaron ese año. */
  national: NationalRun | null;
  /** Top-5 del Balón de Oro, solo en temporadas donde peleas por él. */
  ballonDor: BallonDorEntry[] | null;
}

// ── Decisiones ───────────────────────────────────────────────────────

export type EventKey =
  | "training_extra" | "personal_coach" | "mysterious_substance" | "season_load"
  | "position_change" | "position_competition" | "unexpected_prospect" | "club_priority"
  | "rival_offer" | "club_crisis" | "fan_backlash" | "return_home" | "giant_tattoo"
  | "tax_trouble" | "foreign_grandfather" | "finish_high_school" | "controversial_statement"
  | "triumphant_return" | "club_national_team_conflict" | "injury_at_peak" | "injury"
  | "decisive_penalty";

export type DecisionKind =
  | "academy_offer" | "transfer" | "loan_offer"
  | "post_loan_retained" | "post_loan_not_retained"
  | "contract_non_renewal" | "career_event";

/** Una opción concreta que el jugador puede pulsar. */
export type DecisionOption =
  | { id: string; type: "join_club" | "join_loan" | "permanent_transfer" | "stay"; clubId: string }
  | { id: string; type: "retire" }
  | { id: string; type: "career_choice"; eventKey: EventKey; optionKey: string; clubId?: string };

export interface DecisionEvent {
  id: string;
  kind: DecisionKind;
  age: number;
  options: DecisionOption[];
  /** Solo en kind === "career_event". */
  eventKey?: EventKey;
  variantKey?: string;
  /** Datos para rellenar los textos del evento. */
  context?: {
    rivalClubId?: string;
    targetTrophy?: Trophy;
    tournament?: string;
    injuryKey?: string;
    altCountryCode?: string;
    countryName?: string;
  };
}

/** Lo que se guarda de cada decisión: basta para rehacer la carrera. */
export interface Decision {
  optionId: string;
}

// ── Estado ───────────────────────────────────────────────────────────

export interface Loan {
  parentClubId: string;
  loanClubId: string;
  returnAge: number;
}

export interface UpcomingTournament {
  trophy: "national_continental" | "world_cup";
  age: number;
  /** false = tu selección no se clasificó, así que ese año no hay torneo. */
  qualified: boolean;
}

export type CareerPhase = "identity" | "decision" | "summary";

export interface CareerState {
  seed: number;
  rngState: number;
  step: number;
  phase: CareerPhase;
  identity: Identity;
  player: Player;
  /** Club donde juegas ahora (puede ser el de la cesión). */
  clubId: string | null;
  /** Club dueño de tu ficha. */
  contractClubId: string | null;
  loan: Loan | null;
  seasons: SeasonSnapshot[];
  totals: Totals;
  currentEvent: DecisionEvent | null;
  /** Eventos ya vividos, para no repetirlos. */
  completedEventKeys: EventKey[];
  injuryCount: number;
  upcomingTournaments: UpcomingTournament[];
  /** Ascensos y descensos: club → división en la que juega ahora. */
  clubTierOverrides: Record<string, 1 | 2>;
  /** Motivo del retiro, una vez terminada la carrera. */
  retirement: { age: number; reason: "voluntary" | "age" | "decline" } | null;
}
