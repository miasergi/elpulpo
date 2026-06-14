// ╔══════════════════════════════════════════════════════════════════╗
// ║  "El 11 del mundial" — motor del minijuego (puro, sin dependencias) ║
// ║                                                                    ║
// ║  Te toca una selección al azar, montas tu 11 sobre el campo y      ║
// ║  simulamos su Mundial partido a partido: fase de grupos y, si      ║
// ║  pasa, eliminatorias hasta la final. Todo client-safe.             ║
// ╚══════════════════════════════════════════════════════════════════╝

export type Line = "gk" | "def" | "mid" | "fwd";

export interface TeamLite {
  id: string;
  name: string;
  code: string | null;
  flag_url: string | null;
}

export interface RawPlayer {
  id: string;
  name: string;
  number: number | null;
  position: string | null; // "Portero" | "Defensa" | "Centrocampista" | "Delantero"
  club: string | null;
  club_badge: string | null;
  photo_url: string | null;
}

export interface SquadPlayer {
  id: string;
  name: string;
  number: number | null;
  line: Line;
  club: string | null;
  clubBadge: string | null;
  photo: string | null;
  rating: number;
}

/** Un jugador ya fichado para el 11: arrastra de qué selección salió
 *  (para la bandera en el campo y la regla de "11 países distintos"). */
export interface PickedPlayer extends SquadPlayer {
  team: TeamLite;
}

// ─────────────────────────────────────────────────────────────────────
// Ratings base de cada selección (≈ fuerza estilo ranking FIFA, 0-100).
// Es el "esqueleto" del equipo; tu alineación lo modula (ataque/defensa).
// ─────────────────────────────────────────────────────────────────────
export const TEAM_RATING: Record<string, number> = {
  ARG: 92, ESP: 91, FRA: 90, ENG: 88, BRA: 89, POR: 87, NED: 86,
  GER: 84, BEL: 84, CRO: 83, URU: 83, COL: 82, MAR: 82, SUI: 80,
  NOR: 80, SEN: 79, JPN: 78, TUR: 78, ECU: 76, MEX: 76, AUT: 76,
  USA: 75, SWE: 75, CZE: 74, KOR: 74, CIV: 74, ALG: 74, CAN: 73,
  SCO: 73, EGY: 73, IRN: 72, AUS: 72, PAR: 72, BIH: 71, GHA: 71,
  TUN: 70, RSA: 70, COD: 67, PAN: 68, QAT: 66, KSA: 65, UZB: 65,
  NZL: 64, IRQ: 63, JOR: 62, CPV: 61, HAI: 60, CUW: 59,
};

export const DEFAULT_RATING = 70;
export const teamRating = (code: string | null) =>
  (code && TEAM_RATING[code]) || DEFAULT_RATING;

// Aleatoriedad fuera de los componentes (la regla react-hooks/purity prohíbe
// Math.random durante el render; aquí son funciones puras de módulo).
export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
export function pickRandom<T>(arr: T[]): T | undefined {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined;
}

// ─────────────────────────────────────────────────────────────────────
// Posición → línea, y rating heurístico por jugador (determinista y estable).
// No tenemos ratings reales gratis, así que los derivamos del dorsal, el
// club y un hash del nombre. Da variedad y premia elegir a las estrellas.
// ─────────────────────────────────────────────────────────────────────
export function lineOf(position: string | null): Line {
  const p = (position ?? "").toLowerCase();
  if (/porter|arquero|goalkeeper/.test(p)) return "gk";
  if (/defens|back|defen/.test(p)) return "def";
  if (/centro|medio|midfield/.test(p)) return "mid";
  return "fwd";
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]/g, "").trim();
}

export function shortName(full: string): string {
  const p = full.trim().split(/\s+/);
  return p.length > 1 ? p.at(-1)! : p[0];
}

