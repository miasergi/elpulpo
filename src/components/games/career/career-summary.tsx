"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RotateCcw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { careerAchievements, careerVerdict, verdictEmoji } from "@/lib/games/career/achievements";
import { clubHistory, peakMarketValue, peakOverall, trophyCount } from "@/lib/games/career/engine";
import { getClub, getCountry } from "@/lib/games/career/data";
import { flagUrl } from "@/lib/games/career/countries.data";
import { AWARD_EMOJI, AWARD_NAME, formatValue, trophyLabel } from "@/lib/games/career/text";
import { POSITION_NAME } from "@/lib/games/career/constants";
import type { Award, CareerState, Trophy } from "@/lib/games/career/types";
import { ClubCrest } from "./club-crest";
import { OverallChart } from "./overall-chart";
import { SeasonReveal } from "./season-reveal";

const TROPHY_ORDER: Trophy[] = [
  "world_cup", "national_continental", "continental_primary",
  "continental_secondary", "league", "cup",
];
const AWARD_ORDER: Award[] = ["ballon_dor", "golden_boot", "golden_glove"];

/** La pantalla final: todo lo que construiste, en un sitio. */
export function CareerSummary({
  state,
  onReplay,
}: {
  state: CareerState;
  onReplay: () => void;
}) {
  const verdict = careerVerdict(state);
  const emoji = verdictEmoji(state);
  const awards = countAwards(state);
  const achievements = careerAchievements(state);
  const unlocked = achievements.filter((a) => a.unlocked);
  const clubs = clubHistory(state);
  const country = getCountry(state.identity.countryCode);
  const peak = peakOverall(state);
  const value = peakMarketValue(state);
  const name = state.identity.lastName.trim() || "Tu jugador";

  return (
    <div className="space-y-4 pb-10">
      <div className="relative overflow-hidden rounded-2xl border border-warning/40 bg-gradient-to-br from-warning/20 via-surface/80 to-primary/10 p-6 text-center">
        <div className="text-6xl">{emoji}</div>
        <h2 className="mt-2 text-2xl font-black leading-tight">{verdict}</h2>
        <p className="mt-1 flex items-center justify-center gap-2 text-sm font-semibold text-muted">
          {country && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={flagUrl(country)} alt="" width={20} height={15} className="h-[15px] w-5 rounded-sm object-cover" />
          )}
          {name} · {POSITION_NAME[state.identity.position]} · #{state.identity.number}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {state.totals.seasons} temporadas · se retiró con {state.retirement?.age ?? state.player.age} años
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <BigStat label="Partidos" value={state.totals.appearances} />
        {state.identity.position === "POR" ? (
          <BigStat label="A cero" value={state.totals.cleanSheets} />
        ) : (
          <BigStat label="Goles" value={state.totals.goals} />
        )}
        <BigStat label="Media máx." value={peak} />
        <BigStat label="Títulos" value={state.totals.trophies} />
        <BigStat label="Premios" value={state.totals.awards} />
        <BigStat label="Valor máx." value={formatValue(value)} small />
      </div>

      <section className="rounded-2xl border border-border bg-surface/60 p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Vitrina</h3>
        {state.totals.trophies === 0 && state.totals.awards === 0 ? (
          <p className="py-3 text-center text-sm text-muted">
            Vitrina vacía. No todas las carreras acaban con una copa.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {namedTrophies(state).map((t) => (
              <span
                key={t.name}
                className="flex items-center gap-1.5 rounded-lg border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-xs font-bold text-warning"
              >
                <span className="text-base">{t.emoji}</span>
                {t.name}
                {t.count > 1 && <span className="tabular-nums">×{t.count}</span>}
              </span>
            ))}
            {AWARD_ORDER.filter((a) => awards[a] > 0).map((a) => (
              <span
                key={a}
                className="flex items-center gap-1.5 rounded-lg border border-pulpo-500/30 bg-pulpo-500/10 px-2.5 py-1.5 text-xs font-bold text-pulpo-200"
              >
                <span className="text-base">{AWARD_EMOJI[a]}</span>
                {AWARD_NAME[a]}
                {awards[a] > 1 && <span className="tabular-nums">×{awards[a]}</span>}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface/60 p-4">
        <OverallChart seasons={state.seasons} />
      </section>

      <section className="rounded-2xl border border-border bg-surface/60 p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Trayectoria</h3>
        <div className="space-y-2">
          {clubs.map((spell, i) => {
            const club = getClub(spell.clubId);
            return (
              <div key={`${spell.clubId}-${i}`} className="flex items-center gap-3">
                <ClubCrest club={club} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{club?.name ?? spell.clubId}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {spell.from}–{spell.to} años · {spell.seasons} {spell.seasons === 1 ? "temporada" : "temporadas"}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface/60 p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Logros · {unlocked.length}/{achievements.length}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {achievements.map((a) => (
            <div
              key={a.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border p-2",
                a.unlocked ? "border-pulpo-500/30 bg-pulpo-500/10" : "border-border/60 bg-surface-2/40 opacity-45"
              )}
              title={a.desc}
            >
              <span className="text-lg">{a.emoji}</span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold">{a.title}</span>
                <span className="block truncate text-[10px] text-muted-foreground">{a.desc}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <details className="rounded-2xl border border-border bg-surface/60 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-pulpo-200">
          Ver las {state.seasons.length} temporadas una a una
        </summary>
        <div className="mt-3 space-y-2.5">
          {state.seasons.map((s, i) => (
            <SeasonReveal
              key={s.index}
              season={s}
              countryCode={state.player.countryCode}
              isKeeper={state.identity.position === "POR"}
              previousOverall={i > 0 ? state.seasons[i - 1].overall : undefined}
            />
          ))}
        </div>
      </details>

      <ShareCareer state={state} verdict={verdict} emoji={emoji} />

      <Button size="full" variant="outline" onClick={onReplay}>
        <RotateCcw className="h-4 w-4" /> Empezar otra carrera
      </Button>
    </div>
  );
}

function BigStat({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface/60 px-2 py-3 text-center">
      <p className={cn("font-black tabular-nums", small ? "text-sm" : "text-xl")}>{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function countAwards(state: CareerState): Record<Award, number> {
  const out = { ballon_dor: 0, golden_boot: 0, golden_glove: 0 } as Record<Award, number>;
  for (const s of state.seasons) for (const a of s.awards) out[a] += 1;
  return out;
}

const TROPHY_RANK: Record<Trophy, number> = {
  world_cup: 0, national_continental: 1, continental_primary: 2,
  continental_secondary: 3, league: 4, cup: 5,
};

/**
 * Los títulos agrupados por su competición real, no por categoría: así en la
 * vitrina se distingue "LaLiga ×3" de "Premier League ×2" de "Champions
 * League ×1", en vez de un genérico "Liga ×5".
 */
function namedTrophies(state: CareerState): { name: string; emoji: string; count: number; rank: number }[] {
  const map = new Map<string, { name: string; emoji: string; count: number; rank: number }>();
  for (const s of state.seasons) {
    for (const t of s.trophies) {
      const { name, emoji } = trophyLabel(t, s.leagueId, s.national?.tournament);
      const cur = map.get(name);
      if (cur) cur.count += 1;
      else map.set(name, { name, emoji, count: 1, rank: TROPHY_RANK[t] });
    }
  }
  return [...map.values()].sort((a, b) => a.rank - b.rank || b.count - a.count);
}

// ── Compartir ────────────────────────────────────────────────────────

function buildShareText(state: CareerState, verdict: string, emoji: string): string {
  const clubs = clubHistory(state);
  const name = state.identity.lastName.trim() || "Mi futbolista";
  const path = clubs
    .slice(0, 5)
    .map((c) => getClub(c.clubId)?.short ?? c.clubId)
    .join(" → ");

  const palmares = namedTrophies(state)
    .map((t) => `${t.emoji} ${t.name}${t.count > 1 ? ` ×${t.count}` : ""}`)
    .join("\n");

  return [
    `Mi carrera en El Pulpo: ${name} ${emoji}`,
    `${verdict} · media máxima ${peakOverall(state)}`,
    path,
    palmares,
    `${state.totals.appearances} partidos · ${state.totals.goals} goles`,
    "elpulpo.vercel.app",
  ]
    .filter(Boolean)
    .join("\n");
}

function ShareCareer({ state, verdict, emoji }: { state: CareerState; verdict: string; emoji: string }) {
  const [busy, setBusy] = useState(false);
  const trophies = trophyCount(state);
  const lastClub = getClub(state.seasons[state.seasons.length - 1]?.clubId ?? "");

  const imageUrl =
    `/api/og/career?name=${encodeURIComponent(state.identity.lastName.trim() || "Jugador")}` +
    `&num=${state.identity.number}` +
    `&verdict=${encodeURIComponent(verdict)}&emoji=${encodeURIComponent(emoji)}` +
    `&ovr=${peakOverall(state)}&apps=${state.totals.appearances}&goals=${state.totals.goals}` +
    `&seasons=${state.totals.seasons}&value=${peakMarketValue(state)}` +
    `&club=${encodeURIComponent(lastClub?.short ?? "")}` +
    `&country=${encodeURIComponent(state.identity.countryCode)}` +
    `&t=${TROPHY_ORDER.map((t) => trophies[t]).join(",")}`;

  const text = buildShareText(state, verdict, emoji);

  async function share() {
    setBusy(true);
    try {
      const absolute = `${window.location.origin}${imageUrl}`;
      try {
        const res = await fetch(absolute);
        const blob = await res.blob();
        const file = new File([blob], "mi-carrera.png", { type: "image/png" });
        const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
        if (nav.canShare?.({ files: [file] }) && navigator.share) {
          await navigator.share({ files: [file], text });
          return;
        }
      } catch {
        /* si la imagen falla, se comparte solo el texto */
      }
      if (navigator.share) {
        await navigator.share({ text, url: window.location.origin });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success("Texto copiado · pégalo en WhatsApp");
    } catch {
      /* cancelado por el usuario */
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="full" variant="primary" onClick={share} loading={busy} className="h-13 text-base">
      {!busy && <Share2 className="h-5 w-5" />} Compartir mi carrera
    </Button>
  );
}
