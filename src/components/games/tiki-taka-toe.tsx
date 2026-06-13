"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import { TeamFlag } from "@/components/match/team-flag";
import { cn } from "@/lib/utils";
import type { PlayerIndex, TikiGrid } from "@/lib/games/minigames";

const STORAGE_KEY_PREFIX = "tiki-taka-toe";

type CellFilled = { status: "correct"; player: string; photo: string | null };
type CellData = { status: "empty" | "active" } | CellFilled;

type SavedGame = {
  date: string;
  cells: Record<string, { player: string; photo: string | null }>;
  totalGuesses: number;
  usedPlayers: string[];
};

function cellKey(teamCode: string, clubIdx: number) {
  return `${teamCode}-${clubIdx}`;
}

export function TikiTakaToe({
  grid,
  allPlayers,
  today,
}: {
  grid: TikiGrid;
  allPlayers: PlayerIndex[];
  today: string;
}) {
  const [cells, setCells] = useState<Record<string, CellData>>({});
  const [totalGuesses, setTotalGuesses] = useState(0);
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [usedPlayers, setUsedPlayers] = useState<Set<string>>(new Set());
  const [inputVal, setInputVal] = useState("");
  const [suggestions, setSuggestions] = useState<PlayerIndex[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const storageKey = `${STORAGE_KEY_PREFIX}-${today}`;

  // Restaurar partida guardada
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved: SavedGame = JSON.parse(raw);
      if (saved.date !== today) return;
      const restored: Record<string, CellData> = {};
      for (const [k, v] of Object.entries(saved.cells)) {
        restored[k] = { status: "correct", player: v.player, photo: v.photo };
      }
      setCells(restored);
      setTotalGuesses(saved.totalGuesses);
      setUsedPlayers(new Set(saved.usedPlayers));
      if (Object.keys(saved.cells).length === 9) setCompleted(true);
    } catch {}
  }, [storageKey, today]);

  // Focus al activar celda
  useEffect(() => {
    if (activeCell) setTimeout(() => inputRef.current?.focus(), 40);
  }, [activeCell]);

  function handleCellClick(teamCode: string, clubIdx: number) {
    if (completed) return;
    const key = cellKey(teamCode, clubIdx);
    if ((cells[key] as CellFilled | undefined)?.status === "correct") return;
    setActiveCell(key);
    setInputVal("");
    setSuggestions([]);
    setErrorMsg(null);
  }

  function handleInput(val: string) {
    setInputVal(val);
    if (!val.trim()) { setSuggestions([]); return; }
    const lower = val.toLowerCase();
    setSuggestions(
      allPlayers
        .filter((p) => p.name.toLowerCase().includes(lower) && !usedPlayers.has(p.name))
        .slice(0, 8),
    );
  }

  function submitGuess(playerName: string) {
    if (!activeCell) return;
    const parts = activeCell.split("-");
    const teamCode = parts[0];
    const clubIdx = parseInt(parts[1]);
    const club = grid.clubs[clubIdx];

    const newTotal = totalGuesses + 1;
    setTotalGuesses(newTotal);
    setInputVal("");
    setSuggestions([]);

    const valid = allPlayers.some(
      (p) => p.name === playerName && p.team_code === teamCode && p.club === club,
    );

    if (!valid) {
      setErrorMsg(`${playerName} no juega en ${club} con ${grid.teams.find((t) => t.code === teamCode)?.name ?? teamCode}`);
      setTimeout(() => setErrorMsg(null), 2000);
      // Persist updated guess count
      saveCurrent(cells, newTotal, usedPlayers);
      return;
    }

    const player = allPlayers.find(
      (p) => p.name === playerName && p.team_code === teamCode && p.club === club,
    );
    const newCells: Record<string, CellData> = {
      ...cells,
      [activeCell]: { status: "correct", player: playerName, photo: player?.photo_url ?? null },
    };
    const newUsed = new Set([...usedPlayers, playerName]);
    setCells(newCells);
    setUsedPlayers(newUsed);
    setActiveCell(null);
    setErrorMsg(null);

    const correctCount = Object.values(newCells).filter((c) => c.status === "correct").length;
    if (correctCount === 9) setCompleted(true);

    saveCurrent(newCells, newTotal, newUsed);
  }

  function saveCurrent(
    c: Record<string, CellData>,
    total: number,
    used: Set<string>,
  ) {
    const savedCells: Record<string, { player: string; photo: string | null }> = {};
    for (const [k, v] of Object.entries(c)) {
      if (v.status === "correct") {
        const f = v as CellFilled;
        savedCells[k] = { player: f.player, photo: f.photo };
      }
    }
    localStorage.setItem(
      storageKey,
      JSON.stringify({ date: today, cells: savedCells, totalGuesses: total, usedPlayers: [...used] } satisfies SavedGame),
    );
  }

  const correctCount = Object.values(cells).filter((c) => c.status === "correct").length;
  const displayDate = today.slice(5).replace("-", "/");

  // Celdas de cabecera de columna + filas de datos como array plano para el grid CSS
  const headerCols = [
    <div key="corner" />,
    ...grid.clubs.map((club, ci) => (
      <div
        key={`club-${ci}`}
        className="flex items-center justify-center rounded-lg bg-surface-2 px-1 py-2 text-center"
      >
        <span className="text-[10px] font-bold leading-tight text-muted">{club}</span>
      </div>
    )),
  ];

  const dataRows = grid.teams.flatMap((team) => [
    // Cabecera de fila
    <div
      key={`th-${team.code}`}
      className="flex items-center justify-center rounded-lg bg-surface-2 p-1"
    >
      <TeamFlag team={team} size={32} />
    </div>,
    // Celdas de la fila
    ...grid.clubs.map((club, ci) => {
      const key = cellKey(team.code, ci);
      const cell = cells[key] as CellFilled | undefined;
      const isActive = activeCell === key;
      const isCorrect = cell?.status === "correct";

      return (
        <button
          key={key}
          onClick={() => handleCellClick(team.code, ci)}
          className={cn(
            "relative flex min-h-[68px] flex-col items-center justify-center gap-0.5 rounded-lg border p-1.5 transition-colors",
            isCorrect && "border-pitch-500/50 bg-pitch-500/10",
            isActive && !isCorrect && "border-primary bg-primary/10",
            !isCorrect && !isActive && "border-border bg-surface hover:bg-surface-2",
          )}
        >
          {isCorrect && cell ? (
            <>
              {cell.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cell.photo}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover object-top"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pitch-500/20 text-base">
                  ✓
                </div>
              )}
              <span className="max-w-full truncate text-center text-[9px] font-bold leading-tight text-pitch-300">
                {cell.player.split(" ").pop()}
              </span>
            </>
          ) : (
            <span className="text-2xl text-muted-foreground/40">+</span>
          )}
        </button>
      );
    }),
  ]);

  return (
    <div className="flex flex-col gap-3 pb-8">
      {/* Marcador */}
      <div className="mt-2 flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5 text-sm">
        <span className="text-muted">
          Casillas: <span className="font-bold text-foreground">{correctCount}/9</span>
        </span>
        <span className="text-muted">
          Intentos: <span className="font-bold text-foreground">{totalGuesses}</span>
        </span>
      </div>

      {/* Rejilla 4 columnas: [cabecera fila] + [club 1] + [club 2] + [club 3] */}
      <div className="grid grid-cols-[44px_1fr_1fr_1fr] gap-1.5">
        {headerCols}
        {dataRows}
      </div>

      {/* Input de respuesta */}
      {activeCell && !completed && (
        <div className="relative">
          {errorMsg && (
            <div className="mb-2 rounded-lg bg-danger/15 px-3 py-2 text-center text-xs font-semibold text-danger">
              {errorMsg}
            </div>
          )}
          <div className="flex items-center gap-2 rounded-xl border border-primary bg-surface px-4">
            <input
              ref={inputRef}
              value={inputVal}
              onChange={(e) => handleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && suggestions.length > 0) submitGuess(suggestions[0].name);
                if (e.key === "Escape") { setActiveCell(null); setInputVal(""); setSuggestions([]); }
              }}
              placeholder={(() => {
                const [tc, ci] = activeCell.split("-");
                const team = grid.teams.find((t) => t.code === tc);
                return `${team?.name ?? tc} + ${grid.clubs[parseInt(ci)]}…`;
              })()}
              className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              onClick={() => { setActiveCell(null); setInputVal(""); setSuggestions([]); }}
              className="shrink-0 text-sm text-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>
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

      {/* Banner de finalización */}
      {completed && (
        <CompletedBanner
          correctCount={correctCount}
          totalGuesses={totalGuesses}
          grid={grid}
          cells={cells}
          displayDate={displayDate}
        />
      )}

      {/* Clave de respuestas (solo al terminar) */}
      {completed && <AnswerKey grid={grid} />}
    </div>
  );
}

