import { auth } from "@/lib/auth";
import { FeedView } from "@/components/feed/feed-view";

export default async function StudentFeedPage() {
  const session = await auth();
  return <FeedView isCreator={false} userName={session!.user.name} userImage={session!.user.image} />;
}
