import { requireProfile } from "@/lib/auth";
import { BottomNav } from "@/components/app/bottom-nav";
import { InstallPrompt } from "@/components/app/install-prompt";
import { AdSenseScript } from "@/components/ads/adsense-script";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile();

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-24 pt-safe">
      {!profile.is_pro && <AdSenseScript />}
      {children}
      <InstallPrompt />
      <BottomNav />
    </div>
  );
}
