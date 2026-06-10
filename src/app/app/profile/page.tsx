import Link from "next/link";
import { ShieldCheck, Gem } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getMyGroups } from "@/lib/queries";
import { getAdminUser } from "@/lib/admin";
import { getPlayerStats } from "@/lib/stats";
import { PageHeader } from "@/components/app/page-header";
import { ProfileForm } from "@/components/profile/profile-form";
import { GroupSwitcher } from "@/components/groups/group-switcher";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { profile, user } = await requireProfile();
  const [groups, admin, stats] = await Promise.all([
    getMyGroups(profile.id),
    getAdminUser(),
    getPlayerStats(profile.id, profile.active_group_id),
  ]);

  return (
    <div className="px-5">
      <PageHeader title="Mi perfil" />

      {profile.is_pro && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-pitch-500/40 bg-pitch-500/10 p-3 text-sm">
          <Gem className="h-4 w-4 text-pitch-400" />
          <span className="font-semibold text-pitch-400">Cuenta Pro</span>
          <span className="text-xs text-muted">· sin anuncios</span>
        </div>
      )}

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

      {groups.length > 0 && (
        <GroupSwitcher
          groups={groups.map((g) => ({
            id: g.id!,
            name: g.name!,
            icon: g.icon!,
            color: g.color!,
          }))}
          activeGroupId={profile.active_group_id}
          userId={profile.id}
        />
      )}

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
