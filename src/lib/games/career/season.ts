// ╔══════════════════════════════════════════════════════════════════╗
// ║  Simulación de una temporada                                       ║
// ║                                                                    ║
// ║  Orden de los acontecimientos, que importa porque cada paso        ║
// ║  condiciona al siguiente:                                          ║
// ║    1. tu sitio en la plantilla y tus números                       ║
// ║    2. los títulos de club                                          ║
// ║    3. el torneo con tu selección, si te convocan                   ║
// ║    4. la clasificación de liga, que respeta el título ya decidido  ║
// ║    5. los premios individuales                                     ║
// ║    6. envejeces y tu media se mueve                                ║
// ╚══════════════════════════════════════════════════════════════════╝
import {
  APPEARANCES,
  ASSISTS_PER_GAME,
  CONTINENTAL_ODDS,
  CONTINENTAL_START_AGE,
  CONTINENTAL_TITLE_ODDS,
  GOALS_PER_GAME,
  GROWTH_FIELD,
  GROWTH_KEEPER,
  HAS_SECONDARY_CONTINENTAL,
  KEEPER_APPEARANCES,
  KEEPER_CONCEDE_FACTOR,
  MARKET_VALUE_CURVE,
  MAX_OVERALL,
  MIN_OVERALL,
  NATIONAL_CALLUP_BAR,
  PROMOTION_ODDS,
  ROLE_LADDER,
  START_AGE,
  TEAM_OUTPUT_FACTOR,
  TOURNAMENT_CYCLE,
  TROPHY_ODDS,
  WORLD_CUP_QUALIFY_ODDS,
  WORLD_CUP_START_AGE,
  WORLD_CUP_TITLE_ODDS,
  ageValueFactor,
  ballonDorOdds,
  ballonDorStyleFactor,
  goldenBootOdds,
  keeperGapFactor,
  productionBand,
  qualityFactor,
  roleFromGap,
  starLiftFactor,
} from "./constants";
import { clubLevel, effectiveRep, getClub, getCountry, hasTier, leagueOf } from "./data";
import { buildLeagueTable, currentLeague, userLift } from "./league-table";
import { simulateNationalRun } from "./national";
import { ballonDorScore, buildBallonDorPodium } from "./awards";
import { chance, float, int, type Rng } from "./rng";
import type {
  Award,
  CareerClub,
  Player,
  SeasonSnapshot,
  SquadRole,
  Stats,
  Trophy,
  UpcomingTournament,
} from "./types";

/** Modificadores que un evento de carrera deja caer sobre la temporada. */
export interface SeasonModifiers {
  immediateOverallDelta: number;
  deferredOverallDelta: number;
  permanentOverallDelta: number;
  roleOverride: SquadRole | null;
  roleShift: number;
  statsMultiplier: number;
  suspended: boolean;
  leagueTrophyMultiplier: number;
  cupTrophyMultiplier: number;
  continentalPrimaryMultiplier: number;
  continentalSecondaryMultiplier: number;
  /** Fuerza o veta un título concreto (penalti decisivo, lesión en el mejor momento). */
  clubTrophyOverride: { trophy: Trophy; result: "force" | "skip" } | null;
  nationalTrophyOverride: { trophy: Trophy; result: "force" | "skip" } | null;
  /** "force" = vas al torneo aunque no llegues al listón; "skip" = te lo pierdes. */
  nationalParticipation: "normal" | "force" | "skip";
  nationalTournament?: Trophy;
}

export const NO_MODIFIERS: SeasonModifiers = {
  immediateOverallDelta: 0,
  deferredOverallDelta: 0,
  permanentOverallDelta: 0,
  roleOverride: null,
  roleShift: 0,
  statsMultiplier: 1,
  suspended: false,
  leagueTrophyMultiplier: 1,
  cupTrophyMultiplier: 1,
  continentalPrimaryMultiplier: 1,
  continentalSecondaryMultiplier: 1,
  clubTrophyOverride: null,
  nationalTrophyOverride: null,
  nationalParticipation: "normal",
};

// ── Piezas sueltas ───────────────────────────────────────────────────

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** El listón que te pone tu club: si tu media no llega, no eres titular. */
export function levelBarOf(club: CareerClub): number {
  const bars = [58, 68, 75, 80, 84, 88];
  return bars[clubLevel(club)];
}

