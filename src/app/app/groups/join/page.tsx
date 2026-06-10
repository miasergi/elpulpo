import { requireProfile } from "@/lib/auth";
import { JoinGroupForm } from "@/components/groups/join-group-form";
import { BackHeader } from "@/components/app/back-header";

export default async function JoinGroupPage() {
  await requireProfile();
  return (
    <div className="px-5">
      <BackHeader title="Unirme a un grupo" />
      <JoinGroupForm />
    </div>
  );
}
