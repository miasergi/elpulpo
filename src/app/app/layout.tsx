import { requireProfile } from "@/lib/auth";
import { getActiveCompetition, getMatches, getMyPredictions } from "@/lib/queries";
import { BottomNav } from "@/components/app/bottom-nav";
import { InstallPrompt } from "@/components/app/install-prompt";
import { AdSenseScript } from "@/components/ads/adsense-script";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile();

  // Count upcoming matches the user hasn't predicted (for the nav badge).
  // All these queries are per-request memoised, so pages reuse them for free.
  let pending = 0;
  const competition = await getActiveCompetition();
  if (competition && profile.active_group_id) {
    const [matches, preds] = await Promise.all([
      getMatches(competition.id),
      getMyPredictions(profile.id, profile.active_group_id),
    ]);
    pending = matches.filter((m) => m.status === "scheduled" && !preds.has(m.id)).length;
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-24 pt-safe">
      {!profile.is_pro && <AdSenseScript />}
      {children}
      <InstallPrompt />
      <BottomNav pendingCount={pending} />
    </div>
  );
}