/** Valor de mercado interpolando la curva y aplicando el factor de edad. */
export function marketValue(rng: Rng, overall: number, age: number): { rng: Rng; value: number } {
  const o = clamp(overall, 50, 99);
  let lower = MARKET_VALUE_CURVE[0];
  let upper = MARKET_VALUE_CURVE[MARKET_VALUE_CURVE.length - 1];
  for (const point of MARKET_VALUE_CURVE) {
    if (point[0] <= o) lower = point;
    if (point[0] >= o) { upper = point; break; }
  }
  const span = upper[0] - lower[0];
  const t = span === 0 ? 0 : (o - lower[0]) / span;
  const base = lower[1] + (upper[1] - lower[1]) * t;

  const jitter = float(rng, 0.95, 1.05);
  return { rng: jitter.rng, value: roundValue(base * ageValueFactor(age) * jitter.value) };
}

function roundValue(v: number): number {
  if (v >= 10_000_000) return Math.round(v / 1_000_000) * 1_000_000;
  if (v >= 1_000_000) return Math.round(v / 100_000) * 100_000;
  return Math.round(v / 10_000) * 10_000;
}

/** Sube o baja tu rol por la escalera (los eventos lo usan). */
function shiftRole(role: SquadRole, shift: number): SquadRole {
  if (!shift) return role;
  const i = ROLE_LADDER.indexOf(role);
  return ROLE_LADDER[clamp(i + shift, 0, ROLE_LADDER.length - 1)] ?? role;
}

/** Tu rol de esta temporada, ya con lo que hayan dicho los eventos. */
export function resolveRole(player: Player, club: CareerClub, mods: SeasonModifiers): SquadRole {
  const gap = player.overall - levelBarOf(club);
  const natural = roleFromGap(gap, player.style === "goalkeeper");
  return mods.roleOverride ?? shiftRole(natural, mods.roleShift);
}

/** Los equipos flojos juegan menos partidos oficiales (menos copas). */
function competitionLoad(club: CareerClub): number {
  if (club.rep[0] === 0) return 0.7;
  if (club.rep[0] === 1) return 0.8;
  if (club.rep[1] === 0) return 0.9;
  return 1;
}

/** Estadísticas de la temporada en el club. */
export function simulateClubStats(
  rng: Rng,
  player: Player,
  club: CareerClub,
  role: SquadRole,
  mods: SeasonModifiers
): { rng: Rng; stats: Stats } {
  const isKeeper = player.style === "goalkeeper";
  const gap = player.overall - levelBarOf(club);
  const [min, max] = (isKeeper ? KEEPER_APPEARANCES : APPEARANCES)[role];

  const appsRoll = int(rng, min, max);
  let r = appsRoll.rng;
  const appearances = mods.suspended ? 0 : Math.round(appsRoll.value * competitionLoad(club));

  if (isKeeper) {
    const swing = float(r, 0.9, 1.1);
    r = swing.rng;
    const conceded = Math.max(
      0,
      Math.round(
        appearances *
          KEEPER_CONCEDE_FACTOR[clamp(club.rep[0], 0, 5)] *
          keeperGapFactor(gap) *
          swing.value *
          0.55
      )
    );
    const perGame = appearances === 0 ? 0 : conceded / appearances;
    const cleanSheets =
      appearances === 0 ? 0 : Math.max(0, Math.round(appearances * clamp(0.42 - perGame * 0.12, 0.05, 0.5)));
    return {
      rng: r,
      stats: {
        appearances,
        goals: 0,
        assists: 0,
        cleanSheets: Math.round(cleanSheets * mods.statsMultiplier),
        goalsConceded: Math.round(conceded * mods.statsMultiplier),
      },
    };
  }

  const band = productionBand(gap);
  const swing = float(r, 0.9, 1.1);
  r = swing.rng;
  const team = TEAM_OUTPUT_FACTOR[clamp(club.rep[0], 0, 5)];
  const quality = qualityFactor(player.overall);
  const scale = team * swing.value * mods.statsMultiplier * quality;

  return {
    rng: r,
    stats: {
      appearances,
      goals: Math.max(0, Math.round(appearances * GOALS_PER_GAME[player.style][band] * scale)),
      assists: Math.max(0, Math.round(appearances * ASSISTS_PER_GAME[player.style][band] * scale)),
      cleanSheets: 0,
      goalsConceded: 0,
    },
  };
}

