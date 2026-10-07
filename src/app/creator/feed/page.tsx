import { auth } from "@/lib/auth";
import { FeedView } from "@/components/feed/feed-view";

export default async function CreatorFeedPage() {
  const session = await auth();
  return <FeedView isCreator userName={session!.user.name} userImage={session!.user.image} />;
}
