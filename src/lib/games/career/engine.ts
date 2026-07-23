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
  CONTRACT_MAX,
  CONTRACT_MIN,
  DECLINE_RETIREMENT_OVERALL,
  INJURIES,
  LOAN_SEASONS,
  MAX_OVERALL,
  MIN_OVERALL,
  POSITION_STYLE,
  RETIREMENT_AGE,
  SEASONS_PER_STEP,
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
import { chance, int, pick, type Rng } from "./rng";
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
  Resolution,
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
    contractSeasonsLeft: 0,
    loan: null,
    seasons: [],
    totals: { ...EMPTY_TOTALS },
    currentEvent: null,
    lastResolution: null,
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
      // El primer contrato de cantera es de 3 temporadas.
      options: offers.clubs.map((c) => ({
        id: `academy-${c.id}`,
        type: "join_club" as const,
        clubId: c.id,
        contractSeasons: 3,
      })),
    },
  };
}

/** Duración de contrato por defecto cuando la oferta no trae una explícita. */
function defaultContractSeasons(age: number): number {
  return age >= 33 ? 2 : 3;
}

/** Duración de contrato de una oferta concreta: más corta cuanto mayor eres. */
function contractLength(rng: Rng, age: number): { rng: Rng; seasons: number } {
  const max = age >= 33 ? CONTRACT_MIN : age >= 30 ? 3 : CONTRACT_MAX;
  const roll = int(rng, CONTRACT_MIN, max);
  return { rng: roll.rng, seasons: roll.value };
}

/** Contrato que arranca al elegir esta opción (null = no cambia). */
function contractFromOption(option: DecisionOption, age: number): number | null {
  if (option.type === "join_club" || option.type === "permanent_transfer" || option.type === "stay") {
    return option.contractSeasons ?? defaultContractSeasons(age);
  }
  if (option.type === "career_choice" && option.clubId) {
    // Fichaje disparado por un evento (rival, vuelta a casa, regreso triunfal).
    return defaultContractSeasons(age);
  }
  return null;
}

// ── Decisión ─────────────────────────────────────────────────────────

/** Aplica una decisión y simula la temporada que viene después. */
export function decide(state: CareerState, optionId: string): CareerState {
  if (state.phase === "summary") return state;
  const event = state.currentEvent;
  if (!event) return state;

  const option = event.options.find((o) => o.id === optionId);
  if (!option) throw new Error(`Opción desconocida: ${optionId}`);

  if (option.type === "retire") {
    return {
      ...state,
      phase: "summary",
      currentEvent: null,
      lastResolution: null,
      step: state.step + 1,
      retirement: { age: state.player.age, reason: "voluntary" },
    };
  }

  // Forzar salida no juega temporada por sí misma: negocia y abre el mercado.
  if (option.type === "force_exit") {
    return resolveForceExit(state);
  }

  let r = rngOf(state);
  let mods: SeasonModifiers = { ...NO_MODIFIERS };
  let completed = state.completedEventKeys;
  let injuryCount = state.injuryCount;
  let player = state.player;
  let countryCode = state.player.countryCode;
  let resolution: Resolution | null = null;

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
    resolution = { eventKey: option.eventKey, optionKey: option.optionKey, kind: resolved.outcome };

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
  const clubId = movement.clubId;
  const contractClubId = movement.contractClubId;
  const loan = movement.loan;
  const signedContract = contractFromOption(option, player.age);
  const contractSeasonsLeft = signedContract ?? state.contractSeasonsLeft;

  // Primer club: aquí es donde el canterano estrena media y valor.
  if (!state.clubId && clubId) {
    const club = requireClub(clubId);
    const start = startingOverall(r, club);
    r = start.rng;
    const value = marketValue(r, start.overall, player.age);
    r = value.rng;
    player = { ...player, overall: start.overall, marketValue: value.value };
  }

  // ── Se juega UNA temporada ──
  const step = playSeason(state, r, player, clubId, loan, contractSeasonsLeft, {
    ...state.clubTierOverrides,
  }, mods);

  const next: CareerState = {
    ...state,
    step: state.step + 1,
    rngState: step.rng.state,
    player: step.player,
    clubId,
    contractClubId,
    contractSeasonsLeft: step.contractSeasonsLeft,
    loan,
    seasons: step.seasons,
    totals: accumulate(step.seasons),
    completedEventKeys: completed,
    injuryCount,
    upcomingTournaments: step.tournaments,
    clubTierOverrides: step.tierOverrides,
    retirement: step.retirement,
    currentEvent: null,
    lastResolution: resolution,
    phase: step.retirement ? "summary" : "decision",
  };

  if (step.retirement) return next;
  return withNextDecision(next);
}