// Ratings basados en FC 26 para jugadores conocidos del Mundial (tienen precedencia sobre la heurística)
const FC26_RAW: [string, number][] = [
  // GK — FC 26
  ["alisson", 89], ["ederson", 85], ["ter stegen", 89], ["courtois", 89], ["maignan", 87],
  ["oblak", 88], ["sommer", 84], ["livakovic", 83], ["pickford", 82], ["bono", 83], ["muslera", 80],
  // DEF — FC 26
  ["van dijk", 90], ["ruben dias", 87], ["marquinhos", 85], ["militao", 84], ["eder militao", 84],
  ["lisandro martinez", 83], ["gvardiol", 86], ["akanji", 83], ["otamendi", 79],
  ["carvajal", 83], ["alexander-arnold", 86], ["robertson", 85], ["theo hernandez", 84],
  ["cancelo", 83], ["joao cancelo", 83], ["hakimi", 86], ["achraf hakimi", 86],
  ["dumfries", 81], ["trippier", 81], ["rudiger", 83], ["antonio rudiger", 83],
  ["laporte", 83], ["aymeric laporte", 83], ["kim min-jae", 85], ["upamecano", 83],
  ["mazraoui", 82], ["noussair mazraoui", 82], ["timber", 82], ["acuna", 80], ["molina", 82],
  ["saliba", 87], ["william saliba", 87], ["kounde", 83], ["jules kounde", 83],
  ["le normand", 82], ["robin le normand", 82],
  ["trent alexander-arnold", 89], ["hakimi", 89], ["achraf hakimi", 89],
  // MID — FC 26
  ["rodri", 90], ["de bruyne", 87], ["kevin de bruyne", 87], ["pedri", 89], ["pedri gonzalez", 89],
  ["bellingham", 90], ["jude bellingham", 90], ["kimmich", 89], ["joshua kimmich", 89],
  ["musiala", 88], ["jamal musiala", 88], ["wirtz", 89], ["florian wirtz", 89],
  ["foden", 85], ["phil foden", 85], ["valverde", 89], ["federico valverde", 89],
  ["vitinha", 89],
  ["mac allister", 83], ["alexis mac allister", 83], ["de paul", 83], ["rodrigo de paul", 83],
  ["camavinga", 84], ["eduardo camavinga", 84], ["tchouameni", 84], ["aurelien tchouameni", 84],
  ["goretzka", 84], ["dani olmo", 84], ["sabitzer", 82], ["laimer", 82], ["freuler", 81],
  ["modric", 84], ["luka modric", 84], ["brozovic", 83], ["marcelo brozovic", 83],
  ["kovacic", 83], ["mateo kovacic", 83], ["ugarte", 82], ["manuel ugarte", 82],
  ["bentancur", 82], ["rodrigo bentancur", 82], ["xhaka", 83], ["granit xhaka", 83],
  ["caicedo", 85], ["moises caicedo", 85], ["adams", 82], ["tyler adams", 82],
  ["reyna", 81], ["giovanni reyna", 81], ["mckennie", 79], ["weston mckennie", 79],
  ["mitoma", 83], ["kaoru mitoma", 83], ["doan", 81], ["ritsu doan", 81],
  ["kubo", 84], ["takefusa kubo", 84], ["morita", 81], ["endo", 81], ["wataru endo", 81],
  ["odegaard", 87], ["martin odegaard", 87], ["hojbjerg", 81], ["guler", 82], ["arda guler", 82],
  ["calhanoglu", 83], ["hakan calhanoglu", 83], ["paqueta", 84], ["lucas paqueta", 84],
  ["amrabat", 81], ["sofyan amrabat", 81], ["james rodriguez", 82],
  // FWD — FC 26
  ["mbappe", 91], ["kylian mbappe", 91], ["vinicius jr", 89], ["vinicius junior", 89], ["vinicius", 89],
  ["haaland", 90], ["erling haaland", 90], ["messi", 90], ["lionel messi", 90],
  ["kane", 89], ["harry kane", 89], ["salah", 91], ["mohamed salah", 91],
  ["son", 87], ["son heung-min", 87], ["raphinha", 89], ["rodrygo", 86],
  ["endrick", 82], ["gabriel martinelli", 83], ["martinelli", 83],
  ["lautaro", 85], ["lautaro martinez", 85], ["griezmann", 85], ["antoine griezmann", 85],
  ["dembele", 90], ["ousmane dembele", 90], ["lamine yamal", 89], ["yamal", 89],
  ["ferran torres", 82], ["nico williams", 86], ["williams", 86],
  ["gakpo", 84], ["cody gakpo", 84], ["depay", 83], ["memphis depay", 83],
  ["gnabry", 82], ["serge gnabry", 82], ["sane", 85], ["leroy sane", 85],
  ["havertz", 83], ["kai havertz", 83], ["rashford", 83], ["marcus rashford", 83],
  ["saka", 88], ["bukayo saka", 88], ["palmer", 84], ["cole palmer", 84],
  ["pulisic", 82], ["christian pulisic", 82],
  ["isak", 88], ["alexander isak", 88], ["gyokeres", 87], ["viktor gyokeres", 87],
  ["forsberg", 81], ["kudus", 82], ["mohammed kudus", 82],
  ["diaz", 85], ["luiz diaz", 85], ["luis diaz", 85],
  ["leao", 86], ["rafael leao", 86], ["joao felix", 82], ["goncalo ramos", 81],
  ["bruno fernandes", 89], ["dybala", 82], ["paulo dybala", 82],
  ["di maria", 80], ["angel di maria", 80], ["thuram", 83], ["marcus thuram", 83],
  ["kolo muani", 82], ["randal kolo muani", 82], ["darwin nunez", 85], ["nunez", 85],
  ["trossard", 82], ["leandro trossard", 82], ["doku", 83], ["jeremy doku", 83],
  ["mahrez", 84], ["riyad mahrez", 84], ["arnautovic", 80], ["alaba", 83], ["david alaba", 83],
  ["lukaku", 82], ["romelu lukaku", 82], ["schick", 84], ["patrik schick", 84],
];

