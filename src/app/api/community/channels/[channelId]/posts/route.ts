import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ channelId: string }> }) {
  const { channelId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const posts = await db.communityPost.findMany({
    where: { channelId },
    include: {
      author: { select: { id: true, name: true, avatar: true, role: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(posts);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ channelId: string }> }) {
  const { channelId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content is required" }, { status: 400 });

  const post = await db.communityPost.create({
    data: {
      title: title || null,
      content,
      authorId: session.user.id,
      channelId,
    },
    include: {
      author: { select: { id: true, name: true, avatar: true, role: true } },
      _count: { select: { comments: true } },
    },
  });

  return NextResponse.json(post);
}
