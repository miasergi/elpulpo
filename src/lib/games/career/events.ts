// ╔══════════════════════════════════════════════════════════════════╗
// ║  Eventos de carrera                                                ║
// ║                                                                    ║
// ║  Los 22 dilemas del juego original. Cada uno declara cuándo puede  ║
// ║  aparecer y qué hace cada opción; los textos viven en text.ts.     ║
// ║                                                                    ║
// ║  Ningún evento se repite en una misma carrera (salvo las lesiones, ║
// ║  que pueden caer hasta dos veces).                                 ║
// ╚══════════════════════════════════════════════════════════════════╝
import { MAX_INJURIES } from "./constants";
import { chance, pickWeighted, type Rng } from "./rng";
import { NO_MODIFIERS, type SeasonModifiers } from "./season";
import type { EventKey, Trophy } from "./types";

/** Lo que un evento necesita para poder salir. */
export interface EventContext {
  age: number;
  overall: number;
  hasClub: boolean;
  /** Juega fuera de su país. */
  abroad: boolean;
  /** Le queda algún torneo de selección por delante. */
  hasNationalTeam: boolean;
  /** Ya ha pasado por varios clubes (para el "regreso triunfal"). */
  clubsPlayed: number;
  injuryCount: number;
  completed: EventKey[];
  /** Peleará por algún título esta temporada (para el penalti decisivo). */
  contender: boolean;
}

export interface EventDefinition {
  key: EventKey;
  weight: number;
  optionKeys: string[];
  /** Opciones que llevan a otro club: hay que generarles oferta. */
  transferOptions?: string[];
  /** Variantes del mismo dilema, con textos y números propios. */
  variants?: { key: string; weight: number }[];
  available: (ctx: EventContext) => boolean;
}

export const EVENTS: EventDefinition[] = [
  {
    key: "training_extra",
    weight: 100,
    optionKeys: ["accept", "reject"],
    variants: [{ key: "preseason_camp", weight: 100 }],
    available: (c) => c.age <= 30,
  },
  {
    key: "personal_coach",
    weight: 90,
    optionKeys: ["accept", "reject"],
    variants: [{ key: "nutrition_plan", weight: 100 }],
    available: (c) => c.age >= 18,
  },
  {
    key: "mysterious_substance",
    weight: 55,
    optionKeys: ["consume", "reject"],
    available: (c) => c.age >= 20,
  },
  {
    key: "season_load",
    weight: 95,
    optionKeys: ["accept", "stay_calm"],
    variants: [{ key: "double_session", weight: 100 }],
    available: (c) => c.age >= 19,
  },
  {
    key: "position_change",
    weight: 80,
    optionKeys: ["accept", "reject"],
    available: (c) => c.age >= 20 && c.hasClub,
  },
  {
    key: "position_competition",
    weight: 85,
    optionKeys: ["compete"],
    available: (c) => c.hasClub,
  },
  {
    key: "unexpected_prospect",
    weight: 70,
    optionKeys: ["mentor", "search_exit"],
    transferOptions: ["search_exit"],
    available: (c) => c.age >= 28 && c.hasClub,
  },
  {
    key: "club_priority",
    weight: 70,
    optionKeys: ["prioritize_league", "prioritize_continental"],
    available: (c) => c.hasClub && c.overall >= 75,
  },
  {
    key: "rival_offer",
    weight: 75,
    optionKeys: ["accept", "reject"],
    transferOptions: ["accept"],
    available: (c) => c.age >= 22 && c.hasClub && c.overall >= 72,
  },
  {
    key: "club_crisis",
    weight: 70,
    optionKeys: ["stay_and_fight", "search_exit"],
    transferOptions: ["search_exit"],
    available: (c) => c.age >= 21 && c.hasClub,
  },
  {
    key: "fan_backlash",
    weight: 65,
    optionKeys: ["stay_and_fight", "search_exit"],
    transferOptions: ["search_exit"],
    available: (c) => c.age >= 21 && c.hasClub,
  },
  {
    key: "return_home",
    weight: 70,
    optionKeys: ["stay_abroad", "return_home"],
    transferOptions: ["return_home"],
    available: (c) => c.abroad && c.age >= 24,
  },
  {
    key: "giant_tattoo",
    weight: 55,
    optionKeys: ["accept", "reject"],
    available: (c) => c.age >= 19,
  },
  {
    key: "tax_trouble",
    weight: 55,
    optionKeys: ["stay_and_fight", "search_exit"],
    transferOptions: ["search_exit"],
    available: (c) => c.age >= 26 && c.overall >= 78,
  },
  {
    key: "foreign_grandfather",
    weight: 45,
    optionKeys: ["switch_national_team", "keep_national_team"],
    available: (c) => c.age <= 26 && c.hasNationalTeam,
  },
  {
    key: "finish_high_school",
    weight: 60,
    optionKeys: ["accept", "reject"],
    available: (c) => c.age <= 21,
  },
  {
    key: "controversial_statement",
    weight: 60,
    optionKeys: ["apologize"],
    available: (c) => c.age >= 22 && c.hasClub,
  },
  {
    key: "triumphant_return",
    weight: 60,
    optionKeys: [],
    available: (c) => c.age >= 32 && c.clubsPlayed >= 3,
  },
  {
    key: "club_national_team_conflict",
    weight: 65,
    optionKeys: ["go_anyway", "comply"],
    available: (c) => c.hasNationalTeam && c.hasClub,
  },
  {
    key: "injury_at_peak",
    weight: 60,
    optionKeys: ["play_injured", "recover"],
    available: (c) => c.age >= 22 && c.contender,
  },
  {
    key: "injury",
    weight: 70,
    optionKeys: ["continue"],
    available: (c) => c.age >= 19 && c.injuryCount < MAX_INJURIES,
  },
  {
    key: "decisive_penalty",
    weight: 55,
    optionKeys: ["left", "right"],
    available: (c) => c.contender && c.overall >= 70,
  },
];

