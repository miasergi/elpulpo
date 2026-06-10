"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trophy, MessageCircle, Info, LogOut, Trash2, Newspaper, CalendarClock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StandingsList } from "./standings-list";
import { GroupChat } from "./group-chat";
import { InviteCard } from "./invite-card";
import { ActivityFeed } from "./activity-feed";
import { GroupIcon } from "./group-icon";
import { GroupMatches } from "./group-matches";
import { ScoringEditor } from "./scoring-editor";
import type { StandingRow, ActivityItem, GroupUpcomingMatch, GroupRecentMatch } from "@/lib/groups";

type Tab = "ranking" | "matches" | "activity" | "chat" | "info";

interface Member {
  role: string;
  profile: { id: string; username: string; display_name: string; avatar_url: string | null } | null;
}

export function GroupDetail({
  group,
  standings,
  members,
  activity,
  matchboard,
  currentUserId,
}: {
  group: {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    color: string;
    invite_code: string;
    owner_id: string;
    pts_exact: number;
    pts_goal_diff: number;
    pts_result: number;
  };
  standings: StandingRow[];
  members: Member[];
  activity: ActivityItem[];
  matchboard: { upcoming: GroupUpcomingMatch[]; recent: GroupRecentMatch[] };
  currentUserId: string;
}) {
  const [tab, setTab] = useState<Tab>("ranking");
  const router = useRouter();
  const isOwner = group.owner_id === currentUserId;

  async function leave() {
    if (!confirm("¿Seguro que quieres salir del grupo?")) return;
    const supabase = createClient();
    await supabase.from("group_members").delete().eq("group_id", group.id).eq("user_id", currentUserId);
    toast.success("Has salido del grupo");
    router.push("/app/groups");
    router.refresh();
  }

  async function remove() {
    if (!confirm("Esto eliminará el grupo para todos. ¿Continuar?")) return;
    const supabase = createClient();
    await supabase.from("groups").delete().eq("id", group.id);
    toast.success("Grupo eliminado");
    router.push("/app/groups");
    router.refresh();
  }

  const tabs: { key: Tab; label: string; icon: typeof Trophy }[] = [
    { key: "ranking", label: "Ranking", icon: Trophy },
    { key: "matches", label: "Partidos", icon: CalendarClock },
    { key: "activity", label: "Actividad", icon: Newspaper },
    { key: "chat", label: "Chat", icon: MessageCircle },
    { key: "info", label: "Info", icon: Info },
  ];

  const me = standings.find((s) => s.user_id === currentUserId);

  return (
    <div>
      {/* Group header */}
      <div className="flex items-center gap-3 pb-4">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${group.color}22` }}
        >
          <GroupIcon name={group.icon} size={28} color={group.color} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{group.name}</h1>
          <p className="text-sm text-muted">
            {members.length} jugadores · <span className="text-pitch-400">estás participando</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-20 -mx-5 flex border-b border-border bg-background/85 px-5 backdrop-blur-lg">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 border-b-2 py-2.5 text-[11px] font-medium transition-colors",
              tab === t.key
                ? "border-primary text-pulpo-200"
                : "border-transparent text-muted-foreground"
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="pt-4">
        {tab === "ranking" && (
          <>
            {me && me.played === 0 && (
              <Link
                href="/app/matches"
                className="mb-3 flex items-start gap-2.5 rounded-lg border border-pulpo-500/40 bg-pulpo-500/10 p-3 text-sm"
              >
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-pulpo-300" />
                <span className="text-muted">
                  Estás dentro: tus predicciones cuentan aquí automáticamente.{" "}
                  <span className="font-medium text-pulpo-200">Predice los próximos partidos →</span>
                </span>
              </Link>
            )}
            <StandingsList rows={standings} currentUserId={currentUserId} />
          </>
        )}

        {tab === "matches" && (
          <GroupMatches
            upcoming={matchboard.upcoming}
            recent={matchboard.recent}
            profiles={members.flatMap((m) => (m.profile ? [m.profile] : []))}
            currentUserId={currentUserId}
          />
        )}

        {tab === "activity" && <ActivityFeed items={activity} />}

        {tab === "chat" && <GroupChat groupId={group.id} currentUserId={currentUserId} />}

        {tab === "info" && (
          <div className="space-y-5 pb-8">
            <InviteCard code={group.invite_code} groupName={group.name} />

            {group.description && (
              <div className="rounded-lg border border-border bg-surface/50 p-4 text-sm text-muted">
                {group.description}
              </div>
            )}

            <ScoringEditor
              groupId={group.id}
              canEdit={isOwner}
              initial={{
                pts_exact: group.pts_exact,
                pts_goal_diff: group.pts_goal_diff,
                pts_result: group.pts_result,
              }}
            />

            <div>
              <p className="mb-2 text-sm font-medium text-muted">Jugadores</p>
              <div className="space-y-1.5">
                {members.map((m) => (
                  <div
                    key={m.profile?.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface/50 p-2.5"
                  >
                    <Avatar src={m.profile?.avatar_url} name={m.profile?.display_name} size={34} />
                    <span className="flex-1 truncate text-sm font-medium">
                      {m.profile?.display_name}
                    </span>
                    {m.role !== "member" && (
                      <Badge variant="primary">{m.role === "owner" ? "Admin" : m.role}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {isOwner ? (
              <Button variant="danger" size="full" onClick={remove}>
                <Trash2 className="h-4 w-4" /> Eliminar grupo
              </Button>
            ) : (
              <Button variant="outline" size="full" onClick={leave}>
                <LogOut className="h-4 w-4" /> Salir del grupo
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
