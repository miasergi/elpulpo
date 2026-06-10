import Script from "next/script";

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

/** Loads the AdSense library once per page. Render only for non-Pro users. */
export function AdSenseScript() {
  if (!CLIENT) return null;
  return (
    <Script
      id="adsense"
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`}
      crossOrigin="anonymous"
    />
  );
}
