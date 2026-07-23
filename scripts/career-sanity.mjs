// ╔══════════════════════════════════════════════════════════════════╗
// ║  Prueba de humo del Simulador de Carrera                           ║
// ║                                                                    ║
// ║  Simula miles de carreras jugando al azar y comprueba que las      ║
// ║  reglas no se rompen nunca y que el reparto de resultados tiene    ║
// ║  sentido (que haya cracks, medianías y fracasos).                  ║
// ║                                                                    ║
// ║    node scripts/career-sanity.mjs [nº de carreras]                 ║
// ║                                                                    ║
// ║  El motor es TypeScript sin extensiones en los imports, así que    ║
// ║  antes se compila a CommonJS en .career-build/ (ignorado por git). ║
// ╚══════════════════════════════════════════════════════════════════╝
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD = path.join(ROOT, ".career-build");

process.stdout.write("Compilando el motor… ");
// Se llama al compilador por su ruta, no por `npx`: en Windows lanzar un
// .cmd sin shell falla con EINVAL.
execFileSync(
  process.execPath,
  [path.join(ROOT, "node_modules/typescript/bin/tsc"),
    "src/lib/games/career/engine.ts", "--outDir", ".career-build",
    "--module", "commonjs", "--target", "es2022", "--moduleResolution", "node",
    "--skipLibCheck", "--esModuleInterop"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] }
);
console.log("listo\n");

const require = createRequire(import.meta.url);
const { createCareer, decide, peakOverall, replay, trophyCount } = require(path.join(BUILD, "engine.js"));
const { COUNTRIES } = require(path.join(BUILD, "countries.data.js"));
const { MAX_OVERALL, MIN_OVERALL, RETIREMENT_AGE, START_AGE } = require(path.join(BUILD, "constants.js"));

const RUNS = Number(process.argv[2] ?? 2000);
const POSITIONS = ["POR", "DFC", "LI", "LD", "MCD", "MC", "MCO", "EI", "ED", "DC"];

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

/** Generador aparte, solo para elegir qué botón pulsa el jugador simulado. */
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function playRandomCareer(seed) {
  const rnd = lcg(seed ^ 0x5f3759df);
  const country = COUNTRIES[Math.floor(rnd() * COUNTRIES.length)];
  const identity = {
    lastName: "Prueba",
    number: 1 + Math.floor(rnd() * 30),
    foot: rnd() < 0.25 ? "left" : "right",
    countryCode: country.code,
    position: POSITIONS[Math.floor(rnd() * POSITIONS.length)],
  };

  let state = createCareer(seed, identity);
  const decisions = [];
  let guard = 0;

  while (state.phase !== "summary" && guard++ < 60) {
    const options = state.currentEvent?.options ?? [];
    if (!options.length) throw new Error(`Decisión sin opciones en el paso ${state.step}`);
    // Casi nunca se retira por gusto, para llegar hasta el final.
    const playable = options.filter((o) => o.type !== "retire" || rnd() < 0.05);
    const pool = playable.length ? playable : options;
    const option = pool[Math.floor(rnd() * pool.length)];
    decisions.push({ optionId: option.id });
    state = decide(state, option.id);
  }
  check(guard < 60, `La carrera con semilla ${seed} no terminó nunca`);
  return { state, decisions };
}

// ── Se juegan las carreras ───────────────────────────────────────────

console.log(`Simulando ${RUNS} carreras…\n`);

let totalSeasons = 0;
let withBallonDor = 0;
let withWorldCup = 0;
let withLeague = 0;
let everPromoted = 0;
let calledUp = 0;
let relegations = 0;
const peakBuckets = { "<60": 0, "60-69": 0, "70-79": 0, "80-89": 0, "90+": 0 };
let ageSum = 0;

