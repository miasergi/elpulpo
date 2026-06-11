import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getGroup, getGroupMembers, getStandings, getGroupPointsTimeline, getGroupMatchboard, getGroupBonusBoard } from "@/lib/groups";
import { getMatches } from "@/lib/queries";
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

  const timelineMembers = members.flatMap((m) =>
    m.profile ? [{ id: m.profile.id, display_name: m.profile.display_name, avatar_url: m.profile.avatar_url }] : []
  );
  const [standings, timeline, matchboard, bonusBoard, matches] = await Promise.all([
    getStandings(id),
    getGroupPointsTimeline(group, timelineMembers),
    getGroupMatchboard(group, members.flatMap((m) => (m.profile ? [m.profile.id] : []))),
    getGroupBonusBoard(id, group.competition_id),
    getMatches(group.competition_id),
  ]);
  const firstKickoff = matches[0]?.kickoff_at;
  const tournamentStarted = !!firstKickoff && new Date(firstKickoff) <= new Date();

  return (
    <div className="px-5">
      <BackHeader title="" />
      <GroupDetail
        group={group}
        standings={standings}
        members={members}
        timeline={timeline}
        matchboard={matchboard}
        bonusBoard={bonusBoard}
        tournamentStarted={tournamentStarted}
        currentUserId={profile.id}
      />
      {!profile.is_pro && <AdBanner className="mt-4" />}
    </div>
  );
}
