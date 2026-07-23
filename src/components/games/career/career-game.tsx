"use client";

import { useCallback, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Confetti } from "@/components/games/confetti";
import { haptic, playTick } from "@/lib/sound";
import { createCareer, decide, replay } from "@/lib/games/career/engine";
import { randomSeed } from "@/lib/games/career/rng";
import { getClub, getCountry } from "@/lib/games/career/data";
import { flagUrl } from "@/lib/games/career/countries.data";
import { POSITION_NAME } from "@/lib/games/career/constants";
import { eventText, formatValue, trophyLabel } from "@/lib/games/career/text";
import type { CareerState, Decision, DecisionOption, Identity } from "@/lib/games/career/types";
import type { SavedCareer } from "@/lib/games/career/store";
import { ClubCrest } from "./club-crest";
import { DecisionCard, placeholderValues } from "./decision-card";
import { CareerSummary } from "./career-summary";
import { IdentityStep } from "./identity-step";
import { SeasonReveal } from "./season-reveal";
import { RollOverlay, type Roll } from "./roll-overlay";

/**
 * Dueño del estado de la carrera. El motor es puro, así que aquí solo se
 * guarda la semilla y la lista de decisiones: con eso se reconstruye todo,
 * y es también lo único que viaja a Supabase.
 */
