// ╔══════════════════════════════════════════════════════════════════╗
// ║  Genera src/lib/games/career/clubs.data.ts                         ║
// ║                                                                    ║
// ║  Fuente: API-Football (la misma que usa el sync del Mundial).       ║
// ║  Las valoraciones NO se tocan: viven a mano en club-ratings.ts.     ║
// ║  Este script solo refresca nombres, códigos y escudos.              ║
// ║                                                                    ║
// ║    node scripts/build-career-dataset.mjs                            ║
// ║    node scripts/build-career-dataset.mjs --cache <dir>   (sin red)  ║
// ║                                                                    ║
// ║  Plan gratuito: 100 peticiones/día y 10/minuto → el script espera   ║
// ║  7 s entre ligas y cachea cada respuesta para poder reintentarlo.   ║
// ╚══════════════════════════════════════════════════════════════════╝
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "src/lib/games/career/clubs.data.ts");
const RATINGS = path.join(ROOT, "src/lib/games/career/club-ratings.ts");
const SEASON = 2023; // el plan gratuito no da acceso a temporadas recientes

const cacheIdx = process.argv.indexOf("--cache");
const CACHE = cacheIdx > -1 ? process.argv[cacheIdx + 1] : path.join(ROOT, ".career-cache");

/** id, slug, nombre visible, país FIFA, confederación, división y copa nacional. */
const LEAGUES = [
  { api: 39, id: "premier-league", name: "Premier League", country: "ENG", conf: "UEFA", tier: 1, cup: "FA Cup" },
  { api: 40, id: "championship", name: "Championship", country: "ENG", conf: "UEFA", tier: 2, cup: "FA Cup" },
  { api: 140, id: "laliga", name: "LaLiga", country: "ESP", conf: "UEFA", tier: 1, cup: "Copa del Rey" },
  { api: 141, id: "laliga2", name: "LaLiga Hypermotion", country: "ESP", conf: "UEFA", tier: 2, cup: "Copa del Rey" },
  { api: 135, id: "serie-a", name: "Serie A", country: "ITA", conf: "UEFA", tier: 1, cup: "Copa Italia" },
  { api: 136, id: "serie-b", name: "Serie B", country: "ITA", conf: "UEFA", tier: 2, cup: "Copa Italia" },
  { api: 78, id: "bundesliga", name: "Bundesliga", country: "GER", conf: "UEFA", tier: 1, cup: "DFB-Pokal" },
  { api: 79, id: "bundesliga2", name: "2. Bundesliga", country: "GER", conf: "UEFA", tier: 2, cup: "DFB-Pokal" },
  { api: 61, id: "ligue-1", name: "Ligue 1", country: "FRA", conf: "UEFA", tier: 1, cup: "Copa de Francia" },
  { api: 62, id: "ligue-2", name: "Ligue 2", country: "FRA", conf: "UEFA", tier: 2, cup: "Copa de Francia" },
  { api: 88, id: "eredivisie", name: "Eredivisie", country: "NED", conf: "UEFA", tier: 1, cup: "Copa de los Países Bajos" },
  { api: 94, id: "primeira-liga", name: "Primeira Liga", country: "POR", conf: "UEFA", tier: 1, cup: "Copa de Portugal" },
  { api: 262, id: "liga-mx", name: "Liga MX", country: "MEX", conf: "CONCACAF", tier: 1, cup: "Copa MX" },
  { api: 71, id: "brasileirao", name: "Brasileirão", country: "BRA", conf: "CONMEBOL", tier: 1, cup: "Copa de Brasil" },
  { api: 128, id: "liga-argentina", name: "Liga Profesional", country: "ARG", conf: "CONMEBOL", tier: 1, cup: "Copa Argentina" },
  { api: 129, id: "primera-nacional", name: "Primera Nacional", country: "ARG", conf: "CONMEBOL", tier: 2, cup: "Copa Argentina" },
  { api: 265, id: "primera-chile", name: "Primera División de Chile", country: "CHI", conf: "CONMEBOL", tier: 1, cup: "Copa Chile" },
  { api: 239, id: "liga-colombia", name: "Liga BetPlay", country: "COL", conf: "CONMEBOL", tier: 1, cup: "Copa Colombia" },
  { api: 268, id: "primera-uruguay", name: "Primera División de Uruguay", country: "URU", conf: "CONMEBOL", tier: 1, cup: "Copa Uruguay" },
  { api: 250, id: "primera-paraguay", name: "División Profesional", country: "PAR", conf: "CONMEBOL", tier: 1, cup: "Copa Paraguay" },
  { api: 281, id: "liga1-peru", name: "Liga 1", country: "PER", conf: "CONMEBOL", tier: 1, cup: "Copa Perú" },
  { api: 242, id: "ligapro-ecuador", name: "LigaPro", country: "ECU", conf: "CONMEBOL", tier: 1, cup: "Copa Ecuador" },
  { api: 344, id: "primera-bolivia", name: "División Profesional", country: "BOL", conf: "CONMEBOL", tier: 1, cup: "Copa Bolivia" },
  { api: 299, id: "primera-venezuela", name: "Liga FUTVE", country: "VEN", conf: "CONMEBOL", tier: 1, cup: "Copa Venezuela" },
];

