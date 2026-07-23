// ╔══════════════════════════════════════════════════════════════════╗
// ║  El motor de la carrera                                            ║
// ║                                                                    ║
// ║  Es un reducer puro: `decide(estado, opción) → estado`. Entre una  ║
// ║  decisión y la siguiente se simulan dos temporadas.                ║
// ║                                                                    ║
// ║  Nada aquí lee la hora ni tira de Math.random: dada la semilla y   ║
// ║  la lista de decisiones, la carrera sale idéntica. Eso es lo que   ║
// ║  permite guardarla en una fila de Supabase (semilla + decisiones)  ║
// ║  y reconstruirla entera con `replay()`.                            ║
// ╚══════════════════════════════════════════════════════════════════╝
import {
  DECLINE_RETIREMENT_OVERALL,
  INJURIES,
  MAX_OVERALL,
  MIN_OVERALL,
  PERIOD_SEASONS,
  POSITION_STYLE,
  RETIREMENT_AGE,
  START_AGE,
} from "./constants";
import { getClub, getCountry, leagueOf, tierOf } from "./data";
import {
  pickEvent,
  pickVariant,
  resolveChoice,
  type EventContext,
} from "./events";
import {
  generateAcademyOffers,
  generateLoanOffers,
  generateOffers,
  pickHomeClub,
  pickRivalClub,
} from "./offers";
import { chance, pick, type Rng } from "./rng";
import {
  NO_MODIFIERS,
  clamp,
  levelBarOf,
  marketValue,
  planTournaments,
  requireClub,
  resolveRole,
  simulateSeason,
  startingOverall,
  type SeasonModifiers,
} from "./season";
import type {
  CareerState,
  Decision,
  DecisionEvent,
  DecisionOption,
  Identity,
  Player,
  SeasonSnapshot,
  Totals,
  Trophy,
} from "./types";

const EMPTY_TOTALS: Totals = {
  appearances: 0, goals: 0, assists: 0, cleanSheets: 0, goalsConceded: 0,
  trophies: 0, awards: 0, seasons: 0,
};

// ── Arranque ─────────────────────────────────────────────────────────

/** Carrera nueva: el chaval tiene 16 años y tres canteras donde elegir. */
export function createCareer(seed: number, identity: Identity): CareerState {
  const player: Player = {
    age: START_AGE,
    overall: 0, // lo fija el club que le fiche
    marketValue: 0,
    position: identity.position,
    style: POSITION_STYLE[identity.position],
    countryCode: identity.countryCode,
  };

  const base: CareerState = {
    seed,
    rngState: seed | 0,
    step: 0,
    phase: "decision",
    identity,
    player,
    clubId: null,
    contractClubId: null,
    loan: null,
    seasons: [],
    totals: { ...EMPTY_TOTALS },
    currentEvent: null,
    completedEventKeys: [],
    injuryCount: 0,
    upcomingTournaments: [],
    clubTierOverrides: {},
    retirement: null,
  };

  const offers = generateAcademyOffers(rngOf(base), identity.countryCode);
  return {
    ...base,
    rngState: offers.rng.state,
    currentEvent: {
      id: eventId(base, "academy_offer"),
      kind: "academy_offer",
      age: START_AGE,
      options: offers.clubs.map((c) => ({
        id: `academy-${c.id}`,
        type: "join_club" as const,
        clubId: c.id,
      })),
    },
  };
}

// ── Decisión ─────────────────────────────────────────────────────────

