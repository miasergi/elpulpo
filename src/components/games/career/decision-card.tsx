"use client";

import { ArrowRight, Check, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getClub, getCountry, leagueOf } from "@/lib/games/career/data";
import {
  DECISION_TEXT,
  OPTION_LABEL,
  TROPHY_NAME,
  eventText,
  fillPlaceholders,
  type OptionText,
} from "@/lib/games/career/text";
import { INJURIES } from "@/lib/games/career/constants";
import { tournamentName } from "@/lib/games/career/national";
import type { CareerState, DecisionOption } from "@/lib/games/career/types";
import { ClubCrest } from "./club-crest";

/**
 * La pantalla donde el jugador decide. Enseña siempre las consecuencias y su
 * probabilidad, como el juego original: saber a qué juegas es lo que hace que
 * la decisión pese.
 */
export function DecisionCard({
  state,
  onChoose,
  busy,
}: {
  state: CareerState;
  onChoose: (optionId: string) => void;
  busy?: boolean;
}) {
  const event = state.currentEvent;
  if (!event) return null;

  const isCareerEvent = event.kind === "career_event" && !!event.eventKey;
  const text = isCareerEvent ? eventText(event.eventKey!, event.variantKey) : null;
  const values = placeholderValues(state);

  const title = text ? fillPlaceholders(text.title, values) : DECISION_TEXT[event.kind].title;
  const description = text
    ? fillPlaceholders(text.description, values)
    : DECISION_TEXT[event.kind].description;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-pulpo-500/30 bg-gradient-to-br from-pulpo-500/12 via-surface/80 to-surface/50 p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-pulpo-300">
          {isCareerEvent ? "Decisión" : DECISION_TEXT[event.kind].title}
        </p>
        <h2 className="mt-1 text-xl font-extrabold leading-tight">{title}</h2>
        <p className="mt-1.5 text-sm text-muted">{description}</p>
      </div>

      <div className="space-y-2.5">
        {event.options.map((option) => (
          <OptionButton
            key={option.id}
            option={option}
            text={optionTextFor(option, text)}
            values={values}
            disabled={busy}
            onClick={() => onChoose(option.id)}
          />
        ))}
      </div>
    </div>
  );
}

function optionTextFor(option: DecisionOption, text: ReturnType<typeof eventText> | null): OptionText | null {
  if (!text || option.type !== "career_choice") return null;
  return text.options[option.optionKey] ?? null;
}

function OptionButton({
  option,
  text,
  values,
  disabled,
  onClick,
}: {
  option: DecisionOption;
  text: OptionText | null;
  values: Record<string, string | undefined>;
  disabled?: boolean;
  onClick: () => void;
}) {
  const club = "clubId" in option && option.clubId ? getClub(option.clubId) : null;
  const league = club ? leagueOf(club.id) : null;
  const label = text ? fillPlaceholders(text.label, values) : clubLabel(option, club?.name ?? "");

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full rounded-xl border border-border bg-surface/70 p-3.5 text-left transition-all",
        "hover:border-pulpo-400/60 hover:bg-surface-2/70 active:scale-[0.99]",
        "disabled:pointer-events-none disabled:opacity-50"
      )}
    >
      <div className="flex items-center gap-3">
        {club ? (
          <ClubCrest club={club} size={38} />
        ) : (
          <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-surface-3 text-muted-foreground">
            <ArrowRight className="h-4 w-4" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{label}</span>
          {league && (
            <span className="block truncate text-[11px] text-muted-foreground">
              {league.name}
              {league.tier === 2 && " · 2.ª división"}
            </span>
          )}
        </span>
        {club && <ClubStrength level={club.rep[2]} />}
      </div>

      {text && (
        <div className="mt-2.5 space-y-1 border-t border-border/60 pt-2.5">
          {text.positive && <Outcome kind="positive" outcome={text.positive} values={values} />}
          {text.negative && <Outcome kind="negative" outcome={text.negative} values={values} />}
          {text.certain && <Outcome kind="neutral" outcome={{ text: text.certain }} values={values} />}
        </div>
      )}
    </button>
  );
}

function Outcome({
  kind,
  outcome,
  values,
}: {
  kind: "positive" | "negative" | "neutral";
  outcome: { probability?: number; text: string };
  values: Record<string, string | undefined>;
}) {
  const Icon = kind === "positive" ? TrendingUp : kind === "negative" ? TrendingDown : Minus;
  const tone =
    kind === "positive" ? "text-pitch-400" : kind === "negative" ? "text-danger" : "text-muted-foreground";

  return (
    <p className="flex items-center gap-2 text-xs">
      <Icon className={cn("h-3.5 w-3.5 shrink-0", tone)} />
      {outcome.probability != null && (
        <span className="shrink-0 rounded bg-surface-3/80 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-foreground">
          {outcome.probability}%
        </span>
      )}
      <span className="min-w-0 flex-1 text-muted">{fillPlaceholders(outcome.text, values)}</span>
    </p>
  );
}

/** Cinco puntitos con el nivel del club, para comparar ofertas de un vistazo. */
function ClubStrength({ level }: { level: number }) {
  return (
    <span className="flex shrink-0 items-center gap-0.5" title={`Nivel del club: ${level} de 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={cn("h-1.5 w-1.5 rounded-full", i < level ? "bg-pulpo-400" : "bg-surface-3")}
        />
      ))}
    </span>
  );
}

function clubLabel(option: DecisionOption, teamName: string): string {
  switch (option.type) {
    case "join_club":
      return OPTION_LABEL.join(teamName);
    case "join_loan":
      return OPTION_LABEL.loan(teamName);
    case "permanent_transfer":
      return OPTION_LABEL.permanent(teamName);
    case "stay":
      return OPTION_LABEL.stay(teamName);
    case "retire":
      return OPTION_LABEL.retire;
    default:
      return teamName;
  }
}

/** Los datos con los que se rellenan los huecos de los textos. */
function placeholderValues(state: CareerState): Record<string, string | undefined> {
  const event = state.currentEvent;
  const club = state.clubId ? getClub(state.clubId) : null;
  const league = state.clubId ? leagueOf(state.clubId) : null;
  const rival = event?.context?.rivalClubId ? getClub(event.context.rivalClubId) : null;
  const altCountry = event?.context?.altCountryCode ? getCountry(event.context.altCountryCode) : null;
  const targetTrophy = event?.context?.targetTrophy;

  return {
    team: rival?.short ?? club?.short ?? "tu club",
    rival: rival?.short ?? "un rival",
    country: event?.context?.countryName ?? getCountry(league?.country ?? "")?.name ?? "tu país",
    altCountry: altCountry?.name,
    injury: event?.context?.injuryKey
      ? INJURIES.find((i) => i.key === event.context?.injuryKey)?.name ?? "Lesión"
      : "Lesión",
    tournament: event?.context?.tournament
      ? tournamentName(state.player.countryCode, event.context.tournament as never)
      : undefined,
    championship: targetTrophy
      ? targetTrophy === "world_cup" || targetTrophy === "national_continental"
        ? tournamentName(state.player.countryCode, targetTrophy)
        : `la ${TROPHY_NAME[targetTrophy].toLowerCase()}`
      : "el título",
  };
}

/** Marca de que la opción elegida ya se aplicó (la usa el revelado). */
export function ChosenBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-pulpo-500/20 px-2.5 py-1 text-[11px] font-bold text-pulpo-200">
      <Check className="h-3 w-3" /> {label}
    </span>
  );
}
