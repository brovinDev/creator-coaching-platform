import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail, communityReplyEmail } from "@/lib/email";

export async function GET(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const comments = await db.communityComment.findMany({
    where: { postId, parentId: null },
    include: {
      author: { select: { id: true, name: true, avatar: true, role: true } },
      replies: {
        include: {
          author: { select: { id: true, name: true, avatar: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, parentId } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content is required" }, { status: 400 });

  const comment = await db.communityComment.create({
    data: {
      content,
      authorId: session.user.id,
      postId,
      parentId: parentId || null,
    },
    include: {
      author: { select: { id: true, name: true, avatar: true, role: true } },
    },
  });

  const post = await db.communityPost.findUnique({
    where: { id: postId },
    include: { author: true },
  });

  if (post && post.authorId !== session.user.id) {
    const emailContent = communityReplyEmail(
      post.author.name,
      post.title || "your post",
      `${process.env.NEXT_PUBLIC_APP_URL}/student/community`
    );
    sendEmail({ to: post.author.email, ...emailContent });
  }

  return NextResponse.json(comment);
}
