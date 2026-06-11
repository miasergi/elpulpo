// One-time enrichment of player club, club badge and detailed position from
// TheSportsDB name-search. Run: node --env-file=.env.local scripts/backfill-player-meta.mjs
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
const KEY = process.env.THESPORTSDB_KEY || "3";

const COUNTRY = {
  ALG: "Algeria", ARG: "Argentina", AUS: "Australia", AUT: "Austria", BEL: "Belgium",
  BIH: "Bosnia and Herzegovina", BRA: "Brazil", CAN: "Canada", CIV: "Ivory Coast",
  COD: "DR Congo", COL: "Colombia", CPV: "Cape Verde", CRO: "Croatia", CUW: "Curacao",
  CZE: "Czech Republic", ECU: "Ecuador", EGY: "Egypt", ENG: "England", ESP: "Spain",
  FRA: "France", GER: "Germany", GHA: "Ghana", HAI: "Haiti", IRN: "Iran", IRQ: "Iraq",
  JOR: "Jordan", JPN: "Japan", KOR: "South Korea", KSA: "Saudi Arabia", MAR: "Morocco",
  MEX: "Mexico", NED: "Netherlands", NOR: "Norway", NZL: "New Zealand", PAN: "Panama",
  PAR: "Paraguay", POR: "Portugal", QAT: "Qatar", RSA: "South Africa", SCO: "Scotland",
  SEN: "Senegal", SUI: "Switzerland", SWE: "Sweden", TUN: "Tunisia", TUR: "Turkey",
  URU: "Uruguay", USA: "United States", UZB: "Uzbekistan",
};

// Granular English position → Spanish.
const POS_ES = [
  [/goalkeeper/i, "Portero"],
  [/centre-back|center-back/i, "Defensa central"],
  [/left-back/i, "Lateral izquierdo"],
  [/right-back/i, "Lateral derecho"],
  [/wing-back/i, "Carrilero"],
  [/defensive midfield/i, "Pivote"],
  [/attacking midfield/i, "Mediapunta"],
  [/central midfield|centre midfield/i, "Mediocentro"],
  [/left midfield|left wing/i, "Extremo izquierdo"],
  [/right midfield|right wing/i, "Extremo derecho"],
  [/midfield/i, "Centrocampista"],
  [/centre-forward|center-forward|striker/i, "Delantero centro"],
  [/forward/i, "Delantero"],
  [/defender/i, "Defensa"],
];
function posEs(p) {
  if (!p) return null;
  for (const [re, es] of POS_ES) if (re.test(p)) return es;
  return null;
}

const norm = (s) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tsdb(url) {
  for (let a = 0; a < 4; a++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) { await sleep(4000); continue; }
      const txt = await res.text();
      if (txt.startsWith("<")) { await sleep(4000); continue; } // rate-limit HTML
      return JSON.parse(txt);
    } catch { await sleep(2000); }
  }
  return null;
}

const badgeCache = new Map(); // idTeam -> badge url | null
async function clubBadge(idTeam) {
  if (!idTeam) return null;
  if (badgeCache.has(idTeam)) return badgeCache.get(idTeam);
  const j = await tsdb(`https://www.thesportsdb.com/api/v1/json/${KEY}/lookupteam.php?id=${idTeam}`);
  const badge = j?.teams?.[0]?.strBadge ?? null;
  badgeCache.set(idTeam, badge);
  await sleep(180);
  return badge;
}

function pickPlayer(results, country) {
  const c = norm(country);
  const nat = results.find((p) => {
    const n = norm(p.strNationality);
    return n && (n === c || n.includes(c) || c.includes(n));
  });
  return nat || results[0] || null;
}

async function main() {
  const { data: players, error } = await supabase
    .from("players")
    .select("id, name, club, position_detail, club_badge, team:teams(code)")
    .or("club.is.null,position_detail.is.null");
  if (error) throw error;

  console.log(`${players.length} players to enrich`);
  let clubN = 0, posN = 0, badgeN = 0;
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const code = Array.isArray(p.team) ? p.team[0]?.code : p.team?.code;
    const j = await tsdb(
      `https://www.thesportsdb.com/api/v1/json/${KEY}/searchplayers.php?p=${encodeURIComponent(p.name)}`
    );
    const results = (j?.player || []).filter((x) => x.strSport === "Soccer");
    const match = pickPlayer(results, COUNTRY[code] || "");

    const update = {};
    if (match) {
      const club = match.strTeam?.trim();
      if (club && !/national/i.test(club)) { update.club = club; clubN++; }
      const pos = posEs(match.strPosition);
      if (pos) { update.position_detail = pos; posN++; }
      const badge = club ? await clubBadge(match.idTeam) : null;
      if (badge) { update.club_badge = badge; badgeN++; }
    }
    if (Object.keys(update).length) {
      await supabase.from("players").update(update).eq("id", p.id);
    }
    if (i % 50 === 0 || i === players.length - 1) {
      console.log(`[${i + 1}/${players.length}] club ${clubN} · pos ${posN} · badge ${badgeN} · ${p.name}`);
    }
    await sleep(220);
  }
  console.log(`DONE · club ${clubN} · pos ${posN} · badge ${badgeN}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