function CompletedBanner({
  correctCount,
  totalGuesses,
  grid,
  cells,
  displayDate,
}: {
  correctCount: number;
  totalGuesses: number;
  grid: TikiGrid;
  cells: Record<string, CellData>;
  displayDate: string;
}) {
  const [copied, setCopied] = useState(false);

  function buildShare() {
    const rows = grid.teams
      .map((t) =>
        grid.clubs.map((_, ci) => {
          const key = cellKey(t.code, ci);
          return cells[key]?.status === "correct" ? "✅" : "⬜";
        }).join(""),
      )
      .join("\n");
    return [
      `🐙 Tiki-Taka-Toe ${displayDate}`,
      grid.clubs.join(" · "),
      rows,
      `${totalGuesses} intentos`,
      "elpulpo.vercel.app/app/games/tiki-taka-toe",
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
    <div className="rounded-2xl border border-pitch-500/40 bg-pitch-500/10 p-4 text-center">
      <div className="text-3xl">🎯</div>
      <p className="mt-1.5 font-black text-pitch-300">
        {correctCount === 9 ? "¡Rejilla completa!" : `${correctCount}/9 casillas`}
      </p>
      <p className="text-sm text-muted">{totalGuesses} intentos en total</p>
      <button
        onClick={share}
        className="mt-3 w-full rounded-xl bg-primary/20 py-2 text-sm font-bold text-primary"
      >
        {copied ? "¡Copiado!" : "Compartir resultado"}
      </button>
    </div>
  );
}

function AnswerKey({ grid }: { grid: TikiGrid }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed border-border py-2.5 text-sm text-muted"
      >
        Ver soluciones válidas
      </button>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
        Soluciones válidas
      </p>
      {grid.teams.map((team) => (
        <div key={team.code} className="mb-3 last:mb-0">
          <p className="text-xs font-semibold text-foreground">{team.name}</p>
          {grid.clubs.map((club, ci) => (
            <p key={ci} className="text-[11px] text-muted-foreground">
              <span className="text-muted">{club}:</span>{" "}
              {grid.cells[team.code]?.[club]?.join(", ") ?? "—"}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}
