import { ImageResponse } from "next/og";

export const runtime = "edge";

// Tarjeta para compartir tu Mundial.
// /api/og/eleven?name=España&code=ESP&res=Campeón%20del%20mundo&emoji=🏆&ov=88&chem=64
export function GET(request: Request) {
  const u = new URL(request.url);
  const name = (u.searchParams.get("name") || "Mi 11 del mundial").slice(0, 28);
  const code = (u.searchParams.get("code") || "").slice(0, 4);
  const res = (u.searchParams.get("res") || "Mundial").slice(0, 40);
  const emoji = (u.searchParams.get("emoji") || "⚽").slice(0, 4);
  const ov = u.searchParams.get("ov"); // media (puede no compartirse)
  const chem = u.searchParams.get("chem") || "0";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #07171c 0%, #0f2942 55%, #1a1330 100%)",
          color: "#fff",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div style={{ fontSize: "44px" }}>🐙</div>
          <div style={{ fontSize: "34px", fontWeight: 800, letterSpacing: "-1px" }}>El Pulpo</div>
          <div style={{ marginLeft: "auto", fontSize: "26px", color: "#5fe3ec" }}>El 11 del mundial</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
            <div style={{ fontSize: "150px", lineHeight: 1 }}>{emoji}</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "84px", fontWeight: 900, lineHeight: 1.02, letterSpacing: "-2px" }}>{res}</div>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "14px" }}>
                {code && (
                  <div
                    style={{
                      display: "flex",
                      fontSize: "30px",
                      fontWeight: 800,
                      color: "#04201d",
                      background: "#5fe3ec",
                      borderRadius: "12px",
                      padding: "4px 16px",
                    }}
                  >
                    {code}
                  </div>
                )}
                <div style={{ fontSize: "40px", color: "#f1faf9", fontWeight: 700 }}>{name}</div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "16px", marginTop: "34px" }}>
            {ov && <Pill label="Media" value={ov} />}
            <Pill label="Química" value={`${chem}%`} />
          </div>
        </div>

        <div style={{ display: "flex", marginTop: "40px", height: "12px", borderRadius: "6px", overflow: "hidden" }}>
          <div style={{ flex: 1, background: "#fb7e3c" }} />
          <div style={{ flex: 1, background: "#ff5c9d" }} />
          <div style={{ flex: 1, background: "#22d3ee" }} />
        </div>
        <div style={{ display: "flex", marginTop: "18px", fontSize: "26px", color: "#93b4b6" }}>
          Monta tu 11 y juega tu Mundial · elpulpo.vercel.app
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
        padding: "12px 22px",
      }}
    >
      <div style={{ fontSize: "26px", color: "#93b4b6" }}>{label}</div>
      <div style={{ fontSize: "34px", fontWeight: 900 }}>{value}</div>
    </div>
  );
}