const BY_KEY = new Map(EVENTS.map((e) => [e.key, e]));

export function eventDefinition(key: EventKey): EventDefinition {
  const def = BY_KEY.get(key);
  if (!def) throw new Error(`Evento desconocido: ${key}`);
  return def;
}

/** Elige el próximo evento entre los que puede vivir ahora mismo. */
export function pickEvent(rng: Rng, ctx: EventContext): { rng: Rng; def: EventDefinition } | null {
  const pool = EVENTS.filter((e) => {
    if (e.key !== "injury" && ctx.completed.includes(e.key)) return false;
    if (e.key === "injury" && ctx.injuryCount >= MAX_INJURIES) return false;
    return e.available(ctx);
  });
  if (!pool.length) return null;
  const roll = pickWeighted(rng, pool.map((item) => ({ item, weight: item.weight })));
  return { rng: roll.rng, def: roll.value };
}

/** Algunos eventos tienen una variante con otro texto y otros números. */
export function pickVariant(rng: Rng, def: EventDefinition): { rng: Rng; variant?: string } {
  if (!def.variants?.length) return { rng };
  // La mitad de las veces sale la versión original.
  const useVariant = chance(rng, 0.5);
  if (!useVariant.value) return { rng: useVariant.rng };
  const roll = pickWeighted(useVariant.rng, def.variants.map((v) => ({ item: v.key, weight: v.weight })));
  return { rng: roll.rng, variant: roll.value };
}

export type OutcomeKind = "positive" | "negative" | "neutral";

export interface ResolvedChoice {
  rng: Rng;
  mods: SeasonModifiers;
  outcome: OutcomeKind;
}

export interface ChoiceInput {
  rng: Rng;
  eventKey: EventKey;
  optionKey: string;
  variantKey?: string;
  /** Lesión concreta, cuando el evento es una lesión. */
  injuryOverall?: number;
  /** Título en juego, para el penalti decisivo y la lesión en el mejor momento. */
  targetTrophy?: Trophy;
  nationalTournament?: Trophy;
}

/**
 * Consecuencias de la decisión. Todas las tiradas ocurren aquí, en el momento
 * de decidir, para que el resultado se pueda enseñar al instante.
 */