/** API-Football devuelve los nombres anglosajones o abreviados; aquí el nombre real. */
const NAME_ES = {
  // Inglaterra
  Wolves: "Wolverhampton", "West Ham": "West Ham United", "Sheffield Utd": "Sheffield United",
  Newcastle: "Newcastle United", Tottenham: "Tottenham Hotspur", Luton: "Luton Town",
  Brighton: "Brighton & Hove Albion", Huddersfield: "Huddersfield Town", Cardiff: "Cardiff City",
  Leicester: "Leicester City", Birmingham: "Birmingham City", Ipswich: "Ipswich Town",
  Preston: "Preston North End", "West Brom": "West Bromwich Albion", Leeds: "Leeds United",
  Blackburn: "Blackburn Rovers", Norwich: "Norwich City", QPR: "Queens Park Rangers",
  Rotherham: "Rotherham United", Swansea: "Swansea City", Coventry: "Coventry City",
  Plymouth: "Plymouth Argyle",
  // España
  Barcelona: "FC Barcelona", "Atletico Madrid": "Atlético de Madrid", "Celta Vigo": "Celta de Vigo",
  Alaves: "Deportivo Alavés", Almeria: "UD Almería", Cadiz: "Cádiz CF", Girona: "Girona FC",
  "Las Palmas": "UD Las Palmas", Mallorca: "RCD Mallorca", Osasuna: "CA Osasuna",
  Getafe: "Getafe CF", Sevilla: "Sevilla FC", Valencia: "Valencia CF", Villarreal: "Villarreal CF",
  Leganes: "CD Leganés", Levante: "Levante UD", Espanyol: "RCD Espanyol", Eibar: "SD Eibar",
  Alcorcon: "AD Alcorcón", Oviedo: "Real Oviedo", Tenerife: "CD Tenerife",
  Valladolid: "Real Valladolid", Albacete: "Albacete Balompié", Huesca: "SD Huesca",
  "Sporting Gijon": "Sporting de Gijón", Zaragoza: "Real Zaragoza", Elche: "Elche CF",
  Mirandes: "CD Mirandés", "Racing Santander": "Racing de Santander", Amorebieta: "SD Amorebieta",
  "Racing Ferrol": "Racing de Ferrol", Burgos: "Burgos CF", "Villarreal II": "Villarreal B",
  Eldense: "CD Eldense",
  // Italia
  Inter: "Inter de Milán", Napoli: "SSC Napoli", Juventus: "Juventus", Lazio: "SS Lazio",
  // Alemania
  "Bayern München": "Bayern de Múnich", "1. FC Köln": "1. FC Colonia",
  // Francia
  "Paris Saint Germain": "Paris Saint-Germain", Marseille: "Olympique de Marsella",
  Lyon: "Olympique de Lyon", Nice: "OGC Niza", "Saint Etienne": "Saint-Étienne",
  "Stade Brestois 29": "Stade Brestois", Strasbourg: "RC Estrasburgo", Rennes: "Stade Rennais",
  Lille: "LOSC Lille", Monaco: "AS Mónaco", "Le Havre": "Le Havre AC", Metz: "FC Metz",
  Lens: "RC Lens", Reims: "Stade de Reims", Nantes: "FC Nantes", Montpellier: "Montpellier HSC",
  Toulouse: "Toulouse FC", Lorient: "FC Lorient", Bordeaux: "Girondins de Burdeos",
  "Estac Troyes": "ESTAC Troyes", Ajaccio: "AC Ajaccio", Auxerre: "AJ Auxerre", PAU: "Pau FC",
  Caen: "SM Caen", Angers: "Angers SCO", Guingamp: "EA Guingamp",
  // Países Bajos
  "PSV Eindhoven": "PSV", Utrecht: "FC Utrecht", Twente: "FC Twente", Heerenveen: "SC Heerenveen",
  "GO Ahead Eagles": "Go Ahead Eagles", Heracles: "Heracles Almelo", Roda: "Roda JC",
  Waalwijk: "RKC Waalwijk", Emmen: "FC Emmen", Dordrecht: "FC Dordrecht",
  "Almere City FC": "Almere City",
  // Portugal
  Benfica: "SL Benfica", Guimaraes: "Vitória de Guimarães", "Rio Ave": "Rio Ave FC",
  Famalicao: "FC Famalicão", "GIL Vicente": "Gil Vicente", Estrela: "Estrela da Amadora",
  "Casa Pia": "Casa Pia AC", Boavista: "Boavista FC", Chaves: "GD Chaves",
  Estoril: "Estoril Praia", Farense: "SC Farense", Arouca: "FC Arouca",
  Moreirense: "Moreirense FC", Portimonense: "Portimonense SC", Vizela: "FC Vizela",
  // México
  "Guadalajara Chivas": "Chivas de Guadalajara", "U.N.A.M. - Pumas": "Pumas UNAM",
  "Club America": "Club América", "Club Queretaro": "Querétaro", "FC Juarez": "FC Juárez",
  Leon: "Club León", "Atletico San Luis": "Atlético de San Luis", "Mazatlán": "Mazatlán FC",
  // Brasil
  "Sao Paulo": "São Paulo", "Vasco DA Gama": "Vasco da Gama",
  "Atletico Paranaense": "Athletico Paranaense", "Atletico-MG": "Atlético Mineiro",
  "America Mineiro": "América Mineiro", Gremio: "Grêmio", Goias: "Goiás", Cuiaba: "Cuiabá",
  "Fortaleza EC": "Fortaleza", "RB Bragantino": "Red Bull Bragantino", Bahia: "EC Bahia",
  // Argentina
  "Gimnasia L.P.": "Gimnasia La Plata", "Velez Sarsfield": "Vélez Sarsfield",
  "Belgrano Cordoba": "Belgrano", "Union Santa Fe": "Unión de Santa Fe",
  "Defensa Y Justicia": "Defensa y Justicia", Huracan: "Huracán", Lanus: "Lanús",
  "Colon Santa Fe": "Colón", "Estudiantes L.P.": "Estudiantes de La Plata",
  "Atletico Tucuman": "Atlético Tucumán", "Talleres Cordoba": "Talleres",
  "Newells Old Boys": "Newell's Old Boys", "Argentinos JRS": "Argentinos Juniors",
  "Arsenal Sarandi": "Arsenal de Sarandí", "Sarmiento Junin": "Sarmiento",
  "Instituto Cordoba": "Instituto", "Central Cordoba de Santiago": "Central Córdoba",
  "San Martin S.J.": "San Martín de San Juan", "San Martin Tucuman": "San Martín de Tucumán",
  "Atletico DE Rafaela": "Atlético de Rafaela", "Brown DE Adrogue": "Brown de Adrogué",
  "Independ. Rivadavia": "Independiente Rivadavia", "Gimnasia M.": "Gimnasia de Mendoza",
  "Gimnasia Jujuy": "Gimnasia de Jujuy", "Deportivo Moron": "Deportivo Morón",
  "Villa Dalmine": "Villa Dálmine", "Defensores De Belgrano": "Defensores de Belgrano",
  "Deportivo Maipu": "Deportivo Maipú", "Racing Cordoba": "Racing de Córdoba",
  "Estudiantes de Rio Cuarto": "Estudiantes de Río Cuarto", "Chaco For Ever": "Chaco For Ever",
  "CA Estudiantes": "Estudiantes de Buenos Aires", "Atletico Mitre": "Mitre",
  // Chile
  "Union Espanola": "Unión Española", "Everton de Vina": "Everton de Viña",
  "Union La Calera": "Unión La Calera", "Curico Unido": "Curicó Unido", Nublense: "Ñublense",
  "Deportes Copiapo": "Deportes Copiapó", "U. Catolica": "Universidad Católica",
  "A. Italiano": "Audax Italiano",
  // Colombia
  "Independiente Medellin": "Independiente Medellín", "Atletico Nacional": "Atlético Nacional",
  "America de Cali": "América de Cali", "Union Magdalena": "Unión Magdalena",
  "Internacional de Bogota": "Internacional de Bogotá", Chico: "Boyacá Chicó",
  Huila: "Atlético Huila",
  // Uruguay
  Penarol: "Peñarol", "CA River Plate": "River Plate de Montevideo", "Club Nacional": "Nacional",
  Fenix: "Fénix", "Atletico Torque": "Montevideo City Torque",
  "Racing Montevideo": "Racing de Montevideo", "Liverpool Montevideo": "Liverpool de Montevideo",
  Wanderers: "Montevideo Wanderers",
  // Paraguay
  "Cerro Porteno": "Cerro Porteño", "Nacional Asuncion": "Nacional de Asunción",
  "Libertad Asuncion": "Libertad", "Club Guarani": "Guaraní", "Sportivo Luqueno": "Sportivo Luqueño",
  // Perú
  "Cesar Vallejo": "César Vallejo", "Union Comercio": "Unión Comercio",
  "Alianza Atletico": "Alianza Atlético", "Atletico Grau": "Atlético Grau",
  // Ecuador
  "Universidad Catolica": "Universidad Católica de Quito", "Delfin SC": "Delfín SC",
  "Tecnico Universitario": "Técnico Universitario", "Guayaquil City FC": "Guayaquil City",
  "Mushuc Runa SC": "Mushuc Runa", "Gualaceo SC": "Gualaceo", "Cumbayá": "Cumbayá FC",
  // Bolivia
  "San Antonio Bulo Bulo": "San Antonio",
  // Venezuela
  "Deportivo Tachira FC": "Deportivo Táchira", "Estudiantes de Merida FC": "Estudiantes de Mérida",
  "Mineros de Guyana": "Mineros de Guayana", UCV: "UCV FC",
  "CD Hermanos Colmenarez": "Hermanos Colmenárez",
};

