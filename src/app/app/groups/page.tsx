import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, LogIn, Users } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getMyGroups } from "@/lib/queries";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

/** Biwenger-style: the Groups tab IS your active group. Switching happens in
 *  the profile. Without an active group this becomes the onboarding screen. */
export default async function GroupsPage() {
  const { profile } = await requireProfile();

  if (profile.active_group_id) redirect(`/app/groups/${profile.active_group_id}`);

  const groups = await getMyGroups(profile.id);

  return (
    <div className="px-5">
      <PageHeader title="Grupos" subtitle="Tu porra con amigos" />

      <div className="grid grid-cols-2 gap-2 py-2">
        <Link href="/app/groups/new">
          <Button size="full" variant="primary"><Plus className="h-4 w-4" /> Crear grupo</Button>
        </Link>
        <Link href="/app/groups/join">
          <Button size="full" variant="secondary"><LogIn className="h-4 w-4" /> Unirme</Button>
        </Link>
      </div>

      <div className="mt-12 text-center text-sm text-muted">
        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
        {groups.length === 0 ? (
          <p className="mt-3">
            Todavía no estás en ningún grupo.
            <br />
            Cada grupo tiene sus propias predicciones, como una liga fantasy.
          </p>
        ) : (
          <p className="mt-3">
            No tienes grupo activo.
            <br />
            <Link href="/app/profile" className="font-medium text-pulpo-300">
              Elige uno en tu perfil →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