/** Probabilidad de ganar la segunda división con tu media. */
function promotionOdds(overall: number): number {
  return PROMOTION_ODDS.find(([bar]) => overall <= bar)?.[1] ?? 0.3;
}

/** Títulos de club de la temporada. */
export function simulateClubTrophies(
  rng: Rng,
  player: Player,
  club: CareerClub,
  tier: 1 | 2,
  mods: SeasonModifiers
): { rng: Rng; trophies: Trophy[] } {
  const gap = player.overall - levelBarOf(club);
  const lift = starLiftFactor(gap);
  const domestic = effectiveRep(club.rep[0], player.overall);
  const continental = effectiveRep(club.rep[1], player.overall);
  const league = leagueOf(club.id);
  const inSecondTier = tier === 2;
  const confederation = league?.confederation ?? "UEFA";
  const hasSecondary = HAS_SECONDARY_CONTINENTAL.includes(confederation);

  // En segunda no hay copas continentales y la "liga" es el ascenso.
  const candidates: [Trophy, number, boolean][] = inSecondTier
    ? [
        ["league", Math.min(0.3, promotionOdds(player.overall) * mods.leagueTrophyMultiplier), false],
        ["cup", TROPHY_ODDS.cup[clamp(domestic, 0, 5)] * 0.5 * mods.cupTrophyMultiplier, true],
      ]
    : [
        ["league", TROPHY_ODDS.league[clamp(domestic, 0, 5)] * mods.leagueTrophyMultiplier, true],
        ["cup", TROPHY_ODDS.cup[clamp(domestic, 0, 5)] * mods.cupTrophyMultiplier, true],
        [
          "continental_primary",
          CONTINENTAL_ODDS.continental_primary[clamp(continental, 0, 5)] * mods.continentalPrimaryMultiplier,
          true,
        ],
        [
          "continental_secondary",
          hasSecondary
            ? CONTINENTAL_ODDS.continental_secondary[clamp(continental, 0, 5)] * mods.continentalSecondaryMultiplier
            : 0,
          true,
        ],
      ];

  const trophies: Trophy[] = [];
  let r = rng;
  let wonPrimary = false;

  for (const [trophy, odds, appliesLift] of candidates) {
    // No se gana la segunda competición continental el mismo año que la primera.
    if (trophy === "continental_secondary" && wonPrimary) continue;

    const override = mods.clubTrophyOverride?.trophy === trophy ? mods.clubTrophyOverride.result : null;
    if (override === "skip") continue;

    const p = Math.min(1, odds * (appliesLift ? lift : 1));
    const roll = chance(r, p);
    r = roll.rng;
    if (override === "force" || roll.value) {
      trophies.push(trophy);
      if (trophy === "continental_primary") wonPrimary = true;
    }
  }

  return { rng: r, trophies: mods.suspended ? [] : trophies };
}

// ── Selección ────────────────────────────────────────────────────────

/** ¿Toca torneo a esa edad? Continental cada 4 años desde los 17, Mundial desde los 19. */
function tournamentAt(age: number, start: number): boolean {
  return age >= start && (age - start) % TOURNAMENT_CYCLE === 0;
}

/** Torneos que caen dentro del próximo tramo de carrera. */
export function planTournaments(
  rng: Rng,
  countryCode: string,
  fromAge: number,
  seasons: number
): { rng: Rng; tournaments: UpcomingTournament[] } {
  const country = getCountry(countryCode);
  const out: UpcomingTournament[] = [];
  let r = rng;

  for (let i = 0; i < seasons; i++) {
    const age = fromAge + i;
    if (tournamentAt(age, CONTINENTAL_START_AGE)) {
      out.push({ trophy: "national_continental", age, qualified: true });
    }
    if (tournamentAt(age, WORLD_CUP_START_AGE)) {
      // Al Mundial hay que clasificarse; las selecciones flojas casi nunca llegan.
      const odds = WORLD_CUP_QUALIFY_ODDS[clamp(country?.rep[0] ?? 0, 0, WORLD_CUP_QUALIFY_ODDS.length - 1)];
      const roll = chance(r, odds);
      r = roll.rng;
      out.push({ trophy: "world_cup", age, qualified: roll.value });
    }
  }
  return { rng: r, tournaments: out };
}