const FC26_MAP = new Map<string, number>(FC26_RAW.map(([k, v]) => [norm(k), v]));

const TEAM_FAMOUS_PLAYERS: Record<string, string[]> = {
  ARG: ["Messi", "Lautaro", "Di María", "De Paul", "Mac Allister", "Dybala"],
  ESP: ["Pedri", "Yamal", "Rodri", "Williams", "Olmo", "Morata"],
  FRA: ["Mbappé", "Griezmann", "Dembélé", "Thuram", "Camavinga", "Tchouaméni"],
  ENG: ["Kane", "Bellingham", "Saka", "Foden", "Palmer", "Rashford"],
  BRA: ["Vinicius Jr", "Raphinha", "Rodrygo", "Endrick", "Paquetá", "Martinelli"],
  POR: ["Bruno Fernandes", "Leão", "Goncalo Ramos", "João Félix", "Vitinha", "Bernardo"],
  NED: ["Van Dijk", "Gakpo", "Depay", "De Jong", "Dumfries", "Bergwijn"],
  GER: ["Musiala", "Wirtz", "Kimmich", "Sané", "Havertz", "Gnabry"],
  BEL: ["De Bruyne", "Trossard", "Doku", "Lukaku", "Tielemans", "Castagne"],
  CRO: ["Modrić", "Brozović", "Kovačić", "Gvardiol", "Budimir", "Pašalić"],
  URU: ["Valverde", "D. Núñez", "Ugarte", "Araújo", "Bentancur", "De Arrascaeta"],
  COL: ["Díaz", "Caicedo", "James", "Borré", "D. Sánchez", "Arias"],
  MAR: ["Hakimi", "Amrabat", "En-Nesyri", "Mazraoui", "Boufal", "Sabiri"],
  SUI: ["Xhaka", "Akanji", "Sow", "Embolo", "Shaqiri", "Freuler"],
  NOR: ["Haaland", "Ødegaard", "Sörloth", "Ajer", "Bobb", "Berge"],
  SEN: ["Mendy", "Ndoye", "Mané", "Gueye", "Kouyaté", "Sarr"],
  JPN: ["Mitoma", "Kubo", "Doan", "Endo", "Morita", "Ueda"],
  TUR: ["Güler", "Çalhanoğlu", "Söyüncü", "Demiral", "Müldür", "Yildiz"],
  ECU: ["Caicedo", "Plata", "Estupiñán", "Ibarra", "Páez", "Preciado"],
  MEX: ["Lozano", "Jiménez", "Herrera", "Gutiérrez", "Antuna", "Álvarez"],
  AUT: ["Alaba", "Arnautović", "Laimer", "Sabitzer", "Baumgartner", "Grillitsch"],
  USA: ["Pulisic", "Adams", "Reyna", "McKennie", "Turner", "Sargent"],
  SWE: ["Isak", "Gyökeres", "Forsberg", "Ekdal", "Olsson", "Claesson"],
  KOR: ["Son", "Kim Min-jae", "Lee Kang-in", "Hwang Hee-chan", "Cho", "Kim Jun-su"],
  CIV: ["Zaha", "Cornet", "Gradel", "Pépé", "Boly", "Sangaré"],
  ALG: ["Mahrez", "Belaïli", "Zerrouki", "Brahimi", "Slimani", "Bensbaini"],
  CAN: ["Davies", "Johnston", "Buchanan", "Larin", "Osorio", "David"],
  SCO: ["Robertson", "McTominay", "Gilmour", "McGinn", "Adams", "Christie"],
  EGY: ["Salah", "Trezeguet", "Elneny", "M. Mohamed", "T. Hamed", "Fathy"],
  IRN: ["Taremi", "Jahanbakhsh", "Azmoun", "Torabi", "Karimi", "Hosseini"],
  AUS: ["Irvine", "Leckie", "Behich", "Ryan", "Duke", "Devlin"],
  PAR: ["Almirón", "Sanabria", "Enciso", "Alcaraz", "Villasanti", "Espínola"],
  GHA: ["Kudus", "Partey", "Ayew", "Baidoo", "Amankwah", "Mensah"],
  TUN: ["Khazri", "Msakni", "Skhiri", "Drager", "Laïdouni", "Ben Slimane"],
  RSA: ["Tau", "Mothwa", "Zwane", "Brockie", "Lorch", "Mokoena"],
  COD: ["Lukebakio", "Banza", "Bakambu", "Bongonda", "Bolasie", "Mbemba"],
  PAN: ["Davis", "Murillo", "Fajardo", "Torres", "Godoy", "Carrasquilla"],
  QAT: ["Al Haydos", "Afif", "Boudiaf", "Muntari", "Al Rawi", "Hassan"],
  KSA: ["Al-Dawsari", "Al-Buraikan", "Kanno", "Bahebri", "Oulare", "Al-Shahrani"],
  UZB: ["Shomurodov", "Otajonov", "Sidiqov", "Saidov", "Kholmatov", "Tursunov"],
  NZL: ["Wood", "Paasi", "Just", "McGlinchey", "Bell", "Jones"],
  IRQ: ["Mohanad", "Amjad", "Hasan", "Ali Adnan", "Saad", "Hammadi"],
  BIH: ["Džeko", "Pjanić", "Gojak", "Kolašinac", "Bičakčić", "Hamdija"],
  CZE: ["Schick", "Souček", "Hlozek", "Coufal", "Kuchta", "Janktto"],
  JOR: ["Al-Taamari", "Bani Yaseen", "Al-Naimat", "Al-Rawajfeh", "Shboul", "Habashna"],
  CPV: ["Mendes", "Jamiro", "Andrade", "Tavares", "Santos", "Fortes"],
  HAI: ["Nazon", "Romero", "Naïm", "Tardieu", "Guerrier", "Bienvenu"],
  CUW: ["Bacuna", "Slagveer", "Hasselbaink", "Tirpan", "Cijntje", "Martina"],
};