for (let i = 0; i < RUNS; i++) {
  const seed = 1_000_000 + i * 7919;
  const { state, decisions } = playRandomCareer(seed);

  // ── Reglas que no se pueden romper nunca ──
  check(state.phase === "summary", `#${seed}: la carrera no acabó en resumen`);
  check(state.seasons.length > 0, `#${seed}: carrera sin ninguna temporada`);
  check(state.player.age <= RETIREMENT_AGE, `#${seed}: se retiró con ${state.player.age} años`);

  let previousAge = START_AGE - 1;
  for (const s of state.seasons) {
    check(s.overall >= MIN_OVERALL && s.overall <= MAX_OVERALL, `#${seed}: media fuera de rango (${s.overall})`);
    check(s.age > previousAge, `#${seed}: las temporadas no avanzan de edad (${s.age} tras ${previousAge})`);
    previousAge = s.age;

    check(s.stats.appearances >= 0 && s.stats.appearances <= 80, `#${seed}: ${s.stats.appearances} partidos en una temporada`);
    check(s.stats.goals <= Math.max(3, s.stats.appearances * 3), `#${seed}: ${s.stats.goals} goles en ${s.stats.appearances} partidos`);

    // La clasificación tiene que respetar el título.
    if (s.leagueTable.length) {
      check(s.leaguePosition >= 1, `#${seed}: sin puesto en la liga`);
      const wonLeague = s.trophies.includes("league");
      check(!wonLeague || s.leaguePosition === 1, `#${seed}: campeón de liga en el puesto ${s.leaguePosition}`);
      check(wonLeague || s.leaguePosition > 1, `#${seed}: primero de la tabla sin ganar la liga`);
      check(s.leagueTable.some((r) => r.isUser), `#${seed}: el club del jugador no sale en su propia tabla`);
      for (const row of s.leagueTable) {
        check(row.won + row.drawn + row.lost === row.played, `#${seed}: ${row.name} no cuadra partidos jugados`);
        check(row.points === row.won * 3 + row.drawn || row.points <= row.won * 3 + row.drawn,
          `#${seed}: ${row.name} tiene ${row.points} puntos imposibles`);
      }
    }
    if (s.relegated) relegations++;
    if (s.promoted) everPromoted++;

    // No se juega un torneo sin convocatoria, ni se gana sin jugarlo.
    const nationalTrophy = s.trophies.find((t) => t === "world_cup" || t === "national_continental");
    if (nationalTrophy) {
      check(!!s.national, `#${seed}: ganó ${nationalTrophy} sin jugar el torneo`);
      check(s.national?.won === true, `#${seed}: título de selección sin ganar la final`);
    }
    if (s.national) {
      calledUp++;
      check(s.national.matches.length >= 3, `#${seed}: torneo con ${s.national.matches.length} partidos`);
      check(!!s.national.reachedLabel, `#${seed}: torneo sin ronda alcanzada`);
      check(s.national.won === (s.national.reachedLabel === "Campeón"), `#${seed}: campeón sin serlo`);
    }

    if (state.identity.position === "POR") {
      check(s.stats.goals === 0, `#${seed}: un portero marcó ${s.stats.goals} goles`);
    } else {
      check(s.stats.cleanSheets === 0, `#${seed}: un jugador de campo con porterías a cero`);
    }

    // El podio del Balón de Oro tiene que cuadrar con el premio.
    if (s.ballonDor) {
      check(s.ballonDor.length === 5, `#${seed}: podio de ${s.ballonDor.length} jugadores`);
      const wonAward = s.awards.includes("ballon_dor") || s.awards.includes("golden_glove");
      check(s.ballonDor[0].isUser === wonAward, `#${seed}: el podio no cuadra con el premio`);
    }
  }

  // ── Determinismo: misma semilla y mismas decisiones ⇒ misma carrera ──
  if (i % 50 === 0) {
    const again = replay(seed, state.identity, decisions);
    check(
      JSON.stringify(again.seasons) === JSON.stringify(state.seasons),
      `#${seed}: la carrera no se reproduce igual al recargarla`
    );
  }

  // ── Estadística general ──
  totalSeasons += state.seasons.length;
  ageSum += state.player.age;
  const trophies = trophyCount(state);
  if (state.seasons.some((s) => s.awards.includes("ballon_dor"))) withBallonDor++;
  if (trophies.world_cup > 0) withWorldCup++;
  if (trophies.league > 0) withLeague++;

  const peak = peakOverall(state);
  if (peak < 60) peakBuckets["<60"]++;
  else if (peak < 70) peakBuckets["60-69"]++;
  else if (peak < 80) peakBuckets["70-79"]++;
  else if (peak < 90) peakBuckets["80-89"]++;
  else peakBuckets["90+"]++;
}

// ── Informe ──────────────────────────────────────────────────────────

const pct = (n) => `${((n / RUNS) * 100).toFixed(1)}%`;
console.log(`Temporadas por carrera:  ${(totalSeasons / RUNS).toFixed(1)}`);
console.log(`Edad media de retirada:  ${(ageSum / RUNS).toFixed(1)}`);
console.log(`Convocatorias / carrera: ${(calledUp / RUNS).toFixed(2)}`);
console.log(`Descensos / carrera:     ${(relegations / RUNS).toFixed(2)}`);
console.log(`Ascensos / carrera:      ${(everPromoted / RUNS).toFixed(2)}`);
console.log(`\nMedia máxima alcanzada:`);
for (const [bucket, n] of Object.entries(peakBuckets)) {
  console.log(`  ${bucket.padEnd(6)} ${pct(n).padStart(6)}  ${"█".repeat(Math.round((n / RUNS) * 40))}`);
}
console.log(`\nCarreras con al menos…`);
console.log(`  una liga:        ${pct(withLeague)}`);
console.log(`  un Balón de Oro: ${pct(withBallonDor)}`);
console.log(`  un Mundial:      ${pct(withWorldCup)}`);

// ── Comprobaciones de reparto ────────────────────────────────────────
// No son reglas duras, pero si saltan es que el equilibrio se ha roto.

check(totalSeasons / RUNS >= 8, "Las carreras salen demasiado cortas");
check(peakBuckets["90+"] > 0, "Nadie llega nunca a 90 de media");
check(peakBuckets["90+"] < RUNS * 0.4, "Demasiada gente llega a 90 de media");
check(peakBuckets["<60"] + peakBuckets["60-69"] > 0, "Todas las carreras son de crack");
check(withLeague > 0 && withLeague < RUNS, "Ganar la liga es imposible o inevitable");
check(calledUp > 0, "A nadie le convocan nunca con su selección");

console.log("");
if (failures.length) {
  const unique = [...new Set(failures)];
  console.error(`✗ ${failures.length} fallos (${unique.length} distintos):`);
  for (const f of unique.slice(0, 25)) console.error(`   ${f}`);
  process.exit(1);
}
console.log("✓ Todas las comprobaciones pasan");
