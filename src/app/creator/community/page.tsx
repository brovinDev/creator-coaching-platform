import { auth } from "@/lib/auth";
import { CommunityView } from "@/components/community/community-view";

export default async function CreatorCommunityPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Community</h1>
      <CommunityView userId={session!.user.id} isCreator={true} />
    </div>
  );
}