/** ¿Te convocan este año, y cómo le va a tu selección? */
function simulateNationalTeam(
  rng: Rng,
  player: Player,
  tournaments: UpcomingTournament[],
  mods: SeasonModifiers
) {
  const country = getCountry(player.countryCode);
  const scheduled = tournaments.find((t) => t.age === player.age && t.qualified);
  if (!country || !scheduled) {
    return { rng, run: null, trophies: [] as Trophy[], calledUp: false };
  }

  const bar = NATIONAL_CALLUP_BAR[clamp(country.rep[2], 0, NATIONAL_CALLUP_BAR.length - 1)];
  const skipsThis = mods.nationalParticipation === "skip" && mods.nationalTournament === scheduled.trophy;
  const belowBar = player.overall < bar && mods.nationalParticipation !== "force";
  if (skipsThis || belowBar) {
    return { rng, run: null, trophies: [] as Trophy[], calledUp: false };
  }

  // ¿Se gana el torneo? Se decide antes para que el recorrido lo respete.
  const odds =
    scheduled.trophy === "national_continental"
      ? CONTINENTAL_TITLE_ODDS[clamp(country.rep[0], 0, CONTINENTAL_TITLE_ODDS.length - 1)]
      : WORLD_CUP_TITLE_ODDS[clamp(country.rep[1], 0, WORLD_CUP_TITLE_ODDS.length - 1)];

  const override =
    mods.nationalTrophyOverride?.trophy === scheduled.trophy ? mods.nationalTrophyOverride.result : null;
  const titleRoll = chance(rng, odds);
  let r = titleRoll.rng;
  const wins = override === "force" ? true : override === "skip" ? false : titleRoll.value;

  const sim = simulateNationalRun({
    rng: r,
    country,
    trophy: scheduled.trophy,
    overall: player.overall,
    style: player.style,
    forceWin: wins,
  });
  r = sim.rng;

  return {
    rng: r,
    run: sim.run,
    trophies: sim.run.won ? [scheduled.trophy] : [],
    calledUp: true,
  };
}

// ── Crecimiento ──────────────────────────────────────────────────────

/** La media solo se mueve en años pares, y la tabla depende del puesto. */
export function grow(rng: Rng, player: Player, nextAge: number): { rng: Rng; overall: number } {
  if (nextAge % 2 !== 0 || nextAge <= START_AGE) return { rng, overall: player.overall };
  const table = player.style === "goalkeeper" ? GROWTH_KEEPER : GROWTH_FIELD;
  const range = table[nextAge];
  if (!range) return { rng, overall: player.overall };
  const delta = int(rng, range[0], range[1]);
  return { rng: delta.rng, overall: clamp(player.overall + delta.value, MIN_OVERALL, MAX_OVERALL) };
}

// ── Temporada completa ───────────────────────────────────────────────

export interface SeasonInput {
  rng: Rng;
  player: Player;
  club: CareerClub;
  tier: 1 | 2;
  index: number;
  onLoan: boolean;
  displayName: string;
  tournaments: UpcomingTournament[];
  mods: SeasonModifiers;
}

export interface SeasonOutput {
  rng: Rng;
  snapshot: SeasonSnapshot;
  player: Player;
  /** División en la que jugará el club la próxima temporada, si cambió. */
  nextTier: 1 | 2 | null;
  calledUp: boolean;
}

