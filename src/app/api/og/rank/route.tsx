import { ImageResponse } from "next/og";

export const runtime = "edge";

// Shareable rank card. /api/og/rank?g=Grupo&r=1&t=12&p=Sergi&n=8&pl=5
export function GET(request: Request) {
  const u = new URL(request.url);
  const group = (u.searchParams.get("g") || "Mi grupo").slice(0, 40);
  const player = (u.searchParams.get("p") || "Jugador").slice(0, 30);
  const rank = u.searchParams.get("r") || "–";
  const total = u.searchParams.get("t") || "0";
  const of = u.searchParams.get("n") || "0";
  const played = u.searchParams.get("pl") || "0";

  const medal = rank === "1" ? "🥇" : rank === "2" ? "🥈" : rank === "3" ? "🥉" : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0a1628 0%, #0f2942 55%, #1a1330 100%)",
          color: "#fff",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        {/* top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div style={{ fontSize: "44px" }}>🐙</div>
          <div style={{ fontSize: "34px", fontWeight: 800, letterSpacing: "-1px" }}>El Pulpo</div>
          <div style={{ marginLeft: "auto", fontSize: "26px", color: "#7dd3fc" }}>Mundial 2026</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          <div style={{ fontSize: "30px", color: "#cbd5e1" }}>{group}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "20px", marginTop: "8px" }}>
            <div style={{ fontSize: "120px" }}>{medal || "⚽"}</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "96px", fontWeight: 900, lineHeight: 1, letterSpacing: "-3px" }}>
                {rank}º de {of}
              </div>
              <div style={{ fontSize: "40px", color: "#34d399", fontWeight: 700, marginTop: "8px" }}>
                {player} · {total} pts
              </div>
            </div>
          </div>
        </div>

        {/* tri-colour bar */}
        <div style={{ display: "flex", marginTop: "48px", height: "12px", borderRadius: "6px", overflow: "hidden" }}>
          <div style={{ flex: 1, background: "#fb7e3c" }} />
          <div style={{ flex: 1, background: "#ff5c9d" }} />
          <div style={{ flex: 1, background: "#22d3ee" }} />
        </div>
        <div style={{ display: "flex", marginTop: "20px", fontSize: "26px", color: "#94a3b8" }}>
          {played} partidos jugados · elpulpo.vercel.app
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
