"use client";

import { useState, useEffect } from "react";
import { TeamFlag } from "@/components/match/team-flag";
import { cn } from "@/lib/utils";
import type { PlayerIndex } from "@/lib/games/minigames";

const BEST_KEY = "club-quiz-best";

type Phase = "loading" | "playing" | "feedback" | "gameover";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function wrongClubs(all: PlayerIndex[], correct: string): string[] {
  const pool = [...new Set(all.map((p) => p.club).filter(Boolean) as string[])].filter(
    (c) => c !== correct,
  );
  return shuffle(pool).slice(0, 2);
}

export function ClubQuiz() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [allPlayers, setAllPlayers] = useState<PlayerIndex[]>([]);
  const [queue, setQueue] = useState<PlayerIndex[]>([]);
  const [current, setCurrent] = useState<PlayerIndex | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);

  useEffect(() => {
    const saved = parseInt(localStorage.getItem(BEST_KEY) ?? "0", 10);
    setBest(saved);
  }, []);

  useEffect(() => {
    fetch("/api/games/players-index")
      .then((r) => r.json())
      .then(({ players }) => {
        const valid = (players as PlayerIndex[]).filter((p) => p.club);
        setAllPlayers(valid);
        beginGame(valid);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function beginGame(pool: PlayerIndex[]) {
    const q = shuffle(pool);
    setCurrent(q[0]);
    setQueue(q.slice(1));
    setOptions(shuffle([q[0].club!, ...wrongClubs(pool, q[0].club!)]));
    setStreak(0);
    setSelected(null);
    setPhase("playing");
  }

  function handlePick(club: string) {
    if (phase !== "playing" || !current) return;
    setSelected(club);
    setPhase("feedback");
    const correct = club === current.club;

    setTimeout(() => {
      if (!correct) {
        const finalBest = Math.max(streak, best);
        setBest(finalBest);
        localStorage.setItem(BEST_KEY, String(finalBest));
        setPhase("gameover");
        return;
      }

      const newStreak = streak + 1;
      const newBest = Math.max(newStreak, best);
      setBest(newBest);
      setStreak(newStreak);
      localStorage.setItem(BEST_KEY, String(newBest));

      const next = queue.length > 0 ? queue[0] : shuffle(allPlayers)[0];
      const rest = queue.length > 0 ? queue.slice(1) : shuffle(allPlayers).slice(1);
      setCurrent(next);
      setQueue(rest);
      setOptions(shuffle([next.club!, ...wrongClubs(allPlayers, next.club!)]));
      setSelected(null);
      setPhase("playing");
    }, 1300);
  }

  function shareResult() {
    const text = `🐙 ¿De qué club es?\n\nRacha: ${streak}\nMi récord: ${best}\n\nelpulpo.vercel.app/app/games/club-quiz`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  if (phase === "loading") {
    return (
      <div className="flex justify-center py-20 text-sm text-muted">Cargando jugadores…</div>
    );
  }

  if (phase === "gameover" && current) {
    return (
      <div className="flex flex-col items-center gap-5 py-8 text-center">
        <div className="text-5xl">💀</div>
        <div>
          <p className="text-2xl font-black">Racha rota</p>
          <p className="mt-1.5 text-sm text-muted">
            <span className="font-semibold text-foreground">{current.name}</span> juega en{" "}
            <span className="font-semibold text-foreground">{current.club}</span>
          </p>
        </div>
        <div className="flex gap-12">
          <div className="text-center">
            <p className="text-xs text-muted">Racha</p>
            <p className="text-4xl font-black tabular-nums">{streak}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted">Récord</p>
            <p className="text-4xl font-black tabular-nums text-pulpo-300">{best}</p>
          </div>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-3">
          <button
            onClick={shareResult}
            className="rounded-xl border border-border bg-surface py-3 text-sm font-bold"
          >
            Compartir resultado
          </button>
          <button
            onClick={() => beginGame(allPlayers)}
            className="rounded-xl bg-primary py-3 text-sm font-extrabold text-primary-foreground"
          >
            Volver a jugar
          </button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const teamLite = {
    id: current.team_id,
    name: current.team_name,
    code: current.team_code,
    flag_url: current.team_flag,
  };

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      {/* Streak */}
      <div className="flex w-full max-w-sm items-center justify-between rounded-xl border border-border bg-surface px-5 py-2.5">
        <div className="text-center">
          <p className="text-[11px] text-muted">Racha actual</p>
          <p className="text-2xl font-black tabular-nums">{streak}</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="text-center">
          <p className="text-[11px] text-muted">Récord</p>
          <p className="text-2xl font-black tabular-nums text-pulpo-300">{best}</p>
        </div>
      </div>

      {/* Player card */}
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6">
        <div className="h-28 w-28 overflow-hidden rounded-full border-2 border-border bg-surface-3">
          {current.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.photo_url}
              alt=""
              className="h-full w-full object-cover object-top"
            />
          ) : (
            <TeamFlag team={teamLite} size={112} />
          )}
        </div>
        <div className="text-center">
          <p className="text-xl font-black">{current.name}</p>
          <div className="mt-1 flex items-center justify-center gap-1.5">
            <TeamFlag team={teamLite} size={18} />
            <span className="text-sm text-muted">{current.team_name}</span>
          </div>
        </div>
        <p className="text-sm font-semibold text-muted">¿En qué club juega?</p>
      </div>

      {/* Options */}
      <div className="flex w-full max-w-sm flex-col gap-3">
        {options.map((club) => {
          const picked = selected === club;
          const isCorrect = club === current.club;
          const fb = phase === "feedback";
          return (
            <button
              key={club}
              onClick={() => handlePick(club)}
              disabled={fb}
              className={cn(
                "rounded-xl border px-4 py-3.5 text-left text-sm font-semibold transition-all",
                !fb && "border-border bg-surface hover:bg-surface-2 active:scale-[0.98]",
                fb && isCorrect && "border-pitch-500 bg-pitch-500/20 text-pitch-300",
                fb && picked && !isCorrect && "border-danger bg-danger/20 text-danger",
                fb && !picked && !isCorrect && "border-border bg-surface opacity-40",
              )}
            >
              {club}
            </button>
          );
        })}
      </div>
    </div>
  );
}
