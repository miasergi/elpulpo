import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getGroup, getGroupMembers, getStandings, getGroupActivity, getGroupMatchboard } from "@/lib/groups";
import { GroupDetail } from "@/components/groups/group-detail";
import { BackHeader } from "@/components/app/back-header";
import { AdBanner } from "@/components/ads/ad-banner";

export const dynamic = "force-dynamic";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireProfile();

  // Biwenger-style: you can only look at your ACTIVE group; switch in profile.
  if (profile.active_group_id !== id) redirect("/app/profile");

  const group = await getGroup(id);
  if (!group) notFound();

  const members = await getGroupMembers(id);
  const isMember = members.some((m) => m.profile?.id === profile.id);
  if (!isMember) redirect("/app/groups");

  const [standings, activity, matchboard] = await Promise.all([
    getStandings(id),
    getGroupActivity(id, group.competition_id),
    getGroupMatchboard(group, members.flatMap((m) => (m.profile ? [m.profile.id] : []))),
  ]);

  return (
    <div className="px-5">
      <BackHeader title="" />
      <GroupDetail
        group={group}
        standings={standings}
        members={members}
        activity={activity}
        matchboard={matchboard}
        currentUserId={profile.id}
      />
      {!profile.is_pro && <AdBanner className="mt-4" />}
    </div>
  );
}