/** Aplica una decisión y simula el tramo de carrera que viene después. */
export function decide(state: CareerState, optionId: string): CareerState {
  if (state.phase === "summary") return state;
  const event = state.currentEvent;
  if (!event) return state;

  const option = event.options.find((o) => o.id === optionId);
  if (!option) throw new Error(`Opción desconocida: ${optionId}`);

  if (option.type === "retire") {
    return { ...state, phase: "summary", currentEvent: null, step: state.step + 1, retirement: { age: state.player.age, reason: "voluntary" } };
  }

  let r = rngOf(state);
  let mods: SeasonModifiers = { ...NO_MODIFIERS };
  let completed = state.completedEventKeys;
  let injuryCount = state.injuryCount;
  let player = state.player;
  let countryCode = state.player.countryCode;

  // ── ¿Qué hace esta opción? ──
  if (option.type === "career_choice") {
    const resolved = resolveChoice({
      rng: r,
      eventKey: option.eventKey,
      optionKey: option.optionKey,
      variantKey: event.variantKey,
      injuryOverall: injuryDelta(event.context?.injuryKey),
      targetTrophy: event.context?.targetTrophy,
      nationalTournament: event.context?.tournament as Trophy | undefined,
    });
    r = resolved.rng;
    mods = resolved.mods;

    if (option.eventKey !== "injury") completed = [...completed, option.eventKey];
    else injuryCount += 1;

    // Cambiar de selección reprograma los torneos que te quedan.
    if (option.eventKey === "foreign_grandfather" && option.optionKey === "switch_national_team") {
      countryCode = event.context?.altCountryCode ?? countryCode;
    }
  } else if (event.kind === "career_event" && event.eventKey) {
    // Opciones de un evento que además te mueven de club (buscar salida,
    // aceptar al rival, volver a casa, regreso triunfal).
    if (!completed.includes(event.eventKey)) completed = [...completed, event.eventKey];
  }

  // Lo permanente se aplica ya sobre la media base.
  player = {
    ...player,
    countryCode,
    overall: clamp(player.overall + mods.permanentOverallDelta, MIN_OVERALL, MAX_OVERALL),
  };

  // ── ¿Dónde juegas ahora? ──
  const movement = resolveMovement(state, option);
  let clubId = movement.clubId;
  const contractClubId = movement.contractClubId;
  let loan = movement.loan;

  // Primer club: aquí es donde el canterano estrena media y valor.
  if (!state.clubId && clubId) {
    const club = requireClub(clubId);
    const start = startingOverall(r, club);
    r = start.rng;
    const value = marketValue(r, start.overall, player.age);
    r = value.rng;
    player = { ...player, overall: start.overall, marketValue: value.value };
  }

  // Los torneos del tramo se planifican antes de jugarlo.
  const plan = planTournaments(r, player.countryCode, player.age, PERIOD_SEASONS);
  r = plan.rng;
  const tournaments = plan.tournaments;

  // ── Se juegan las temporadas ──
  const seasons: SeasonSnapshot[] = [...state.seasons];
  let tierOverrides = { ...state.clubTierOverrides };
  let retirement = state.retirement;

  for (let i = 0; i < PERIOD_SEASONS; i++) {
    if (!clubId) break;
    const club = getClub(clubId);
    if (!club) break;

    // Al terminar la cesión vuelves a tu club, aunque queden temporadas.
    if (loan && player.age >= loan.returnAge) {
      clubId = loan.parentClubId;
      loan = null;
      continue;
    }

    const tier = tierOf(clubId, tierOverrides);
    const result = simulateSeason({
      rng: r,
      player,
      club,
      tier,
      index: seasons.length + 1,
      onLoan: !!loan,
      displayName: displayName(state.identity),
      tournaments,
      mods,
    });
    r = result.rng;
    seasons.push(result.snapshot);
    player = result.player;
    if (result.nextTier) tierOverrides = { ...tierOverrides, [clubId]: result.nextTier };

    if (player.age >= RETIREMENT_AGE) {
      retirement = { age: player.age, reason: "age" };
      break;
    }
    if (player.age >= 26 && player.overall < DECLINE_RETIREMENT_OVERALL) {
      retirement = { age: player.age, reason: "decline" };
      break;
    }
  }

  // Lo diferido llega al final del tramo ("recuperas los 2 de media").
  if (mods.deferredOverallDelta) {
    player = { ...player, overall: clamp(player.overall + mods.deferredOverallDelta, MIN_OVERALL, MAX_OVERALL) };
  }

  const next: CareerState = {
    ...state,
    step: state.step + 1,
    rngState: r.state,
    player,
    clubId,
    contractClubId,
    loan,
    seasons,
    totals: accumulate(seasons),
    completedEventKeys: completed,
    injuryCount,
    upcomingTournaments: tournaments,
    clubTierOverrides: tierOverrides,
    retirement,
    currentEvent: null,
    phase: retirement ? "summary" : "decision",
  };

  if (retirement) return next;
  return withNextDecision(next);
}