export function playerRating(p: RawPlayer, base: number): number {
  // Comprueba el lookup de FC 26 (nombre completo normalizado)
  const fullNorm = norm(p.name);
  if (FC26_MAP.has(fullNorm)) return clamp(FC26_MAP.get(fullNorm)!, 55, 95);
  // Fallback: solo apellido (la última palabra del nombre)
  const last = fullNorm.split(" ").at(-1)!;
  if (last.length > 3 && FC26_MAP.has(last)) return clamp(FC26_MAP.get(last)! - 1, 55, 95);
  // Heurística mejorada si no hay match
  let r = base - 5 + (hash(p.id || p.name) % 11);
  const n = p.number ?? 99;
  if (n >= 1 && n <= 11) r += 3;
  if (n === 10) r += 4;
  else if (n === 9 || n === 7) r += 2;
  if (p.club_badge) r += 2;
  return clamp(Math.round(r), 62, 90);
}

export function toSquad(players: RawPlayer[], teamCode: string | null): SquadPlayer[] {
  const base = teamRating(teamCode);
  return players
    .map((p) => ({
      id: p.id,
      name: p.name,
      number: p.number,
      line: lineOf(p.position),
      club: p.club,
      clubBadge: p.club_badge,
      photo: p.photo_url,
      rating: playerRating(p, base),
    }))
    .sort((a, b) => b.rating - a.rating);
}

