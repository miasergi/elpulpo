"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { PlayerIndex } from "@/lib/games/minigames";

const MAX_WRONG = 8;

// blur px por número de intentos fallidos
const BLUR = [20, 17, 14, 11, 8, 5, 3, 1, 0];
// grayscale % por número de intentos fallidos
const GRAY = [100, 90, 75, 55, 35, 15, 0, 0, 0];

const POS_LABEL: Record<string, string> = {
  Portero: "🧤 Portero",
  Defensa: "🛡️ Defensa",
  Centrocampista: "⚙️ Centrocampista",
  Delantero: "⚡ Delantero",
};

const STORAGE_KEY = "quien-es-game";

type SavedGame = { date: string; guesses: string[]; solved: boolean };

export function QuienEs({
  daily,
  allPlayers,
  today,
}: {
  daily: PlayerIndex;
  allPlayers: PlayerIndex[];
  today: string;
}) {
  const [guesses, setGuesses] = useState<string[]>([]);
  const [phase, setPhase] = useState<"playing" | "won" | "lost">("playing");
  const [inputVal, setInputVal] = useState("");
  const [suggestions, setSuggestions] = useState<PlayerIndex[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cargar partida guardada del día
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved: SavedGame = JSON.parse(raw);
      if (saved.date !== today) return;
      setGuesses(saved.guesses);
      const wrong = saved.guesses.filter((g) => g !== daily.name).length;
      if (saved.solved) setPhase("won");
      else if (wrong >= MAX_WRONG) setPhase("lost");
    } catch {}
  }, [today, daily.name]);

  const wrongGuesses = guesses.filter((g) => g !== daily.name);
  const wrongCount = wrongGuesses.length;
  const blurPx = BLUR[Math.min(wrongCount, BLUR.length - 1)];
  const grayPct = GRAY[Math.min(wrongCount, GRAY.length - 1)];
  const solved = guesses.includes(daily.name);

  function handleInput(val: string) {
    setInputVal(val);
    if (!val.trim()) { setSuggestions([]); return; }
    const lower = val.toLowerCase();
    setSuggestions(
      allPlayers.filter((p) => p.name.toLowerCase().includes(lower)).slice(0, 8),
    );
  }

  function submitGuess(playerName: string) {
    if (phase !== "playing" || guesses.includes(playerName)) return;
    setInputVal("");
    setSuggestions([]);

    const newGuesses = [...guesses, playerName];
    setGuesses(newGuesses);

    const correct = playerName === daily.name;
    const newWrong = newGuesses.filter((g) => g !== daily.name).length;
    let newPhase: "playing" | "won" | "lost" = "playing";
    if (correct) newPhase = "won";
    else if (newWrong >= MAX_WRONG) newPhase = "lost";
    if (newPhase !== "playing") setPhase(newPhase);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ date: today, guesses: newGuesses, solved: correct } satisfies SavedGame),
    );
  }

  const showPos = wrongCount >= 2;
  const showTeam = wrongCount >= 4;
  const showClub = wrongCount >= 6;
  const finished = phase !== "playing";
  const displayDate = today.slice(5).replace("-", "/");

  return (
    <div className="flex flex-col items-center gap-4 pb-8">
      {/* Foto con blur */}
      <div className="relative mt-3 h-56 w-56 overflow-hidden rounded-2xl bg-surface-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={daily.photo_url!}
          alt="¿Quién es?"
          className="h-full w-full object-cover object-top transition-[filter,transform] duration-700"
          style={{
            filter: `blur(${finished ? 0 : blurPx}px) grayscale(${finished ? 0 : grayPct}%)`,
            transform: blurPx > 0 && !finished ? "scale(1.1)" : "scale(1)",
          }}
        />
        {!finished && (
          <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-bold tabular-nums text-white">
            {MAX_WRONG - wrongCount} intentos
          </div>
        )}
      </div>

      {/* Pistas */}
      <div className="flex flex-wrap justify-center gap-2">
        <HintPill label="Posición" value={POS_LABEL[daily.position ?? ""] ?? daily.position ?? "—"} show={showPos || finished} />
        <HintPill label="Selección" value={daily.team_name} show={showTeam || finished} />
        {daily.club && <HintPill label="Club" value={daily.club} show={showClub || finished} />}
      </div>

      {/* Resultado */}
      {phase === "won" && (
        <ResultBanner
          win
          label={wrongCount === 0 ? "¡A la primera!" : `En ${guesses.length} intento${guesses.length !== 1 ? "s" : ""}`}
          sub={daily.name}
          guesses={guesses}
          daily={daily}
          today={today}
          displayDate={displayDate}
        />
      )}
      {phase === "lost" && (
        <ResultBanner
          win={false}
          label="¡Mañana será!"
          sub={`Era: ${daily.name} · ${daily.team_name}`}
          guesses={guesses}
          daily={daily}
          today={today}
          displayDate={displayDate}
        />
      )}

      {/* Lista de intentos */}
      {guesses.length > 0 && (
        <div className="flex w-full max-w-sm flex-col gap-1.5">
          {guesses.map((g, i) => {
            const ok = g === daily.name;
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                  ok ? "bg-pitch-500/20 text-pitch-300" : "bg-surface-3 text-muted",
                )}
              >
                <span className="shrink-0">{ok ? "✅" : "❌"}</span>
                <span className={cn("font-semibold", !ok && "line-through")}>{g}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Input */}
      {!finished && (
        <div className="relative w-full max-w-sm">
          <input
            ref={inputRef}
            value={inputVal}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && suggestions.length > 0) submitGuess(suggestions[0].name);
            }}
            placeholder="Escribe un jugador del mundial…"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
          />
          {suggestions.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1 w-full rounded-xl border border-border bg-surface shadow-xl">
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => submitGuess(p.name)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-surface-2 first:rounded-t-xl last:rounded-b-xl"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="ml-auto text-xs text-muted">{p.team_code}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HintPill({
  label,
  value,
  show,
}: {
  label: string;
  value: string;
  show: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-1.5 text-xs transition-all",
        show ? "border-border bg-surface" : "border-dashed border-border/50 bg-transparent",
      )}
    >
      <span className="text-muted">{label}: </span>
      <span className={cn("font-semibold", show ? "text-foreground" : "text-muted/40")}>
        {show ? value : "???"}
      </span>
    </div>
  );
}

