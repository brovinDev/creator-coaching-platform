import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { sendEmail, communityReplyEmail } from "@/lib/email";

export async function GET(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getNocodeToken();

  const comments = await nocodeDb.communityComments.findMany(
    { where: { post_id: postId, parent_id: null }, orderBy: { created_at: "asc" } },
    token
  );

  const commentsWithAuthor = await Promise.all(
    comments.map(async (comment) => {
      const profile = await nocodeDb.userProfiles.findUnique(
        { user_id: String(comment.user_id) },
        token
      ).catch(() => null);

      const replies = await nocodeDb.communityComments.findMany(
        { where: { parent_id: String(comment.id) }, orderBy: { created_at: "asc" } },
        token
      );

      const repliesWithAuthor = await Promise.all(
        replies.map(async (reply) => {
          const replyProfile = await nocodeDb.userProfiles.findUnique(
            { user_id: String(reply.user_id) },
            token
          ).catch(() => null);

          return {
            ...reply,
            authorId: reply.user_id,
            author: replyProfile
              ? { id: replyProfile.user_id, name: replyProfile.name || "", avatar: replyProfile.avatar || null, role: replyProfile.role || "STUDENT" }
              : { id: reply.user_id, name: "User", avatar: null, role: "STUDENT" },
          };
        })
      );

      return {
        ...comment,
        authorId: comment.user_id,
        author: profile
          ? { id: profile.user_id, name: profile.name || "", avatar: profile.avatar || null, role: profile.role || "STUDENT" }
          : { id: comment.user_id, name: "User", avatar: null, role: "STUDENT" },
        replies: repliesWithAuthor,
      };
    })
  );

  return NextResponse.json(commentsWithAuthor);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getNocodeToken();
  const { content, parentId } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content is required" }, { status: 400 });

  const comment = await nocodeDb.communityComments.create(
    {
      content,
      user_id: session.user.id,
      post_id: postId,
      parent_id: parentId || null,
    },
    token
  );

  const post = await nocodeDb.communityPosts.findUnique({ id: postId }, token);

  if (post && String(post.user_id) !== session.user.id) {
    const authorProfile = await nocodeDb.userProfiles.findUnique(
      { user_id: String(post.user_id) },
      token
    ).catch(() => null);

    if (authorProfile?.email) {
      const emailContent = communityReplyEmail(
        (authorProfile.name as string) || "User",
        (post.title as string) || "your post",
        `${process.env.NEXT_PUBLIC_APP_URL}/student/community`
      );
      sendEmail({ to: authorProfile.email as string, ...emailContent });
    }
  }

  return NextResponse.json({
    ...comment,
    authorId: session.user.id,
    author: { id: session.user.id, name: session.user.name, avatar: null, role: session.user.role },
  });
}