// ─────────────────────────────────────────────────────────────────────
// Formaciones: cada hueco tiene línea, etiqueta y coordenadas (% sobre un
// campo vertical; el equipo ataca hacia arriba: y bajo = ataque).
// ─────────────────────────────────────────────────────────────────────
export interface Slot {
  id: string;
  line: Line;
  label: string;
  x: number;
  y: number;
}
export interface Formation {
  key: string;
  name: string;
  slots: Slot[];
}

const s = (id: string, line: Line, label: string, x: number, y: number): Slot => ({ id, line, label, x, y });

export const FORMATIONS: Formation[] = [
  {
    key: "433",
    name: "4-3-3",
    slots: [
      s("gk", "gk", "POR", 50, 90),
      s("d1", "def", "LI", 14, 70), s("d2", "def", "DFC", 38, 73), s("d3", "def", "DFC", 62, 73), s("d4", "def", "LD", 86, 70),
      s("m1", "mid", "MC", 28, 48), s("m2", "mid", "MC", 50, 46), s("m3", "mid", "MC", 72, 48),
      s("f1", "fwd", "EI", 20, 20), s("f2", "fwd", "DC", 50, 15), s("f3", "fwd", "ED", 80, 20),
    ],
  },
  {
    key: "442",
    name: "4-4-2",
    slots: [
      s("gk", "gk", "POR", 50, 90),
      s("d1", "def", "LI", 14, 70), s("d2", "def", "DFC", 38, 73), s("d3", "def", "DFC", 62, 73), s("d4", "def", "LD", 86, 70),
      s("m1", "mid", "MI", 14, 47), s("m2", "mid", "MC", 38, 49), s("m3", "mid", "MC", 62, 49), s("m4", "mid", "MD", 86, 47),
      s("f1", "fwd", "DC", 35, 18), s("f2", "fwd", "DC", 65, 18),
    ],
  },
  {
    key: "4231",
    name: "4-2-3-1",
    slots: [
      s("gk", "gk", "POR", 50, 90),
      s("d1", "def", "LI", 14, 70), s("d2", "def", "DFC", 38, 73), s("d3", "def", "DFC", 62, 73), s("d4", "def", "LD", 86, 70),
      s("m1", "mid", "MCD", 36, 56), s("m2", "mid", "MCD", 64, 56),
      s("m3", "mid", "EI", 18, 35), s("m4", "mid", "MCO", 50, 33), s("m5", "mid", "ED", 82, 35),
      s("f1", "fwd", "DC", 50, 14),
    ],
  },
  {
    key: "352",
    name: "3-5-2",
    slots: [
      s("gk", "gk", "POR", 50, 90),
      s("d1", "def", "DFC", 24, 72), s("d2", "def", "DFC", 50, 74), s("d3", "def", "DFC", 76, 72),
      s("m1", "mid", "CAR", 10, 50), s("m2", "mid", "MC", 33, 47), s("m3", "mid", "MC", 50, 53), s("m4", "mid", "MC", 67, 47), s("m5", "mid", "CAR", 90, 50),
      s("f1", "fwd", "DC", 35, 18), s("f2", "fwd", "DC", 65, 18),
    ],
  },
];

export const formationByKey = (k: string) => FORMATIONS.find((f) => f.key === k) ?? FORMATIONS[0];

// ─────────────────────────────────────────────────────────────────────
// Fuerza de tu equipo a partir del 11 elegido.
// ─────────────────────────────────────────────────────────────────────
export interface LineupStrength {
  attack: number;
  defense: number;
  overall: number;
  chemistry: number; // 0-100
  clubLinks: number; // número de pares de compañeros de club
  avgRating: number;
}

