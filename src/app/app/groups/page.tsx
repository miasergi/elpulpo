import Link from "next/link";
import { Plus, LogIn, ChevronRight, Users } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getMyGroups } from "@/lib/queries";
import { getMyStandings } from "@/lib/groups";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { GroupIcon } from "@/components/groups/group-icon";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const { profile } = await requireProfile();
  const groups = await getMyGroups(profile.id);
  const standings = await getMyStandings(groups.map((g) => g.id!), profile.id);
  const withRank = groups.map((g) => ({ group: g, me: standings.get(g.id!) ?? null }));

  return (
    <div className="px-5">
      <PageHeader title="Grupos" subtitle="Tus porras con amigos" />

      <div className="grid grid-cols-2 gap-2 py-2">
        <Link href="/app/groups/new">
          <Button size="full" variant="primary"><Plus className="h-4 w-4" /> Crear grupo</Button>
        </Link>
        <Link href="/app/groups/join">
          <Button size="full" variant="secondary"><LogIn className="h-4 w-4" /> Unirme</Button>
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="mt-12 text-center text-sm text-muted">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-3">Todavía no estás en ningún grupo.<br />Crea uno o únete con un código.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {withRank.map(({ group, me }) => (
            <Link
              key={group.id}
              href={`/app/groups/${group.id}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface/60 p-3.5"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${group.color}22` }}
              >
                <GroupIcon name={group.icon} size={24} color={group.color} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{group.name}</p>
                <p className="text-xs text-muted">
                  {me ? `Vas ${me.rank}º · ${me.total_points} pts` : "Sin puntos aún"}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
