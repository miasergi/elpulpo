// Serves /ads.txt for AdSense verification, derived from the configured client id.
export function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT; // ca-pub-XXXXXXXX
  if (!client) return new Response("", { status: 404 });
  const pub = client.replace(/^ca-/, ""); // pub-XXXXXXXX
  return new Response(`google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { "content-type": "text/plain" },
  });
}