export function lineupStrength(picks: (SquadPlayer | null)[], formation: Formation): LineupStrength {
  const chosen = picks.filter(Boolean) as SquadPlayer[];
  if (chosen.length === 0) {
    return { attack: 0, defense: 0, overall: 0, chemistry: 0, clubLinks: 0, avgRating: 0 };
  }

  const avgRating = chosen.reduce((a, p) => a + p.rating, 0) / chosen.length;
  const ratingOf = (group: "att" | "def") => {
    const xs = formation.slots
      .map((slot, i) => ({ slot, p: picks[i] }))
      .filter((x) => x.p && lineGroup(x.slot.line) === group)
      .map((x) => x.p!.rating);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : avgRating;
  };

  const attackers = ratingOf("att");
  const defenders = ratingOf("def");

  // Química: un «par» es 2 jugadores del mismo club en el 11.
  // Cada par vale 25 puntos (4 pares = 100%). Se explica visualmente en la UI.
  const counts = new Map<string, number>();
  for (const p of chosen) if (p.club) counts.set(p.club, (counts.get(p.club) ?? 0) + 1);
  let clubLinks = 0;
  for (const n of counts.values()) if (n >= 2) clubLinks += n - 1;
  const chemistry = Math.min(100, clubLinks * 25);
  const chemBonus = (chemistry / 100) * 4;

  return {
    attack: Math.round(clamp(attackers + chemBonus, 40, 99)),
    defense: Math.round(clamp(defenders + chemBonus, 40, 99)),
    overall: Math.round(avgRating),
    chemistry,
    clubLinks,
    avgRating: Math.round(avgRating),
  };
}

// Agrupa líneas para ataque/defensa: el mediocampo cuenta a las dos.
function lineGroup(line: Line): "att" | "def" {
  return line === "fwd" || line === "mid" ? "att" : "def";
}

