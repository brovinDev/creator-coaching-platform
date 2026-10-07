import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getNocodeToken();

  const post = await nocodeDb.communityPosts.findUnique({ id: postId }, token);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAuthor = String(post.user_id) === session.user.id;

  if (!isAuthor) {
    const channel = await nocodeDb.communityChannels.findUnique(
      { id: String(post.channel_id) },
      token
    );
    if (channel) {
      const community = await nocodeDb.communities.findUnique(
        { id: String(channel.community_id) },
        token
      );
      const isCommunityOwner = community && String(community.creator_id) === session.user.id;
      if (!isCommunityOwner) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
  }

  await nocodeDb.communityComments.deleteWhere({ post_id: postId }, token);
  await nocodeDb.communityPosts.delete(postId, token);
  return NextResponse.json({ message: "Deleted" });
}
