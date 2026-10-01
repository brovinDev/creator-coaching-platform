import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const post = await db.communityPost.findUnique({
    where: { id: postId },
    include: {
      channel: { include: { community: true } },
    },
  });

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAuthor = post.authorId === session.user.id;
  const isCommunityOwner = post.channel.community.creatorId === session.user.id;

  if (!isAuthor && !isCommunityOwner) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await db.communityPost.delete({ where: { id: postId } });
  return NextResponse.json({ message: "Deleted" });
}