// ─────────────────────────────────────────────────────────────────────
// PRNG sembrable (mulberry32) — un run es determinista a partir de su semilla,
// así el resultado es estable mientras se revela partido a partido.
// ─────────────────────────────────────────────────────────────────────
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function poisson(lambda: number, rng: () => number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

const xg = (att: number, def: number) => clamp(1.3 * Math.exp((att - def) / 16), 0.18, 4.6);

export interface SimSide {
  team: TeamLite;
  attack: number;
  defense: number;
  overall: number;
  isUser?: boolean;
  scorerPool: string[]; // nombres de jugadores para atribuir goles
}

export interface MatchEvent {
  minute: number;
  scorer: string;
  assist?: string;
  forHome: boolean;
}

export interface SimMatch {
  home: SimSide;
  away: SimSide;
  homeGoals: number;
  awayGoals: number;
  homePens?: number;
  awayPens?: number;
  winner: "home" | "away"; // tras prórroga/penaltis en eliminatorias
  events: MatchEvent[];
}

function generateEvents(
  homeGoals: number,
  awayGoals: number,
  home: SimSide,
  away: SimSide,
  rng: () => number,
): MatchEvent[] {
  const events: MatchEvent[] = [];
  const pick = (pool: string[]) => pool[Math.floor(rng() * pool.length)];
  const addGoal = (pool: string[], forHome: boolean) => {
    const minute = 1 + Math.floor(rng() * 93);
    const scorer = pool.length ? pick(pool) : "";
    let assist: string | undefined;
    if (pool.length > 1 && rng() < 0.58) {
      const others = pool.filter((n) => n !== scorer);
      if (others.length) assist = others[Math.floor(rng() * others.length)];
    }
    if (scorer) events.push({ minute, scorer, assist, forHome });
  };
  for (let i = 0; i < homeGoals; i++) addGoal(home.scorerPool, true);
  for (let i = 0; i < awayGoals; i++) addGoal(away.scorerPool, false);
  return events.sort((a, b) => a.minute - b.minute);
}

function playMatch(home: SimSide, away: SimSide, rng: () => number, knockout: boolean): SimMatch {
  const hg = poisson(xg(home.attack, away.defense), rng);
  const ag = poisson(xg(away.attack, home.defense), rng);
  const events = generateEvents(hg, ag, home, away, rng);
  const winner: "home" | "away" = hg >= ag ? "home" : "away";
  const m: SimMatch = { home, away, homeGoals: hg, awayGoals: ag, winner, events };
  if (knockout && hg === ag) {
    // Penaltis: probabilidad ponderada por el overall.
    const pHome = home.overall / (home.overall + away.overall);
    // 5 tandas + muerte súbita simplificada
    let hp = 0;
    let ap = 0;
    for (let i = 0; i < 5; i++) {
      if (rng() < 0.55 + (pHome - 0.5) * 0.4) hp++;
      if (rng() < 0.55 - (pHome - 0.5) * 0.4) ap++;
    }
    while (hp === ap) {
      if (rng() < pHome) hp++;
      else ap++;
    }
    m.homePens = hp;
    m.awayPens = ap;
    m.winner = hp > ap ? "home" : "away";
  } else if (knockout) {
    m.winner = hg > ag ? "home" : "away";
  }
  return m;
}

// ─────────────────────────────────────────────────────────────────────
// Tabla de grupo
// ─────────────────────────────────────────────────────────────────────
export interface GroupRow {
  team: TeamLite;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  pts: number;
  isUser?: boolean;
}

export interface KnockoutTie {
  round: string;
  match: SimMatch;
  userWon: boolean;
}

/** Todos los partidos de una ronda de eliminatorias (incluyendo el del usuario). */
export interface BracketRound {
  name: string;
  matches: SimMatch[]; // todos los partidos; el del usuario es siempre match[0] (home = user)
}

export interface RunResult {
  user: SimSide;
  groupMatches: SimMatch[]; // los 3 del usuario, en orden
  groupTable: GroupRow[];
  advanced: boolean;
  knockout: KnockoutTie[];
  bracketRounds: BracketRound[]; // bracket completo de eliminatorias
  champion: boolean;
  reachedLabel: string; // "Campeón del mundo" | "Subcampeón" | "Cuartos de final"…
}

const KO_ROUNDS = ["Dieciseisavos", "Octavos", "Cuartos", "Semifinal", "Final"];

function sideFor(team: TeamLite, strength: { attack: number; defense: number; overall: number }, isUser = false): SimSide {
  return {
    team,
    attack: strength.attack,
    defense: strength.defense,
    overall: strength.overall,
    isUser,
    scorerPool: TEAM_FAMOUS_PLAYERS[team.code ?? ""] ?? [],
  };
}

function baseStrength(t: TeamLite) {
  const r = teamRating(t.code);
  return { attack: r, defense: r, overall: r };
}

/** Simula el Mundial completo del usuario. `pool` = las otras 47 selecciones. */
export function simulateRun(
  userTeam: TeamLite,
  userStrength: LineupStrength,
  pool: TeamLite[],
  seed: number,
  userPicks?: (PickedPlayer | null)[],
): RunResult {
  const rng = mulberry32(seed);
  const pick = (from: TeamLite[]) => from[Math.floor(rng() * from.length)];

  const remaining = [...pool];
  const take = (filter?: (t: TeamLite) => boolean) => {
    const candidates = filter ? remaining.filter(filter) : remaining;
    const list = candidates.length ? candidates : remaining;
    const chosen = pick(list);
    remaining.splice(remaining.indexOf(chosen), 1);
    return chosen;
  };

  const user = sideFor(userTeam, userStrength, true);
  if (userPicks) {
    // Pool ponderado: fwd × 5, mid × 3, def × 1, gk excluido
    const weightedPool: string[] = [];
    for (const p of userPicks) {
      if (!p) continue;
      const n = shortName(p.name);
      const w = p.line === "fwd" ? 5 : p.line === "mid" ? 3 : p.line === "def" ? 1 : 0;
      for (let i = 0; i < w; i++) weightedPool.push(n);
    }
    if (weightedPool.length) user.scorerPool = weightedPool;
  }

  // ── Fase de grupos: 3 rivales, todos contra todos (6 partidos) ──
  const rivals = [take(), take(), take()];
  const sides = [user, ...rivals.map((t) => sideFor(t, baseStrength(t)))];
  const table = new Map<string, GroupRow>();
  for (const s2 of sides)
    table.set(s2.team.id, { team: s2.team, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0, isUser: s2.isUser });

  const record = (a: SimSide, b: SimSide, ag: number, bg: number) => {
    const ra = table.get(a.team.id)!;
    const rb = table.get(b.team.id)!;
    ra.pj++; rb.pj++;
    ra.gf += ag; ra.gc += bg; rb.gf += bg; rb.gc += ag;
    if (ag > bg) { ra.g++; rb.p++; ra.pts += 3; }
    else if (ag < bg) { rb.g++; ra.p++; rb.pts += 3; }
    else { ra.e++; rb.e++; ra.pts++; rb.pts++; }
  };

  const groupMatches: SimMatch[] = [];
  // Partidos del usuario (los que se revelan), en orden.
  for (const r of sides.slice(1)) {
    const m = playMatch(user, r, rng, false);
    groupMatches.push(m);
    record(user, r, m.homeGoals, m.awayGoals);
  }
  // Resto de cruces entre rivales para completar la tabla.
  const rs = sides.slice(1);
  for (let i = 0; i < rs.length; i++)
    for (let j = i + 1; j < rs.length; j++) {
      const m = playMatch(rs[i], rs[j], rng, false);
      record(rs[i], rs[j], m.homeGoals, m.awayGoals);
    }

  const groupTable = [...table.values()].sort(
    (x, y) => y.pts - x.pts || y.gf - y.gc - (x.gf - x.gc) || y.gf - x.gf || x.team.name.localeCompare(y.team.name)
  );
  const userPos = groupTable.findIndex((r) => r.isUser);
  const advanced = userPos < 2; // pasan los dos primeros

  const result: RunResult = {
    user,
    groupMatches,
    groupTable,
    advanced,
    knockout: [],
    bracketRounds: [],
    champion: false,
    reachedLabel: "",
  };

  if (!advanced) {
    result.reachedLabel = "Eliminado en la fase de grupos";
    return result;
  }

  // ── Eliminatorias: bracket de 32 equipos ──
  // El usuario es siempre la semilla 0 (local en cada partido).
  const koPool: SimSide[] = [user];
  // Rellenamos hasta 32 equipos con el resto del pool.
  // En rondas avanzadas cogemos rivales de mayor nivel.
  const BRACKET_SIZE = 32;
  for (let i = 0; i < BRACKET_SIZE - 1 && remaining.length > 0; i++) {
    const t = take();
    koPool.push(sideFor(t, baseStrength(t)));
  }
  // Si el pool no tenía suficientes equipos, duplicamos los últimos para completar potencia de 2.
  while (koPool.length < BRACKET_SIZE) {
    const t = koPool[koPool.length - 1];
    koPool.push({ ...t, isUser: false });
  }

  // Bracket: en cada ronda se emparejan pares consecutivos.
  // El usuario siempre ocupa la posición 0 → siempre es local.
  let bracket = [...koPool];

  for (let r = 0; r < KO_ROUNDS.length && bracket.length > 1; r++) {
    const roundName = KO_ROUNDS[r];
    const roundMatches: SimMatch[] = [];
    const winners: SimSide[] = [];

    for (let i = 0; i < bracket.length; i += 2) {
      const home = bracket[i];
      const away = bracket[i + 1];
      const m = playMatch(home, away, rng, true);
      roundMatches.push(m);
      winners.push(m.winner === "home" ? home : away);
    }

    result.bracketRounds.push({ name: roundName, matches: roundMatches });

    // El partido del usuario siempre es roundMatches[0] (home = user).
    const userMatch = roundMatches[0];
    const userWon = userMatch.winner === "home";
    result.knockout.push({ round: roundName, match: userMatch, userWon });

    if (!userWon) {
      result.reachedLabel = roundReachedLabel(roundName, false);
      return result;
    }

    if (roundName === "Final") {
      result.champion = true;
      result.reachedLabel = "Campeón del mundo";
    }

    bracket = winners;
  }

  return result;
}

function roundReachedLabel(round: string, won: boolean): string {
  if (won && round === "Final") return "Campeón del mundo";
  switch (round) {
    case "Final": return "Subcampeón";
    case "Semifinal": return "Semifinalista";
    case "Cuartos": return "Eliminado en cuartos";
    case "Octavos": return "Eliminado en octavos";
    case "Dieciseisavos": return "Eliminado en dieciseisavos";
    default: return "Eliminado";
  }
}

/** Emoji-medalla del resultado, para la tarjeta de compartir. */
export function resultEmoji(r: RunResult): string {
  if (r.champion) return "🏆";
  if (!r.advanced) return "😞";
  const last = r.knockout.at(-1)?.round;
  if (last === "Final") return "🥈";
  if (last === "Semifinal") return "🥉";
  return "⚽";
}