/** Todo lo que ocurre en una temporada: torneos, partido, contrato y retiro. */
interface SeasonStep {
  rng: Rng;
  seasons: SeasonSnapshot[];
  player: Player;
  tierOverrides: Record<string, 1 | 2>;
  contractSeasonsLeft: number;
  tournaments: CareerState["upcomingTournaments"];
  retirement: CareerState["retirement"];
}

function playSeason(
  state: CareerState,
  rng: Rng,
  player: Player,
  clubId: string | null,
  loan: CareerState["loan"],
  contractSeasonsLeft: number,
  tierOverrides: Record<string, 1 | 2>,
  mods: SeasonModifiers
): SeasonStep {
  let r = rng;
  const seasons = [...state.seasons];
  let retirement = state.retirement;

  // Los torneos de la temporada se planifican antes de jugarla.
  const plan = planTournaments(r, player.countryCode, player.age, SEASONS_PER_STEP);
  r = plan.rng;

  const club = clubId ? getClub(clubId) : null;
  const returning = loan ? player.age >= loan.returnAge : false;

  if (club && !returning) {
    const tier = tierOf(clubId!, tierOverrides);
    const result = simulateSeason({
      rng: r,
      player,
      club,
      tier,
      index: seasons.length + 1,
      onLoan: !!loan,
      displayName: displayName(state.identity),
      tournaments: plan.tournaments,
      mods,
    });
    r = result.rng;
    seasons.push(result.snapshot);
    player = result.player;
    if (result.nextTier) tierOverrides = { ...tierOverrides, [clubId!]: result.nextTier };

    // El contrato solo corre cuando juegas en tu club (no durante la cesión).
    if (!loan && contractSeasonsLeft > 0) contractSeasonsLeft -= 1;

    if (player.age >= RETIREMENT_AGE) retirement = { age: player.age, reason: "age" };
    else if (player.age >= 26 && player.overall < DECLINE_RETIREMENT_OVERALL) {
      retirement = { age: player.age, reason: "decline" };
    }
  }

  // Lo diferido de un evento llega al final de la temporada.
  if (mods.deferredOverallDelta) {
    player = { ...player, overall: clamp(player.overall + mods.deferredOverallDelta, MIN_OVERALL, MAX_OVERALL) };
  }

  return { rng: r, seasons, player, tierOverrides, contractSeasonsLeft, tournaments: plan.tournaments, retirement };
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
        returnAge: state.player.age + LOAN_SEASONS,
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

// ── Forzar salida ────────────────────────────────────────────────────

/** Probabilidad de que el club te deje salir, según lo que juegues. */
function exitAcceptOdds(role: string): number {
  if (role === "substitute") return 0.9;
  if (role === "low_rotation") return 0.75;
  if (role === "high_rotation") return 0.55;
  return 0.4; // titular: el club se resiste a soltarte
}

/**
 * Pides salir. Si el club acepta, se abre el mercado en el acto (traspaso o
 * cesión). Si te retiene, juegas la temporada con menos protagonismo.
 */
function resolveForceExit(state: CareerState): CareerState {
  let r = rngOf(state);
  const club = state.clubId ? getClub(state.clubId) : null;
  if (!club) return withNextDecision({ ...state, step: state.step + 1, rngState: r.state });

  const role = resolveRole(state.player, club, NO_MODIFIERS);
  const roll = chance(r, exitAcceptOdds(role));
  r = roll.rng;
  const resolution: Resolution = { kind: roll.value ? "positive" : "negative", accepted: roll.value };

  if (roll.value) {
    // Te dejan ir: eliges destino ya, sin jugar la temporada aquí.
    return exitOffersDecision({ ...state, step: state.step + 1, lastResolution: resolution }, r);
  }

  // Te retienen: juegas la temporada con el rol un escalón por debajo.
  const mods: SeasonModifiers = { ...NO_MODIFIERS, roleShift: -1 };
  const step = playSeason(state, r, state.player, state.clubId, state.loan, state.contractSeasonsLeft, {
    ...state.clubTierOverrides,
  }, mods);

  const next: CareerState = {
    ...state,
    step: state.step + 1,
    rngState: step.rng.state,
    player: step.player,
    contractSeasonsLeft: step.contractSeasonsLeft,
    seasons: step.seasons,
    totals: accumulate(step.seasons),
    upcomingTournaments: step.tournaments,
    clubTierOverrides: step.tierOverrides,
    retirement: step.retirement,
    currentEvent: null,
    lastResolution: resolution,
    phase: step.retirement ? "summary" : "decision",
  };
  if (step.retirement) return next;
  return withNextDecision(next);
}

// ── Siguiente decisión ───────────────────────────────────────────────

function withNextDecision(state: CareerState): CareerState {
  let r = rngOf(state);
  const club = state.clubId ? getClub(state.clubId) : null;

  // 1. Vuelves de una cesión: hay que decidir qué pasa contigo.
  if (state.loan && state.player.age >= state.loan.returnAge) {
    return postLoanDecision(state, r);
  }

  // 2. Contrato agotado: renovar, cambiar de aire o retirarse.
  if (!state.loan && state.contractSeasonsLeft <= 0) {
    if (!club) return transferDecision(state, r, false);
    const gap = state.player.overall - levelBarOf(club);
    const role = resolveRole(state.player, club, NO_MODIFIERS);
    const notRetained = gap <= -8 && (role === "substitute" || role === "low_rotation");
    return notRetained ? contractEndDecision(state, r) : transferDecision(state, r, true);
  }

  // 3. Cesión para foguearse, si eres joven y no cuentas.
  if (club && state.player.age <= 21 && !state.loan) {
    const role = resolveRole(state.player, club, NO_MODIFIERS);
    if (role === "substitute" || role === "low_rotation") {
      const roll = chance(r, 0.5);
      r = roll.rng;
      if (roll.value) return loanDecision(state, r);
    }
  }

  // 4. Un dilema de vestuario, que es la sal del juego.
  const eventRoll = chance(r, 0.5);
  r = eventRoll.rng;
  if (eventRoll.value) {
    const built = careerEventDecision(state, r);
    if (built) return built;
  }

  // 5. Y si no, una temporada más en tu club.
  return continueDecision(state, r);
}

/** Añade la duración de contrato a una lista de clubes ofrecidos. */
function withContracts(
  rng: Rng,
  clubs: { id: string }[],
  age: number
): { rng: Rng; offers: { clubId: string; contractSeasons: number }[] } {
  let r = rng;
  const offers = clubs.map((c) => {
    const len = contractLength(r, age);
    r = len.rng;
    return { clubId: c.id, contractSeasons: len.seasons };
  });
  return { rng: r, offers };
}

/** Pantalla de "sigue una temporada más", con opción de forzar salida. */
function continueDecision(state: CareerState, rng: Rng): CareerState {
  const options: DecisionOption[] = [{ id: `continue-${state.step}`, type: "continue" }];
  // Solo puedes forzar la salida si tienes club, no estás cedido y aún te
  // queda contrato por cumplir.
  if (state.clubId && !state.loan && state.contractSeasonsLeft > 1) {
    options.push({ id: `force-exit-${state.step}`, type: "force_exit" });
  }
  if (state.player.age >= 34) options.push({ id: `retire-${state.step}`, type: "retire" });

  return {
    ...state,
    rngState: rng.state,
    currentEvent: { id: eventId(state, "continue"), kind: "continue", age: state.player.age, options },
  };
}

/** Ofertas tras conseguir salir: puedes fichar o irte cedido. */
function exitOffersDecision(state: CareerState, rng: Rng): CareerState {
  const transfers = generateOffers({
    rng,
    overall: state.player.overall,
    countryCode: state.player.countryCode,
    currentClubId: state.clubId,
    count: 2,
  });
  const loans = generateLoanOffers(transfers.rng, state.player.overall, state.player.countryCode, state.clubId);
  const withLen = withContracts(loans.rng, transfers.clubs, state.player.age);

  const options: DecisionOption[] = withLen.offers.map((o) => ({
    id: `exit-${state.step}-${o.clubId}`,
    type: "join_club" as const,
    clubId: o.clubId,
    contractSeasons: o.contractSeasons,
  }));
  for (const c of loans.clubs) {
    options.push({ id: `exit-loan-${state.step}-${c.id}`, type: "join_loan", clubId: c.id });
  }
  if (state.clubId) options.push({ id: `stay-${state.step}`, type: "stay", clubId: state.clubId });

  return {
    ...state,
    rngState: withLen.rng.state,
    currentEvent: { id: eventId(state, "forced_exit"), kind: "forced_exit", age: state.player.age, options },
  };
}

/** Mercado de fichajes. `renewal` añade la opción de renovar con tu club. */
function transferDecision(state: CareerState, rng: Rng, renewal: boolean): CareerState {
  const offers = generateOffers({
    rng,
    overall: state.player.overall,
    countryCode: state.player.countryCode,
    currentClubId: state.clubId,
  });
  const withLen = withContracts(offers.rng, offers.clubs, state.player.age);

  const options: DecisionOption[] = withLen.offers.map((o) => ({
    id: `transfer-${state.step}-${o.clubId}`,
    type: "join_club" as const,
    clubId: o.clubId,
    contractSeasons: o.contractSeasons,
  }));

  let r: Rng = { state: withLen.rng.state };
  if (renewal && state.clubId) {
    const renew = contractLength(r, state.player.age);
    r = renew.rng;
    options.unshift({ id: `stay-${state.step}`, type: "stay", clubId: state.clubId, contractSeasons: renew.seasons });
  }
  if (state.player.age >= 32) {
    options.push({ id: `retire-${state.step}`, type: "retire" });
  }
  return {
    ...state,
    rngState: r.state,
    currentEvent: { id: eventId(state, "transfer"), kind: "transfer", age: state.player.age, options },
  };
}

function loanDecision(state: CareerState, rng: Rng): CareerState {
  const offers = generateLoanOffers(rng, state.player.overall, state.player.countryCode, state.clubId);
  if (!offers.clubs.length) return continueDecision(state, offers.rng);

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
  const withLen = withContracts(offers.rng, offers.clubs, state.player.age);

  const options: DecisionOption[] = [];
  if (parentId) {
    // Volver al club matriz: si te quieren, renuevas; si no, firmas definitivo.
    const home = contractLength({ state: withLen.rng.state }, state.player.age);
    options.push({
      id: `return-${state.step}`,
      type: retained ? "stay" : "permanent_transfer",
      clubId: parentId,
      contractSeasons: home.seasons,
    });
  }
  for (const o of withLen.offers) {
    options.push(
      retained
        ? { id: `transfer-${state.step}-${o.clubId}`, type: "join_club", clubId: o.clubId, contractSeasons: o.contractSeasons }
        : { id: `loan-${state.step}-${o.clubId}`, type: "join_loan", clubId: o.clubId }
    );
  }

  return {
    ...state,
    rngState: withLen.rng.state,
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
  const withLen = withContracts(offers.rng, offers.clubs, state.player.age);

  const options: DecisionOption[] = withLen.offers.map((o) => ({
    id: `free-${state.step}-${o.clubId}`,
    type: "join_club" as const,
    clubId: o.clubId,
    contractSeasons: o.contractSeasons,
  }));
  if (state.player.age >= 30) options.push({ id: `retire-${state.step}`, type: "retire" });

  return {
    ...state,
    rngState: withLen.rng.state,
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
