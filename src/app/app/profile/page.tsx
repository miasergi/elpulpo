import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getMyGroups } from "@/lib/queries";
import { getAdminUser } from "@/lib/admin";
import { getPlayerStats } from "@/lib/stats";
import { PageHeader } from "@/components/app/page-header";
import { ProfileForm } from "@/components/profile/profile-form";
import { StatsGrid } from "@/components/profile/stats-grid";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { profile, user } = await requireProfile();
  const [groups, admin, stats] = await Promise.all([
    getMyGroups(profile.id),
    getAdminUser(),
    getPlayerStats(profile.id),
  ]);

  return (
    <div className="px-5">
      <PageHeader title="Mi perfil" />
      <ProfileForm
        profile={{
          id: profile.id,
          display_name: profile.display_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
          favorite_team: profile.favorite_team,
          email: user.email ?? "",
        }}
        groupCount={groups.length}
        stats={stats}
      />
      {admin && (
        <Link
          href="/admin"
          className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-surface/50 p-3 text-sm font-medium"
        >
          <ShieldCheck className="h-4 w-4 text-pulpo-300" /> Panel de administración
        </Link>
      )}
    </div>
  );
}
