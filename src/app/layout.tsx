import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "El Pulpo · Predicciones de fútbol con amigos",
  description:
    "Crea grupos con tus amigos y predice los resultados del Mundial 2026. El que más acierte, gana.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "El Pulpo" },
  openGraph: {
    title: "El Pulpo · Predicciones de fútbol con amigos",
    description: "Predice el Mundial 2026 con tu grupo de amigos. ¿Quién es el oráculo?",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#07171c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${jakarta.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