// ── utilidades ───────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slugify(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Iniciales de respaldo cuando la API no da código (máx. 3 letras). */
function abbreviate(name) {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]).join("").toUpperCase();
}

/** Nombre corto para los sitios donde no cabe el largo. */
function shorten(name) {
  const stripped = name
    .replace(/^(FC|CF|CD|AC|SC|SD|UD|AD|RC|RCD|SS|SSC|AS|SL|GD|EC|CA|AJ|EA|OGC|LOSC|BSC) /i, "")
    .replace(/ (FC|CF|CD|AC|SC|SD|UD|AD|BP|SAD|AFC)$/i, "");
  return stripped.length <= 18 ? stripped : stripped.slice(0, 17).trimEnd() + "…";
}

function readRatings() {
  const src = fs.readFileSync(RATINGS, "utf8");
  const out = {};
  for (const m of src.matchAll(/^\s*(\d+):\s*\[(\d+),\s*(\d+),\s*(\d+)\]/gm)) {
    out[Number(m[1])] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return out;
}

async function fetchLeagueTeams(league) {
  const file = path.join(CACHE, `${league.api}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));

  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY not configured (y no hay caché en " + CACHE + ")");
  await sleep(7000);
  const res = await fetch(
    `https://v3.football.api-sports.io/teams?league=${league.api}&season=${SEASON}`,
    { headers: { "x-apisports-key": key } }
  );
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length) {
    throw new Error(`${league.id}: ${JSON.stringify(json.errors)}`);
  }
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(json.response, null, 1));
  return json.response;
}