function ResultBanner({
  win,
  label,
  sub,
  guesses,
  daily,
  today,
  displayDate,
}: {
  win: boolean;
  label: string;
  sub: string;
  guesses: string[];
  daily: PlayerIndex;
  today: string;
  displayDate: string;
}) {
  const [copied, setCopied] = useState(false);

  function buildShare() {
    const solved = guesses.includes(daily.name);
    const emojiRow = guesses.map((g) => (g === daily.name ? "✅" : "❌")).join("");
    return [
      `🐙 ¿Quién es? ${displayDate}`,
      solved
        ? `Adiviné en ${guesses.length} intento${guesses.length !== 1 ? "s" : ""}`
        : "No lo conseguí 😔",
      emojiRow,
      "elpulpo.vercel.app/app/games/quien-es",
    ].join("\n");
  }

  function share() {
    const text = buildShare();
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  return (
    <div
      className={cn(
        "w-full max-w-sm rounded-2xl border p-4 text-center",
        win
          ? "border-pitch-500/40 bg-pitch-500/10"
          : "border-danger/30 bg-danger/10",
      )}
    >
      <div className="text-4xl">{win ? "🎉" : "😔"}</div>
      <p className={cn("mt-2 text-lg font-black", win ? "text-pitch-300" : "text-danger")}>
        {label}
      </p>
      <p className="text-sm text-muted">{sub}</p>
      <button
        onClick={share}
        className="mt-3 w-full rounded-xl bg-primary/20 py-2 text-sm font-bold text-primary"
      >
        {copied ? "¡Copiado!" : "Compartir resultado"}
      </button>
    </div>
  );
}
