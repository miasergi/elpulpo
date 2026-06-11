// One-time backfill of player clubs from TheSportsDB name-search.
// Run: node --env-file=.env.local scripts/backfill-clubs.mjs
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

const norm = (s) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(name) {
  const url = `https://www.thesportsdb.com/api/v1/json/${KEY}/searchplayers.php?p=${encodeURIComponent(name)}`;
  for (let a = 0; a < 3; a++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) { await sleep(3000); continue; }
      if (!res.ok) return [];
      const j = await res.json();
      return (j.player || []).filter((p) => p.strSport === "Soccer");
    } catch { await sleep(1500); }
  }
  return [];
}

function pickClub(results, country) {
  const c = norm(country);
  // Prefer the result whose nationality matches; club is strTeam.
  const natMatch = results.find((p) => {
    const n = norm(p.strNationality);
    return n && (n === c || n.includes(c) || c.includes(n));
  });
  const chosen = natMatch || results[0];
  const club = chosen?.strTeam?.trim();
  return club && !/national/i.test(club) ? club : null;
}

async function main() {
  const { data: players, error } = await supabase
    .from("players")
    .select("id, name, club, team:teams(code)")
    .is("club", null);
  if (error) throw error;

  console.log(`${players.length} players without club`);
  let filled = 0;
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const code = Array.isArray(p.team) ? p.team[0]?.code : p.team?.code;
    const club = pickClub(await search(p.name), COUNTRY[code] || "");
    if (club) {
      await supabase.from("players").update({ club }).eq("id", p.id);
      filled++;
    }
    if (i % 50 === 0 || i === players.length - 1) {
      console.log(`[${i + 1}/${players.length}] filled ${filled} · ${p.name} -> ${club || "—"}`);
    }
    await sleep(220);
  }
  console.log(`DONE · filled ${filled}/${players.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