export function resolveChoice({
  rng,
  eventKey,
  optionKey,
  variantKey,
  injuryOverall,
  targetTrophy,
  nationalTournament,
}: ChoiceInput): ResolvedChoice {
  const mods: SeasonModifiers = { ...NO_MODIFIERS };
  let r = rng;
  let outcome: OutcomeKind = "neutral";

  const roll = (p: number): boolean => {
    const c = chance(r, p);
    r = c.rng;
    return c.value;
  };

  switch (`${eventKey}:${optionKey}`) {
    case "training_extra:accept": {
      const camp = variantKey === "preseason_camp";
      const ok = roll(camp ? 0.65 : 0.7);
      mods.immediateOverallDelta = ok ? (camp ? 4 : 3) : camp ? -3 : -2;
      outcome = ok ? "positive" : "negative";
      break;
    }
    case "personal_coach:accept": {
      const nutrition = variantKey === "nutrition_plan";
      const ok = roll(nutrition ? 0.6 : 0.5);
      mods.permanentOverallDelta = ok ? (nutrition ? 3 : 2) : -2;
      outcome = ok ? "positive" : "negative";
      break;
    }
    case "mysterious_substance:consume": {
      const caught = roll(0.25);
      outcome = caught ? "negative" : "positive";
      if (caught) mods.suspended = true;
      else mods.immediateOverallDelta = 5;
      break;
    }
    case "season_load:accept": {
      const ok = roll(variantKey === "double_session" ? 0.65 : 0.7);
      mods.roleOverride = ok ? "starter" : "substitute";
      outcome = ok ? "positive" : "negative";
      break;
    }
    case "season_load:stay_calm":
      mods.roleShift = -1;
      break;
    case "position_change:accept":
      mods.roleOverride = "starter";
      mods.immediateOverallDelta = -2;
      mods.deferredOverallDelta = 2;
      break;
    case "position_change:reject":
      mods.roleShift = -1;
      outcome = "negative";
      break;
    case "position_competition:compete": {
      const ok = roll(0.5);
      mods.roleOverride = ok ? "starter" : "low_rotation";
      outcome = ok ? "positive" : "negative";
      break;
    }
    case "unexpected_prospect:mentor":
      mods.roleShift = -1;
      multiplyTrophies(mods, 2);
      break;
    case "club_priority:prioritize_league":
      mods.leagueTrophyMultiplier = 2;
      mods.continentalPrimaryMultiplier = 0.5;
      break;
    case "club_priority:prioritize_continental":
      mods.leagueTrophyMultiplier = 0.5;
      mods.continentalPrimaryMultiplier = 2;
      break;
    case "rival_offer:accept":
      mods.roleOverride = "high_rotation";
      multiplyTrophies(mods, 2);
      break;
    case "club_crisis:stay_and_fight":
      multiplyTrophies(mods, 0.1);
      outcome = "negative";
      break;
    case "fan_backlash:stay_and_fight":
      mods.immediateOverallDelta = -2;
      mods.deferredOverallDelta = 2;
      outcome = "negative";
      break;
    case "return_home:stay_abroad":
      mods.immediateOverallDelta = -5;
      mods.deferredOverallDelta = 5;
      outcome = "negative";
      break;
    case "giant_tattoo:accept": {
      const ok = roll(0.7);
      outcome = ok ? "positive" : "negative";
      if (ok) mods.permanentOverallDelta = 2;
      else mods.roleOverride = "substitute";
      break;
    }
    case "tax_trouble:stay_and_fight":
      mods.immediateOverallDelta = -3;
      mods.deferredOverallDelta = 3;
      outcome = "negative";
      break;
    case "finish_high_school:accept":
      mods.permanentOverallDelta = 1;
      mods.roleShift = -1;
      break;
    case "controversial_statement:apologize":
      mods.roleShift = -1;
      outcome = "negative";
      break;
    case "club_national_team_conflict:go_anyway":
      mods.roleOverride = "substitute";
      mods.nationalParticipation = "force";
      mods.nationalTournament = nationalTournament;
      break;
    case "club_national_team_conflict:comply":
      mods.nationalParticipation = "skip";
      mods.nationalTournament = nationalTournament;
      break;
    case "injury:continue":
      mods.immediateOverallDelta = injuryOverall ?? -3;
      mods.roleOverride = "substitute";
      outcome = "negative";
      break;
    case "injury_at_peak:play_injured": {
      const ok = roll(0.8);
      outcome = ok ? "positive" : "negative";
      mods.immediateOverallDelta = -1;
      if (targetTrophy) mods.clubTrophyOverride = { trophy: targetTrophy, result: ok ? "force" : "skip" };
      break;
    }
    case "injury_at_peak:recover": {
      const ok = roll(0.3);
      outcome = ok ? "positive" : "negative";
      if (targetTrophy) mods.clubTrophyOverride = { trophy: targetTrophy, result: ok ? "force" : "skip" };
      break;
    }
    case "decisive_penalty:left":
    case "decisive_penalty:right": {
      const scored = roll(0.5);
      outcome = scored ? "positive" : "negative";
      if (targetTrophy) {
        const decision = { trophy: targetTrophy, result: scored ? ("force" as const) : ("skip" as const) };
        if (targetTrophy === "world_cup" || targetTrophy === "national_continental") {
          mods.nationalTrophyOverride = decision;
        } else {
          mods.clubTrophyOverride = decision;
        }
      }
      break;
    }
    default:
      // "reject", "keep_national_team", "search_exit"… no cambian nada por sí solas.
      break;
  }

  return { rng: r, mods, outcome };
}

function multiplyTrophies(mods: SeasonModifiers, factor: number) {
  mods.leagueTrophyMultiplier *= factor;
  mods.cupTrophyMultiplier *= factor;
  mods.continentalPrimaryMultiplier *= factor;
  mods.continentalSecondaryMultiplier *= factor;
}
