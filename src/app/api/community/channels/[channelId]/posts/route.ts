import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ channelId: string }> }) {
  const { channelId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getNocodeToken();

  const posts = await nocodeDb.communityPosts.findMany(
    { where: { channel_id: channelId }, orderBy: { created_at: "desc" } },
    token
  );

  const postsWithAuthor = await Promise.all(
    posts.map(async (post) => {
      const profile = await nocodeDb.userProfiles.findUnique(
        { user_id: String(post.user_id) },
        token
      ).catch(() => null);

      const commentCount = await nocodeDb.communityComments.count(
        { post_id: String(post.id) },
        token
      );

      return {
        ...post,
        authorId: post.user_id,
        author: profile
          ? { id: profile.user_id, name: profile.name || "", avatar: profile.avatar || null, role: profile.role || "STUDENT" }
          : { id: post.user_id, name: "User", avatar: null, role: "STUDENT" },
        _count: { comments: commentCount },
      };
    })
  );

  return NextResponse.json(postsWithAuthor);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ channelId: string }> }) {
  const { channelId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getNocodeToken();
  const { title, content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content is required" }, { status: 400 });

  const post = await nocodeDb.communityPosts.create(
    {
      title: title || null,
      content,
      user_id: session.user.id,
      channel_id: channelId,
    },
    token
  );

  return NextResponse.json({
    ...post,
    authorId: session.user.id,
    author: { id: session.user.id, name: session.user.name, avatar: null, role: session.user.role },
    _count: { comments: 0 },
  });
}