export function simulateSeason({
  rng,
  player,
  club,
  tier,
  index,
  onLoan,
  displayName,
  tournaments,
  mods,
}: SeasonInput): SeasonOutput {
  let r = rng;

  // El efecto inmediato de un evento es temporal: dura el tramo y luego se va.
  // Lo permanente y lo diferido los aplica el motor sobre la media base.
  const playing: Player = {
    ...player,
    overall: clamp(player.overall + mods.immediateOverallDelta, MIN_OVERALL, MAX_OVERALL),
  };

  const value = marketValue(r, playing.overall, playing.age);
  r = value.rng;

  const role = resolveRole(playing, club, mods);
  const stats = simulateClubStats(r, playing, club, role, mods);
  r = stats.rng;

  const clubTrophies = simulateClubTrophies(r, playing, club, tier, mods);
  r = clubTrophies.rng;

  const national = simulateNationalTeam(r, playing, tournaments, mods);
  r = national.rng;

  const trophies: Trophy[] = [...clubTrophies.trophies, ...national.trophies];

  // La tabla se construye después para poder respetar el título ya decidido.
  const gap = playing.overall - levelBarOf(club);
  const table = buildLeagueTable({
    rng: r,
    clubId: club.id,
    tier,
    lift: userLift(gap, role),
    champion: clubTrophies.trophies.includes("league"),
  });
  if (table) r = table.rng;

  const league = currentLeague(club.id, tier) ?? leagueOf(club.id);
  const promoted = tier === 2 && clubTrophies.trophies.includes("league");
  const relegated = tier === 1 && !!table?.relegated && hasTier(league?.country ?? "", 2);

  // Descender borra los títulos de esa temporada: no cuadra bajar y ganar.
  const finalTrophies = relegated ? trophies.filter((t) => t === "world_cup" || t === "national_continental") : trophies;

  // Premios individuales.
  const seasonStats = combineStats(stats.stats, national.run?.stats ?? null);
  const awards = simulateAwards(r, playing, seasonStats, finalTrophies, league?.confederation === "UEFA", mods);
  r = awards.rng;

  // Top 5 del Balón de Oro, solo cuando de verdad estás en la pelea.
  let podium = null;
  const score = ballonDorScore(playing.overall, seasonStats, finalTrophies, playing.style);
  if (playing.overall >= 84 && !mods.suspended) {
    const built = buildBallonDorPodium({
      rng: r,
      userScore: score,
      userName: displayName,
      userClubId: club.id,
      userCountryCode: playing.countryCode,
      userWins: awards.awards.includes("ballon_dor") || awards.awards.includes("golden_glove"),
    });
    r = built.rng;
    podium = built.podium;
  }

  const snapshot: SeasonSnapshot = {
    index,
    age: playing.age,
    clubId: club.id,
    leagueId: league?.id ?? "",
    tier,
    role,
    overall: playing.overall,
    marketValue: value.value,
    stats: seasonStats,
    trophies: finalTrophies,
    awards: awards.awards,
    leagueTable: table?.table ?? [],
    leaguePosition: table?.position ?? 0,
    relegated,
    promoted,
    onLoan,
    national: national.run,
    ballonDor: podium,
  };

  // Envejeces: la media crece desde la base, no desde el bono temporal.
  const nextAge = player.age + 1;
  const grown = grow(r, player, nextAge);
  r = grown.rng;
  const nextValue = marketValue(r, grown.overall, nextAge);
  r = nextValue.rng;

  return {
    rng: r,
    snapshot,
    calledUp: national.calledUp,
    nextTier: promoted ? 1 : relegated ? 2 : null,
    player: {
      ...player,
      age: nextAge,
      overall: clamp(grown.overall, MIN_OVERALL, MAX_OVERALL),
      marketValue: nextValue.value,
    },
  };
}

function simulateAwards(
  rng: Rng,
  player: Player,
  stats: Stats,
  trophies: Trophy[],
  inEurope: boolean,
  mods: SeasonModifiers
): { rng: Rng; awards: Award[] } {
  if (mods.suspended) return { rng, awards: [] };
  const awards: Award[] = [];

  const bestOdds = ballonDorOdds(player.overall, trophies) * ballonDorStyleFactor(player.style);
  const best = chance(rng, bestOdds);
  let r = best.rng;
  if (best.value) awards.push(player.style === "goalkeeper" ? "golden_glove" : "ballon_dor");

  if (player.style !== "goalkeeper") {
    const boot = chance(r, goldenBootOdds(stats.goals, inEurope));
    r = boot.rng;
    if (boot.value) awards.push("golden_boot");
  }

  return { rng: r, awards };
}

/** Suma lo del club y lo de la selección en un único registro de temporada. */
function combineStats(club: Stats, national: Stats | null): Stats {
  if (!national) return club;
  return {
    appearances: club.appearances + national.appearances,
    goals: club.goals + national.goals,
    assists: club.assists + national.assists,
    cleanSheets: club.cleanSheets + national.cleanSheets,
    goalsConceded: club.goalsConceded + national.goalsConceded,
  };
}

/** Media inicial de un canterano de 16 años según el club que le ficha. */
export function startingOverall(rng: Rng, club: CareerClub): { rng: Rng; overall: number } {
  const base = 44 + clubLevel(club) * 2;
  const roll = int(rng, -3, 4);
  return { rng: roll.rng, overall: clamp(base + roll.value, MIN_OVERALL, 62) };
}

/** Un club existe de verdad (guarda contra ids sueltos en carreras guardadas). */
export function requireClub(id: string): CareerClub {
  const club = getClub(id);
  if (!club) throw new Error(`Club desconocido: ${id}`);
  return club;
}