/** Adónde te lleva la opción elegida. */
function resolveMovement(
  state: CareerState,
  option: DecisionOption
): { clubId: string | null; contractClubId: string | null; loan: CareerState["loan"] } {
  const contract = state.contractClubId ?? state.clubId;

  if (option.type === "join_loan") {
    return {
      clubId: option.clubId,
      contractClubId: contract,
      loan: {
        parentClubId: contract ?? option.clubId,
        loanClubId: option.clubId,
        returnAge: state.player.age + PERIOD_SEASONS,
      },
    };
  }
  if (option.type === "join_club" || option.type === "permanent_transfer") {
    return { clubId: option.clubId, contractClubId: option.clubId, loan: null };
  }
  if (option.type === "stay") {
    return { clubId: option.clubId, contractClubId: option.clubId, loan: null };
  }
  if (option.type === "career_choice" && option.clubId) {
    // Eventos que te cambian de club (rival, vuelta a casa, buscar salida).
    return { clubId: option.clubId, contractClubId: option.clubId, loan: null };
  }
  // Sigues donde estabas, con la cesión intacta si la había.
  return { clubId: state.clubId, contractClubId: contract, loan: state.loan };
}

// ── Siguiente decisión ───────────────────────────────────────────────

function withNextDecision(state: CareerState): CareerState {
  let r = rngOf(state);

  // 1. Vuelves de una cesión: hay que decidir qué pasa contigo.
  if (state.loan && state.player.age >= state.loan.returnAge) {
    return postLoanDecision(state, r);
  }

  // 2. ¿Te renuevan? Si el club te queda muy grande y no juegas, no.
  const club = state.clubId ? getClub(state.clubId) : null;
  if (club) {
    const gap = state.player.overall - levelBarOf(club);
    const role = resolveRole(state.player, club, NO_MODIFIERS);
    if (gap <= -8 && (role === "substitute" || role === "low_rotation")) {
      const roll = chance(r, 0.5);
      r = roll.rng;
      if (roll.value) return contractEndDecision(state, r);
    }
  }

  // 3. Cesión para foguearse, si eres joven y no cuentas.
  if (club && state.player.age <= 21 && !state.loan) {
    const role = resolveRole(state.player, club, NO_MODIFIERS);
    if (role === "substitute" || role === "low_rotation") {
      const roll = chance(r, 0.6);
      r = roll.rng;
      if (roll.value) return loanDecision(state, r);
    }
  }

  // 4. Un dilema de vestuario, que es la sal del juego.
  const eventRoll = chance(r, 0.6);
  r = eventRoll.rng;
  if (eventRoll.value) {
    const built = careerEventDecision(state, r);
    if (built) return built;
  }

  // 5. Y si no, mercado de pases.
  return transferDecision(state, r);
}