export function CareerGame({ saved }: { saved: SavedCareer | null }) {
  // El id vive en una ref, no en el estado: la primera decisión suele llegar
  // antes de que el POST inicial responda, y con estado se guardaría `null`
  // otra vez y se crearía una fila nueva en cada jugada.
  const runId = useRef<string | null>(saved?.id ?? null);
  /** Guardados en vuelo, para que el segundo no adelante al primero. */
  const saving = useRef<Promise<void>>(Promise.resolve());
  const [seed, setSeed] = useState<number>(saved?.seed ?? 0);
  const [decisions, setDecisions] = useState<Decision[]>(saved?.decisions ?? []);
  const [state, setState] = useState<CareerState | null>(() =>
    saved ? replay(saved.seed, saved.identity, saved.decisions) : null
  );
  const [confetti, setConfetti] = useState(false);
  const [busy, setBusy] = useState(false);
  /** Tirada de dados en curso: se anima antes de aplicar la decisión. */
  const [pending, setPending] = useState<{ next: CareerState; optionId: string; roll: Roll } | null>(null);
  /** Temporadas jugadas antes de la última decisión, para resaltar las nuevas. */
  const [seenSeasons, setSeenSeasons] = useState(saved ? Number.MAX_SAFE_INTEGER : 0);
  const listTop = useRef<HTMLDivElement | null>(null);

  const persist = useCallback(
    (next: CareerState, nextDecisions: Decision[], careerSeed: number) => {
      // Se encadenan los guardados: cada uno espera al anterior, así el
      // segundo ya conoce el id que devolvió el primero.
      saving.current = saving.current.then(async () => {
        try {
          const res = await fetch("/api/games/career", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: runId.current,
              seed: careerSeed,
              identity: next.identity,
              decisions: nextDecisions,
            }),
          });
          if (!res.ok) return;
          const json = (await res.json()) as { id?: string };
          if (json.id) runId.current = json.id;
        } catch {
          // Guardar es un extra: si falla, se sigue jugando sin molestar.
        }
      });
    },
    []
  );

  function start(identity: Identity) {
    const careerSeed = randomSeed();
    const fresh = createCareer(careerSeed, identity);
    setSeed(careerSeed);
    setDecisions([]);
    setSeenSeasons(0);
    setState(fresh);
    playTick("tap");
    persist(fresh, [], careerSeed);
  }

  function choose(optionId: string) {
    if (!state || busy) return;
    const option = state.currentEvent?.options.find((o) => o.id === optionId);
    const next = decide(state, optionId);

    // Si la decisión tenía azar, primero se anima la tirada; el resultado se
    // aplica cuando termina la animación.
    const roll = rollFor(state, option, next);
    if (roll) {
      setBusy(true);
      playTick("tap");
      setPending({ next, optionId, roll });
      return;
    }
    apply(state, next, optionId);
  }

  function apply(from: CareerState, next: CareerState, optionId: string) {
    const before = from.seasons.length;
    const nextDecisions = [...decisions, { optionId }];

    setSeenSeasons(before);
    setDecisions(nextDecisions);
    setState(next);
    setPending(null);
    playTick("tap");

    // Un título nuevo merece su confeti.
    const freshTrophies = next.seasons.slice(before).some((s) => s.trophies.length > 0);
    if (freshTrophies) {
      setConfetti(true);
      haptic(30);
      setTimeout(() => setConfetti(false), 3500);
    }

    persist(next, nextDecisions, seed);
    listTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setBusy(false);
  }

  function replayCareer() {
    setState(null);
    setDecisions([]);
    runId.current = null;
    setSeenSeasons(0);
  }

  // La pantalla se deduce del estado; no hace falta guardarla aparte.
  if (!state) return <IdentityStep onConfirm={start} />;

  if (state.phase === "summary") {
    return (
      <>
        {confetti && <Confetti />}
        <CareerSummary state={state} onReplay={replayCareer} />
      </>
    );
  }

  const newSeasons = state.seasons.slice(seenSeasons === Number.MAX_SAFE_INTEGER ? state.seasons.length : seenSeasons);
  const oldSeasons = state.seasons.slice(0, state.seasons.length - newSeasons.length);
  const freshTrophies = newSeasons.flatMap((s) => s.trophies.map((t) => ({ trophy: t, leagueId: s.leagueId, tournament: s.national?.tournament })));

  return (
    <div className="space-y-4 pb-24">
      {confetti && <Confetti />}
      {pending && <RollOverlay roll={pending.roll} onDone={() => apply(state, pending.next, pending.optionId)} />}

      <PlayerBar state={state} />

      <div ref={listTop} />

      {freshTrophies.length > 0 && <TrophyBanner trophies={freshTrophies} />}

      {newSeasons.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-pulpo-300">
            {newSeasons.length === 1 ? "Última temporada" : "Últimas temporadas"}
          </h2>
          {newSeasons.map((s) => (
            <SeasonReveal
              key={s.index}
              season={s}
              countryCode={state.player.countryCode}
              isKeeper={state.identity.position === "POR"}
              previousOverall={previousOverall(state, s.index)}
            />
          ))}
        </section>
      )}

      {state.currentEvent && (
        <div className="space-y-2">
          {state.currentEvent.kind !== "continue" && (
            <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-pulpo-300">
              <Sparkles className="h-3.5 w-3.5" /> Te toca decidir
            </h2>
          )}
          <DecisionCard state={state} onChoose={choose} busy={busy} />
        </div>
      )}

      {oldSeasons.length > 0 && (
        <details className="rounded-2xl border border-border bg-surface/50 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-pulpo-200">
            Trayectoria anterior ({oldSeasons.length} {oldSeasons.length === 1 ? "temporada" : "temporadas"})
          </summary>
          <div className="mt-3 space-y-2.5">
            {oldSeasons.map((s) => (
              <SeasonReveal
                key={s.index}
                season={s}
                countryCode={state.player.countryCode}
                isKeeper={state.identity.position === "POR"}
                previousOverall={previousOverall(state, s.index)}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/** La chapa de arriba: quién eres, dónde juegas y cuánto vales. */
function PlayerBar({ state }: { state: CareerState }) {
  const club = state.clubId ? getClub(state.clubId) : null;
  const country = getCountry(state.identity.countryCode);
  const name = state.identity.lastName.trim() || "Tu jugador";

  return (
    <div className="sticky top-14 z-20 -mx-1 rounded-xl border border-border bg-surface/95 p-3 backdrop-blur-lg">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <ClubCrest club={club} size={40} />
          {country && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={flagUrl(country)}
              alt=""
              width={18}
              height={13}
              className="absolute -bottom-1 -right-1 h-[13px] w-[18px] rounded-[2px] object-cover ring-1 ring-surface"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold">
            {name} <span className="text-muted-foreground">#{state.identity.number}</span>
          </p>
          <p className="truncate text-[11px] text-muted">
            {club?.short ?? "Sin club"} · {POSITION_NAME[state.identity.position]}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">{contractLabel(state)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-black tabular-nums leading-none">{state.player.overall || "—"}</p>
          <p className="text-[10px] text-muted-foreground">{state.player.age} años</p>
        </div>
        {state.player.marketValue > 0 && (
          <div className="shrink-0 border-l border-border pl-3 text-right">
            <p className="text-xs font-bold tabular-nums">{formatValue(state.player.marketValue)}</p>
            <p className="text-[10px] text-muted-foreground">valor</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Estado del contrato para la chapa de arriba. */
function contractLabel(state: CareerState): string {
  if (state.loan) return `Cedido · vuelve con ${state.loan.returnAge} años`;
  const left = state.contractSeasonsLeft;
  if (left <= 0) return "Agente libre";
  return `Contrato · ${left} ${left === 1 ? "temporada" : "temporadas"}`;
}

/** Pancarta de celebración cuando acabas de ganar algo. */
function TrophyBanner({
  trophies,
}: {
  trophies: { trophy: import("@/lib/games/career/types").Trophy; leagueId: string; tournament?: string }[];
}) {
  const labels = trophies.map((t) => trophyLabel(t.trophy, t.leagueId, t.tournament));
  return (
    <div className="rounded-2xl border border-warning/50 bg-gradient-to-br from-warning/25 via-surface/80 to-primary/10 p-4 text-center">
      <p className="text-2xl">🎉</p>
      <p className="mt-1 text-sm font-black text-warning">
        {trophies.length === 1 ? "¡Has ganado un título!" : `¡Has ganado ${trophies.length} títulos!`}
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {labels.map((l, i) => (
          <span key={i} className="rounded-full bg-warning/20 px-2.5 py-1 text-xs font-bold text-warning">
            {l.emoji} {l.name}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Construye la tirada a animar, o null si la decisión no tenía azar. */
function rollFor(state: CareerState, option: DecisionOption | undefined, next: CareerState): Roll | null {
  if (!option) return null;

  if (option.type === "force_exit" && next.lastResolution?.accepted != null) {
    return { kind: "exit", accepted: next.lastResolution.accepted };
  }

  if (option.type === "career_choice" && state.currentEvent?.eventKey) {
    const text = eventText(state.currentEvent.eventKey, state.currentEvent.variantKey);
    const opt = text.options[option.optionKey];
    // Solo se anima cuando de verdad hay dos caras con probabilidad.
    if (opt?.positive && opt?.negative && (opt.positive.probability != null || opt.negative.probability != null)) {
      return {
        kind: "event",
        positive: opt.positive,
        negative: opt.negative,
        result: next.lastResolution?.kind ?? "neutral",
        values: placeholderValues(state),
      };
    }
  }
  return null;
}

function previousOverall(state: CareerState, index: number): number | undefined {
  const i = state.seasons.findIndex((s) => s.index === index);
  return i > 0 ? state.seasons[i - 1].overall : undefined;
}
