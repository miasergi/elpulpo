// Generates square PWA icons from the (wide, transparent-padded) logo.
// Run with:  node scripts/make-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const SRC = "public/pulpo-logo.png";
const OUT = "public/icons";
const BG = "#07171c"; // app background / theme colour

async function main() {
  await mkdir(OUT, { recursive: true });

  // Trim transparent borders so the circular badge fills the frame.
  const badge = await sharp(SRC).trim().png().toBuffer();

  // Transparent icons (purpose "any"): badge nearly full-bleed.
  for (const size of [192, 256, 512]) {
    await sharp(badge)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ palette: true, quality: 90 })
      .toFile(`${OUT}/icon-${size}.png`);
  }

  // Maskable icons: solid background, badge inside the ~80% safe zone.
  for (const size of [192, 512]) {
    const inner = Math.round(size * 0.78);
    const pad = Math.round((size - inner) / 2);
    await sharp(badge)
      .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({ top: pad, bottom: size - inner - pad, left: pad, right: size - inner - pad, background: BG })
      .flatten({ background: BG })
      .png({ palette: true, quality: 90 })
      .toFile(`${OUT}/maskable-${size}.png`);
  }

  // Apple touch icon: solid background (iOS rounds the corners itself).
  {
    const size = 180;
    const inner = Math.round(size * 0.86);
    const pad = Math.round((size - inner) / 2);
    await sharp(badge)
      .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({ top: pad, bottom: size - inner - pad, left: pad, right: size - inner - pad, background: BG })
      .flatten({ background: BG })
      .png({ palette: true, quality: 90 })
      .toFile(`${OUT}/apple-touch-icon.png`);
  }

  console.log("✓ Iconos generados en", OUT);
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