function transferDecision(state: CareerState, rng: Rng): CareerState {
  const offers = generateOffers({
    rng,
    overall: state.player.overall,
    countryCode: state.player.countryCode,
    currentClubId: state.clubId,
  });
  const options: DecisionOption[] = offers.clubs.map((c) => ({
    id: `transfer-${state.step}-${c.id}`,
    type: "join_club" as const,
    clubId: c.id,
  }));
  if (state.clubId) {
    options.unshift({ id: `stay-${state.step}`, type: "stay", clubId: state.clubId });
  }
  if (state.player.age >= 32) {
    options.push({ id: `retire-${state.step}`, type: "retire" });
  }
  return {
    ...state,
    rngState: offers.rng.state,
    currentEvent: { id: eventId(state, "transfer"), kind: "transfer", age: state.player.age, options },
  };
}

function loanDecision(state: CareerState, rng: Rng): CareerState {
  const offers = generateLoanOffers(rng, state.player.overall, state.player.countryCode, state.clubId);
  if (!offers.clubs.length) return transferDecision(state, offers.rng);

  const options: DecisionOption[] = offers.clubs.map((c) => ({
    id: `loan-${state.step}-${c.id}`,
    type: "join_loan" as const,
    clubId: c.id,
  }));
  if (state.clubId) options.push({ id: `stay-${state.step}`, type: "stay", clubId: state.clubId });

  return {
    ...state,
    rngState: offers.rng.state,
    currentEvent: { id: eventId(state, "loan_offer"), kind: "loan_offer", age: state.player.age, options },
  };
}

function postLoanDecision(state: CareerState, rng: Rng): CareerState {
  const parentId = state.loan?.parentClubId ?? state.contractClubId;
  const parent = parentId ? getClub(parentId) : null;
  const retained = parent ? state.player.overall >= levelBarOf(parent) - 6 : true;

  const offers = generateOffers({
    rng,
    overall: state.player.overall,
    countryCode: state.player.countryCode,
    currentClubId: parentId,
    count: 2,
  });

  const options: DecisionOption[] = [];
  if (parentId) {
    options.push({
      id: `return-${state.step}`,
      type: retained ? "stay" : "permanent_transfer",
      clubId: parentId,
    });
  }
  for (const c of offers.clubs) {
    options.push(
      retained
        ? { id: `transfer-${state.step}-${c.id}`, type: "join_club", clubId: c.id }
        : { id: `loan-${state.step}-${c.id}`, type: "join_loan", clubId: c.id }
    );
  }

  return {
    ...state,
    rngState: offers.rng.state,
    loan: null,
    clubId: parentId,
    currentEvent: {
      id: eventId(state, "post_loan"),
      kind: retained ? "post_loan_retained" : "post_loan_not_retained",
      age: state.player.age,
      options,
    },
  };
}

function contractEndDecision(state: CareerState, rng: Rng): CareerState {
  const offers = generateOffers({
    rng,
    overall: state.player.overall,
    countryCode: state.player.countryCode,
    currentClubId: state.clubId,
  });
  const options: DecisionOption[] = offers.clubs.map((c) => ({
    id: `free-${state.step}-${c.id}`,
    type: "join_club" as const,
    clubId: c.id,
  }));
  if (state.player.age >= 30) options.push({ id: `retire-${state.step}`, type: "retire" });

  return {
    ...state,
    rngState: offers.rng.state,
    currentEvent: {
      id: eventId(state, "contract_non_renewal"),
      kind: "contract_non_renewal",
      age: state.player.age,
      options,
    },
  };
}

