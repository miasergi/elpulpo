// Upserts Vercel env vars with EXACT values (no trailing whitespace) via the REST API.
// Usage: node --env-file=.env.local scripts/set-vercel-env.mjs
import { readFileSync } from "node:fs";

const TOKEN = process.env.VERCEL_TOKEN;
const TEAM_SLUG = "sergicornellesaguilar-2589s-projects";
const PROJECT = "elpulpo";
if (!TOKEN) { console.error("Falta VERCEL_TOKEN"); process.exit(1); }

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
  "ADMIN_EMAILS",
];

// Parse .env.local
const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const api = (path, init) =>
  fetch(`https://api.vercel.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });

async function main() {
  // Resolve team id from slug
  const teams = await (await api("/v2/teams")).json();
  const team = teams.teams.find((t) => t.slug === TEAM_SLUG);
  if (!team) throw new Error("Equipo no encontrado: " + TEAM_SLUG);
  const teamId = team.id;

  for (const key of KEYS) {
    const value = env[key];
    if (value == null || value === "") { console.log("skip (vacío)", key); continue; }
    const res = await api(`/v10/projects/${PROJECT}/env?teamId=${teamId}&upsert=true`, {
      method: "POST",
      body: JSON.stringify({
        key,
        value,
        type: "encrypted",
        target: ["production", "preview", "development"],
      }),
    });
    const json = await res.json();
    console.log(res.ok ? "OK  " : "ERR ", key, res.ok ? `(len ${value.length})` : JSON.stringify(json.error));
  }
  console.log("\n✓ Variables actualizadas con valores exactos.");
}

main().catch((e) => { console.error("✗", e.message); process.exit(1); });
