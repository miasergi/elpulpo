import { ImageResponse } from "next/og";

export const runtime = "edge";

// Tarjeta para compartir tu carrera terminada.
// /api/og/career?name=…&num=10&verdict=…&emoji=🥇&ovr=94&apps=780&goals=410
//   &seasons=22&value=150000000&club=Real Madrid&country=ESP&t=1,0,2,0,7,3
//
// `t` son los títulos en el orden en que se listan abajo, separados por comas.
const TROPHY_LABELS = [
  { emoji: "🌐", name: "Mundial" },
  { emoji: "🌎", name: "Continental" },
  { emoji: "🌍", name: "Copa continental" },
  { emoji: "🥈", name: "Segunda continental" },
  { emoji: "🏆", name: "Liga" },
  { emoji: "🥇", name: "Copa" },
];

export function GET(request: Request) {
  const u = new URL(request.url);
  const rawName = u.searchParams.get("name") || "Jugador";
  // Los apellidos largos tienen que caber en la columna sin invadir la vitrina:
  // primero se recortan con puntos suspensivos y luego se encoge la letra.
  const name = rawName.length > 17 ? `${rawName.slice(0, 16).trimEnd()}…` : rawName;
  const nameSize = name.length > 14 ? "34px" : name.length > 11 ? "42px" : "52px";
  const num = (u.searchParams.get("num") || "").slice(0, 2);
  const verdict = (u.searchParams.get("verdict") || "Una vida en el fútbol").slice(0, 40);
  const emoji = (u.searchParams.get("emoji") || "⚽").slice(0, 4);
  const ovr = (u.searchParams.get("ovr") || "0").slice(0, 2);
  const apps = u.searchParams.get("apps") || "0";
  const goals = u.searchParams.get("goals") || "0";
  const seasons = u.searchParams.get("seasons") || "0";
  const club = (u.searchParams.get("club") || "").slice(0, 24);
  const country = (u.searchParams.get("country") || "").slice(0, 3);
  const value = formatValue(Number(u.searchParams.get("value") || 0));

  const counts = (u.searchParams.get("t") || "")
    .split(",")
    .map((n) => Number(n) || 0)
    .slice(0, TROPHY_LABELS.length);
  // Solo caben cinco filas en la vitrina; el resto se resume en una línea.
  const won = TROPHY_LABELS.map((t, i) => ({ ...t, count: counts[i] ?? 0 })).filter((t) => t.count > 0);
  const trophies = won.slice(0, 5);
  const hiddenTrophies = won.length - trophies.length;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #07171c 0%, #1c2233 55%, #2a1a12 100%)",
          color: "#fff",
          padding: "46px 54px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Alturas fijas en cabecera y pie: así el bloque central nunca se
            desborda por mucho palmarés que haya. */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", height: "46px", flexShrink: 0 }}>
          <div style={{ fontSize: "34px" }}>🐙</div>
          <div style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-1px" }}>El Pulpo</div>
          <div style={{ marginLeft: "auto", fontSize: "22px", color: "#f59e0b" }}>Simulador de carrera</div>
        </div>

        <div style={{ display: "flex", flex: 1, gap: "40px", marginTop: "22px", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", flex: "0 0 500px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div style={{ fontSize: "86px", lineHeight: 1, flexShrink: 0 }}>{emoji}</div>
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
                  <div style={{ fontSize: nameSize, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-1px" }}>{name}</div>
                  {/* Satori exige que cada div tenga un único hijo de texto,
                      así que el dorsal se compone antes, no en el JSX. */}
                  {num && <div style={{ fontSize: "30px", fontWeight: 800, color: "#6c8c8f" }}>{`#${num}`}</div>}
                </div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: "#f59e0b", marginTop: "6px" }}>{verdict}</div>
                {(club || country) && (
                  <div style={{ fontSize: "22px", color: "#93b4b6", marginTop: "4px" }}>
                    {[country, club].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "26px", flexWrap: "wrap" }}>
              <Pill label="Media" value={ovr} />
              <Pill label="Partidos" value={apps} />
              <Pill label="Goles" value={goals} />
            </div>
            <div style={{ display: "flex", gap: "12px", marginTop: "12px", flexWrap: "wrap" }}>
              <Pill label="Temporadas" value={seasons} />
              <Pill label="Valor máx." value={value} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", fontSize: "20px", color: "#6c8c8f", fontWeight: 700, letterSpacing: "1px", marginBottom: "10px" }}>
              VITRINA
            </div>
            {trophies.length === 0 ? (
              <div style={{ display: "flex", fontSize: "24px", color: "#93b4b6" }}>
                Sin títulos, pero con una carrera entera.
              </div>
            ) : (
              trophies.map((t) => (
                <div
                  key={t.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    background: "rgba(245,158,11,0.12)",
                    border: "2px solid rgba(245,158,11,0.35)",
                    borderRadius: "12px",
                    padding: "7px 16px",
                    marginBottom: "8px",
                  }}
                >
                  <div style={{ fontSize: "26px" }}>{t.emoji}</div>
                  <div style={{ fontSize: "23px", fontWeight: 700, color: "#f1faf9" }}>{t.name}</div>
                  <div style={{ marginLeft: "auto", fontSize: "26px", fontWeight: 900, color: "#f59e0b" }}>
                    {`×${t.count}`}
                  </div>
                </div>
              ))
            )}
            {hiddenTrophies > 0 && (
              <div style={{ display: "flex", fontSize: "18px", color: "#6c8c8f" }}>
                {`y ${hiddenTrophies} título${hiddenTrophies === 1 ? "" : "s"} más`}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", height: "8px", borderRadius: "4px", overflow: "hidden", flexShrink: 0 }}>
          <div style={{ flex: 1, background: "#fb7e3c" }} />
          <div style={{ flex: 1, background: "#ff5c9d" }} />
          <div style={{ flex: 1, background: "#22d3ee" }} />
        </div>
        <div style={{ display: "flex", marginTop: "12px", fontSize: "21px", color: "#93b4b6", flexShrink: 0 }}>
          Construye tu carrera de futbolista · elpulpo.vercel.app
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: "rgba(255,255,255,0.08)",
        borderRadius: "14px",
        padding: "10px 18px",
      }}
    >
      <div style={{ fontSize: "21px", color: "#93b4b6" }}>{label}</div>
      <div style={{ fontSize: "27px", fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function formatValue(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    const text = millions >= 100 ? Math.round(millions).toString() : millions.toFixed(1).replace(".0", "");
    return `${text} M €`;
  }
  return `${Math.round(value / 1000)} mil €`;
}
