import { requireProfile } from "@/lib/auth";
import { BottomNav } from "@/components/app/bottom-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireProfile();

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-24 pt-safe">
      {children}
      <BottomNav />
    </div>
  );
}