// ── construcción ─────────────────────────────────────────────────────
const ratings = readRatings();
const seenSlugs = new Set();
const missingRatings = [];
const leagues = [];

const placed = new Set(); // un club solo puede estar en una división

for (const league of LEAGUES) {
  const teams = await fetchLeagueTeams(league);
  const clubs = [];
  for (const { team } of teams) {
    // La temporada de referencia pilla a algún equipo entre dos divisiones
    // (ascendido o descendido). Se queda en la primera en la que aparece,
    // y LEAGUES lista siempre la división superior antes que la inferior.
    if (placed.has(team.id)) continue;
    placed.add(team.id);

    const name = NAME_ES[team.name] ?? team.name;
    let id = slugify(name);
    if (seenSlugs.has(id)) id = `${id}-${league.country.toLowerCase()}`;
    seenSlugs.add(id);

    const rating = ratings[team.id];
    if (!rating) missingRatings.push(`${team.id}\t${name}\t(${league.id})`);

    clubs.push({
      id,
      name,
      short: shorten(name),
      abbr: (team.code || abbreviate(name)).slice(0, 3).toUpperCase(),
      crest: team.logo ?? null,
      rep: rating ?? [0, 0, 0],
    });
  }
  leagues.push({ ...league, clubs });
  console.log(`${league.id.padEnd(20)} ${clubs.length} clubes`);
}

