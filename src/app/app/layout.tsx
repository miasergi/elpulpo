import { requireProfile } from "@/lib/auth";
import { getActiveCompetition, getMatches, getUserPredictions } from "@/lib/queries";
import { BottomNav } from "@/components/app/bottom-nav";
import { InstallPrompt } from "@/components/app/install-prompt";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile();

  // Count upcoming matches the user hasn't predicted (for the nav badge).
  let pending = 0;
  const competition = await getActiveCompetition();
  if (competition) {
    const matches = await getMatches(competition.id);
    const upcoming = matches.filter((m) => m.status === "scheduled");
    const preds = await getUserPredictions(profile.id, upcoming.map((m) => m.id));
    pending = upcoming.filter((m) => !preds.has(m.id)).length;
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-24 pt-safe">
      {children}
      <InstallPrompt />
      <BottomNav pendingCount={pending} />
    </div>
  );
}
