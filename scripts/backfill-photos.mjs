// One-time backfill of player photos from TheSportsDB's full name-search API.
// Run: node --env-file=.env.local scripts/backfill-photos.mjs
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
const KEY = process.env.THESPORTSDB_KEY || "3";

// FIFA code → English country name (TheSportsDB strNationality). Tiebreaker only.
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
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) { await sleep(3000); continue; }
      if (!res.ok) return [];
      const j = await res.json();
      return (j.player || []).filter((p) => p.strSport === "Soccer");
    } catch {
      await sleep(1500);
    }
  }
  return [];
}

function pick(results, country) {
  const withPhoto = results.filter((p) => p.strCutout || p.strRender || p.strThumb);
  if (withPhoto.length === 0) return null;
  const c = norm(country);
  const natMatch = withPhoto.find((p) => {
    const n = norm(p.strNationality);
    return n && (n === c || n.includes(c) || c.includes(n));
  });
  const chosen = natMatch || withPhoto[0];
  return chosen.strCutout || chosen.strRender || chosen.strThumb;
}

async function main() {
  const { data: players, error } = await supabase
    .from("players")
    .select("id, name, photo_url, team:teams(code)")
    .is("photo_url", null);
  if (error) throw error;

  console.log(`${players.length} players without photo`);
  let filled = 0;
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const code = Array.isArray(p.team) ? p.team[0]?.code : p.team?.code;
    const results = await search(p.name);
    const photo = pick(results, COUNTRY[code] || "");
    if (photo) {
      await supabase.from("players").update({ photo_url: photo }).eq("id", p.id);
      filled++;
    }
    if (i % 25 === 0 || i === players.length - 1) {
      console.log(`[${i + 1}/${players.length}] filled ${filled} · last: ${p.name} ${photo ? "✓" : "—"}`);
    }
    await sleep(220); // be gentle with the free key
  }
  console.log(`DONE · filled ${filled}/${players.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