/** Un evento de vestuario, con sus opciones ya resueltas a clubes concretos. */
function careerEventDecision(state: CareerState, rng: Rng): CareerState | null {
  const club = state.clubId ? getClub(state.clubId) : null;
  const league = state.clubId ? leagueOf(state.clubId) : null;
  const country = getCountry(state.player.countryCode);

  const ctx: EventContext = {
    age: state.player.age,
    overall: state.player.overall,
    hasClub: !!club,
    abroad: !!league && league.country !== state.player.countryCode,
    hasNationalTeam: !!country && state.player.age < 36,
    clubsPlayed: new Set(state.seasons.map((s) => s.clubId)).size,
    injuryCount: state.injuryCount,
    completed: state.completedEventKeys,
    contender: !!club && club.rep[0] >= 2,
  };

  const chosen = pickEvent(rng, ctx);
  if (!chosen) return null;
  let r = chosen.rng;
  const def = chosen.def;

  const variant = pickVariant(r, def);
  r = variant.rng;

  const context: DecisionEvent["context"] = {};
  const options: DecisionOption[] = [];

  // Los eventos que te sacan del club necesitan un destino concreto.
  const needsClub = def.transferOptions ?? [];
  let exitClubId: string | null = null;
  if (needsClub.length) {
    if (def.key === "rival_offer") {
      const rival = pickRivalClub(r, state.clubId ?? "");
      r = rival.rng;
      if (!rival.club) return null;
      exitClubId = rival.club.id;
      context.rivalClubId = rival.club.id;
    } else if (def.key === "return_home") {
      const home = pickHomeClub(r, state.player.countryCode, state.player.overall);
      r = home.rng;
      if (!home.club) return null;
      exitClubId = home.club.id;
    } else {
      const exit = generateOffers({
        rng: r,
        overall: state.player.overall,
        countryCode: state.player.countryCode,
        currentClubId: state.clubId,
        count: 1,
      });
      r = exit.rng;
      if (!exit.clubs.length) return null;
      exitClubId = exit.clubs[0].id;
    }
  }

  // El "regreso triunfal" es un caso aparte: vuelves a donde empezaste.
  if (def.key === "triumphant_return") {
    const firstClubId = state.seasons[0]?.clubId;
    if (!firstClubId || firstClubId === state.clubId) return null;
    options.push({ id: `${def.key}-return-${state.step}`, type: "join_club", clubId: firstClubId });
    if (state.clubId) options.push({ id: `${def.key}-stay-${state.step}`, type: "stay", clubId: state.clubId });
  } else {
    for (const optionKey of def.optionKeys) {
      const movesClub = needsClub.includes(optionKey);
      options.push({
        id: `${def.key}-${optionKey}-${state.step}`,
        type: "career_choice",
        eventKey: def.key,
        optionKey,
        ...(movesClub && exitClubId ? { clubId: exitClubId } : {}),
      });
    }
  }

  if (!options.length) return null;

  // Datos que los textos necesitan para rellenar los huecos.
  if (def.key === "injury") {
    const injury = pick(r, INJURIES);
    r = injury.rng;
    context.injuryKey = injury.value.key;
  }
  if (def.key === "tax_trouble") {
    context.countryName = league ? getCountry(league.country)?.name ?? league.country : country?.name;
  }
  if (def.key === "foreign_grandfather") {
    const alt = pickAlternativeCountry(r, state.player.countryCode);
    r = alt.rng;
    if (!alt.code) return null;
    context.altCountryCode = alt.code;
  }
  if (def.key === "injury_at_peak" || def.key === "decisive_penalty") {
    const target = pickTargetTrophy(r, state);
    r = target.rng;
    context.targetTrophy = target.trophy;
  }
  if (def.key === "club_national_team_conflict") {
    const next = state.upcomingTournaments.find((t) => t.qualified);
    if (!next) return null;
    context.tournament = next.trophy;
  }

  return {
    ...state,
    rngState: r.state,
    currentEvent: {
      id: eventId(state, def.key),
      kind: "career_event",
      age: state.player.age,
      eventKey: def.key,
      variantKey: variant.variant,
      context,
      options,
    },
  };
}

/** Un país donde podrías tener un abuelo: siempre mejor que el tuyo. */
function pickAlternativeCountry(rng: Rng, currentCode: string): { rng: Rng; code: string | null } {
  const current = getCountry(currentCode);
  if (!current) return { rng, code: null };
  const better = ALL_COUNTRIES.filter((c) => c.code !== currentCode && c.rep[2] > current.rep[2]);
  if (!better.length) return { rng, code: null };
  const roll = pick(rng, better);
  return { rng: roll.rng, code: roll.value.code };
}