const total = leagues.reduce((n, l) => n + l.clubs.length, 0);

const body = leagues
  .map((l) => {
    const clubs = l.clubs
      .map((c) =>
        `    { id: ${JSON.stringify(c.id)}, name: ${JSON.stringify(c.name)}, short: ${JSON.stringify(c.short)}, ` +
        `abbr: ${JSON.stringify(c.abbr)}, crest: ${JSON.stringify(c.crest)}, rep: [${c.rep.join(", ")}] },`
      )
      .join("\n");
    return `  {
    id: ${JSON.stringify(l.id)},
    name: ${JSON.stringify(l.name)},
    country: ${JSON.stringify(l.country)},
    confederation: ${JSON.stringify(l.conf)},
    tier: ${l.tier},
    cup: ${JSON.stringify(l.cup)},
    clubs: [
${clubs}
    ],
  },`;
  })
  .join("\n");

const file = `// ╔══════════════════════════════════════════════════════════════════╗
// ║  Ligas y clubes del Simulador de Carrera — GENERADO, no editar     ║
// ║                                                                    ║
// ║  Regenerar:  node scripts/build-career-dataset.mjs                 ║
// ║  Para ajustar el equilibrio, edita club-ratings.ts (\`rep\`).         ║
// ║                                                                    ║
// ║  rep = [nacional, continental, nivel], escala 0-5.                 ║
// ╚══════════════════════════════════════════════════════════════════╝
import type { CareerLeague } from "./types";

/** ${leagues.length} ligas · ${total} clubes. */
export const LEAGUES: CareerLeague[] = [
${body}
];
`;

fs.writeFileSync(OUT, file);
console.log(`\n→ ${path.relative(ROOT, OUT)}  ·  ${leagues.length} ligas · ${total} clubes`);
if (missingRatings.length) {
  console.log(`\n⚠ ${missingRatings.length} clubes sin valoración en club-ratings.ts:`);
  console.log(missingRatings.join("\n"));
}
