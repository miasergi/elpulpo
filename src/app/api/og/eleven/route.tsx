import { ImageResponse } from "next/og";

export const runtime = "edge";

type PickItem = { n: string; c: string; l: string };
const LINE_ICON: Record<string, string> = { gk: "🧤", def: "🛡️", mid: "⚙️", fwd: "⚡" };
const LINE_ORDER = ["gk", "def", "mid", "fwd"];

// Tarjeta para compartir tu Mundial.
// /api/og/eleven?name=…&res=…&emoji=…&ov=88&chem=64&picks=<base64>
export function GET(request: Request) {
  const u = new URL(request.url);
  const name = (u.searchParams.get("name") || "Mi 11 del mundial").slice(0, 28);
  const code = (u.searchParams.get("code") || "").slice(0, 4);
  const res = (u.searchParams.get("res") || "Mundial").slice(0, 40);
  const emoji = (u.searchParams.get("emoji") || "⚽").slice(0, 4);
  const ov = u.searchParams.get("ov");
  const chem = u.searchParams.get("chem") || "0";
  const picksRaw = u.searchParams.get("picks") || "";

  let playerList: PickItem[] = [];
  if (picksRaw) {
    try {
      playerList = JSON.parse(picksRaw) as PickItem[];
    } catch {
      playerList = [];
    }
  }

  const hasPicks = playerList.length > 0;

  // Agrupa por línea para renderizar
  const byLine: Record<string, PickItem[]> = {};
  for (const p of playerList) {
    if (!byLine[p.l]) byLine[p.l] = [];
    byLine[p.l].push(p);
  }

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
          padding: "60px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div style={{ fontSize: "40px" }}>🐙</div>
          <div style={{ fontSize: "30px", fontWeight: 800, letterSpacing: "-1px" }}>El Pulpo</div>
          <div style={{ marginLeft: "auto", fontSize: "24px", color: "#5fe3ec" }}>El 11 del mundial</div>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, gap: "48px", marginTop: "32px", alignItems: "center" }}>
          {/* Left: result */}
          <div style={{ display: "flex", flexDirection: "column", flex: hasPicks ? "0 0 460px" : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div style={{ fontSize: hasPicks ? "110px" : "150px", lineHeight: 1 }}>{emoji}</div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: hasPicks ? "62px" : "84px", fontWeight: 900, lineHeight: 1.02, letterSpacing: "-2px" }}>{res}</div>
                {code && (
                  <div style={{ display: "flex", marginTop: "10px" }}>
                    <div style={{ fontSize: "28px", fontWeight: 800, color: "#04201d", background: "#5fe3ec", borderRadius: "10px", padding: "3px 14px" }}>
                      {code}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: "14px", marginTop: "24px" }}>
              {ov && <Pill label="Media" value={ov} />}
              <Pill label="Química" value={`${chem}%`} />
            </div>
          </div>

          {/* Right: player list */}
          {hasPicks && (
            <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: "10px" }}>
              {LINE_ORDER.filter((l) => byLine[l]?.length).map((l) => (
                <div key={l} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <div style={{ fontSize: "22px", width: "28px", flexShrink: 0 }}>{LINE_ICON[l]}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {byLine[l].map((p, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          background: "rgba(255,255,255,0.08)",
                          borderRadius: "8px",
                          padding: "4px 10px",
                        }}
                      >
                        <span style={{ fontSize: "18px", fontWeight: 700, color: "#f1faf9" }}>{p.n}</span>
                        <span style={{ fontSize: "14px", color: "#5fe3ec", fontWeight: 600 }}>{p.c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", marginTop: "28px", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ flex: 1, background: "#fb7e3c" }} />
          <div style={{ flex: 1, background: "#ff5c9d" }} />
          <div style={{ flex: 1, background: "#22d3ee" }} />
        </div>
        <div style={{ display: "flex", marginTop: "14px", fontSize: "22px", color: "#93b4b6" }}>
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