/** El título que está en juego cuando pitan el penalti decisivo. */
function pickTargetTrophy(rng: Rng, state: CareerState): { rng: Rng; trophy: Trophy } {
  const club = state.clubId ? getClub(state.clubId) : null;
  const candidates: Trophy[] = ["cup"];
  if (club && club.rep[0] >= 3) candidates.push("league");
  if (club && club.rep[1] >= 3) candidates.push("continental_primary");
  const nextTournament = state.upcomingTournaments.find((t) => t.qualified);
  if (nextTournament) candidates.push(nextTournament.trophy);
  const roll = pick(rng, candidates);
  return { rng: roll.rng, trophy: roll.value };
}

// ── Utilidades ───────────────────────────────────────────────────────

import { COUNTRIES as ALL_COUNTRIES } from "./data";

function rngOf(state: CareerState): Rng {
  return { state: state.rngState };
}

function eventId(state: CareerState, kind: string): string {
  return `${state.seed}-${state.step + 1}-${kind}`;
}

function injuryDelta(key?: string): number | undefined {
  if (!key) return undefined;
  return INJURIES.find((i) => i.key === key)?.overall;
}

export function displayName(identity: Identity): string {
  return identity.lastName.trim() || "Tu jugador";
}

function accumulate(seasons: SeasonSnapshot[]): Totals {
  return seasons.reduce<Totals>(
    (acc, s) => ({
      appearances: acc.appearances + s.stats.appearances,
      goals: acc.goals + s.stats.goals,
      assists: acc.assists + s.stats.assists,
      cleanSheets: acc.cleanSheets + s.stats.cleanSheets,
      goalsConceded: acc.goalsConceded + s.stats.goalsConceded,
      trophies: acc.trophies + s.trophies.length,
      awards: acc.awards + s.awards.length,
      seasons: acc.seasons + 1,
    }),
    { ...EMPTY_TOTALS }
  );
}

// ── Reproducción ─────────────────────────────────────────────────────

/**
 * Rehace una carrera guardada. Es la única forma de cargar una partida:
 * no se guarda el estado, se guardan la semilla y las decisiones.
 */
export function replay(seed: number, identity: Identity, decisions: Decision[]): CareerState {
  let state = createCareer(seed, identity);
  for (const d of decisions) {
    if (state.phase === "summary") break;
    state = decide(state, d.optionId);
  }
  return state;
}

/** Media máxima alcanzada, para el resumen final. */
export function peakOverall(state: CareerState): number {
  return state.seasons.reduce((max, s) => Math.max(max, s.overall), 0);
}

/** Valor de mercado más alto de la carrera. */
export function peakMarketValue(state: CareerState): number {
  return state.seasons.reduce((max, s) => Math.max(max, s.marketValue), 0);
}

/** Recuento de cada título ganado. */
export function trophyCount(state: CareerState): Record<Trophy, number> {
  const out = {
    league: 0, cup: 0, continental_primary: 0, continental_secondary: 0,
    national_continental: 0, world_cup: 0,
  } as Record<Trophy, number>;
  for (const s of state.seasons) for (const t of s.trophies) out[t] += 1;
  return out;
}

/** Clubes por los que pasaste, en orden, con las temporadas en cada uno. */
export function clubHistory(state: CareerState): { clubId: string; from: number; to: number; seasons: number }[] {
  const out: { clubId: string; from: number; to: number; seasons: number }[] = [];
  for (const s of state.seasons) {
    const last = out[out.length - 1];
    if (last && last.clubId === s.clubId) {
      last.to = s.age;
      last.seasons += 1;
    } else {
      out.push({ clubId: s.clubId, from: s.age, to: s.age, seasons: 1 });
    }
  }
  return out;
}

export const MAX_CAREER_OVERALL = MAX_OVERALL;
