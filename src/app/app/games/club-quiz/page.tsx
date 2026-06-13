import { requireProfile } from "@/lib/auth";
import { BackHeader } from "@/components/app/back-header";
import { ClubQuiz } from "@/components/games/club-quiz";

export const dynamic = "force-dynamic";

export default async function ClubQuizPage() {
  await requireProfile();
  return (
    <div className="px-5">
      <BackHeader title="¿De qué club es?" />
      <ClubQuiz />
    </div>
  );
}
