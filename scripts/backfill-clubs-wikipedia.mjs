// Club backfill from the official Wikipedia "2026 FIFA World Cup squads" page
// (near-complete coverage). Club badges come from TheSportsDB by unique club.
// Run: node --env-file=.env.local scripts/backfill-clubs-wikipedia.mjs
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
const KEY = process.env.THESPORTSDB_KEY || "3";

// English country name (Wikipedia header) → FIFA code.
const COUNTRY = {
  Algeria: "ALG", Argentina: "ARG", Australia: "AUS", Austria: "AUT", Belgium: "BEL",
  "Bosnia and Herzegovina": "BIH", Brazil: "BRA", Canada: "CAN", "Ivory Coast": "CIV",
  "DR Congo": "COD", Colombia: "COL", "Cape Verde": "CPV", Croatia: "CRO", "Curaçao": "CUW",
  "Czech Republic": "CZE", Ecuador: "ECU", Egypt: "EGY", England: "ENG", Spain: "ESP",
  France: "FRA", Germany: "GER", Ghana: "GHA", Haiti: "HAI", Iran: "IRN", Iraq: "IRQ",
  Jordan: "JOR", Japan: "JPN", "South Korea": "KOR", "Saudi Arabia": "KSA", Morocco: "MAR",
  Mexico: "MEX", Netherlands: "NED", Norway: "NOR", "New Zealand": "NZL", Panama: "PAN",
  Paraguay: "PAR", Portugal: "POR", Qatar: "QAT", "South Africa": "RSA", Scotland: "SCO",
  Senegal: "SEN", Switzerland: "SUI", Sweden: "SWE", Tunisia: "TUN", Turkey: "TUR",
  Uruguay: "URU", "United States": "USA", Uzbekistan: "UZB",
};

const norm = (s) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** "[[SK Slavia Prague|Slavia Prague]]" → "Slavia Prague"; "[[PSV]]" → "PSV". */
function cleanWiki(s) {
  if (!s) return null;
  let v = s.trim();
  const link = v.match(/\[\[([^\]]+)\]\]/);
  if (link) v = link[1];
  if (v.includes("|")) v = v.split("|").pop();
  v = v.replace(/[[\]]/g, "").replace(/\{\{.*?\}\}/g, "").trim();
  return v || null;
}

/** Player display name, dropping wiki disambiguation like "(footballer)". */
function cleanName(s) {
  return (cleanWiki(s) || "").replace(/\s*\([^)]*\)/g, "").trim() || null;
}

function parseParams(tpl) {
  const out = {};
  // split on | not inside [[ ]] or {{ }}
  let depth = 0, cur = "", parts = [];
  for (let i = 0; i < tpl.length; i++) {
    const c = tpl[i], n = tpl[i + 1];
    if ((c === "[" && n === "[") || (c === "{" && n === "{")) { depth++; cur += c; continue; }
    if ((c === "]" && n === "]") || (c === "}" && n === "}")) { depth--; cur += c; continue; }
    if (c === "|" && depth === 0) { parts.push(cur); cur = ""; continue; }
    cur += c;
  }
  parts.push(cur);
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq > 0) out[p.slice(0, eq).trim()] = p.slice(eq + 1).trim();
  }
  return out;
}

async function getWikiSquads() {
  const url =
    "https://en.wikipedia.org/w/api.php?action=parse&page=2026_FIFA_World_Cup_squads&format=json&prop=wikitext&formatversion=2";
  const j = await (await fetch(url, { headers: { "user-agent": "ElPulpo/1.0" } })).json();
  const wt = j.parse.wikitext;
  const byCode = {}; // code -> [{name, club, no}]
  let curCode = null;
  for (const line of wt.split("\n")) {
    const h = line.match(/^===\s*([^=]+?)\s*===/);
    if (h) { curCode = COUNTRY[h[1].trim()] ?? null; continue; }
    // Greedy to the final }} so nested {{birth date ...}} isn't truncated.
    const tpl = line.match(/^\{\{nat fs (?:g )?player\s*\|([\s\S]*)\}\}\s*$/i);
    if (tpl && curCode) {
      const p = parseParams(tpl[1]);
      const name = cleanName(p.name);
      const club = cleanWiki(p.club);
      if (name) (byCode[curCode] ??= []).push({ name, norm: norm(name), club, no: p.no });
    }
  }
  return byCode;
}

const badgeCache = new Map();
async function clubBadge(club) {
  if (!club) return null;
  if (badgeCache.has(club)) return badgeCache.get(club);
  let badge = null;
  for (let a = 0; a < 3; a++) {
    try {
      const res = await fetch(
        `https://www.thesportsdb.com/api/v1/json/${KEY}/searchteams.php?t=${encodeURIComponent(club)}`
      );
      const txt = await res.text();
      if (res.status === 429 || txt.startsWith("<")) { await sleep(4000); continue; }
      const j = JSON.parse(txt);
      badge = j.teams?.find((t) => t.strSport === "Soccer")?.strBadge ?? null;
      break;
    } catch { await sleep(2000); }
  }
  badgeCache.set(club, badge);
  await sleep(200);
  return badge;
}

async function main() {
  const wiki = await getWikiSquads();
  console.log("Wikipedia teams:", Object.keys(wiki).length);

  // Supabase caps at 1000 rows; page through all players.
  const players = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from("players")
      .select("id, name, number, club, club_badge, team:teams(code)")
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    players.push(...data);
    if (data.length < 1000) break;
  }
  console.log("DB players:", players.length);

  let clubN = 0, badgeN = 0, miss = 0;
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const code = Array.isArray(p.team) ? p.team[0]?.code : p.team?.code;
    const list = wiki[code] || [];
    const n = norm(p.name);
    // 1) exact normalized name; 2) official squad number (robust to name
    //    romanization differences); 3) surname containment.
    let w = list.find((x) => x.norm === n);
    if (!w && p.number != null) {
      w = list.find((x) => x.no != null && String(x.no) === String(p.number));
    }
    if (!w) {
      const last = n.split(" ").pop();
      w = list.find((x) => last && last.length > 3 && (x.norm.includes(last) || last.includes(x.norm.split(" ").pop())));
    }
    const update = {};
    if (w?.club) { update.club = w.club; clubN++; }
    else miss++;
    if (w?.club) {
      const badge = await clubBadge(w.club);
      if (badge) { update.club_badge = badge; badgeN++; }
    }
    if (Object.keys(update).length) await supabase.from("players").update(update).eq("id", p.id);
    if (i % 50 === 0 || i === players.length - 1) {
      console.log(`[${i + 1}/${players.length}] club ${clubN} · badge ${badgeN} · miss ${miss} · ${p.name} -> ${w?.club || "—"}`);
    }
  }
  console.log(`DONE · club ${clubN}/${players.length} · badge ${badgeN} · unmatched ${miss}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
