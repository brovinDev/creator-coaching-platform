import { NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { requireUser } from "@/lib/feed";

export async function DELETE(_req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const ctx = await requireUser();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { user, token } = ctx;
  const { postId } = await params;

  const post = await nocodeDb.feedPosts.findUnique({ id: postId }, token).catch(() => null);
  if (user.role !== "CREATOR" || !post || post.creator_id !== user.id) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  await nocodeDb.feedLikes.deleteWhere({ post_id: postId }, token);
  await nocodeDb.feedComments.deleteWhere({ post_id: postId }, token);
  await nocodeDb.feedPosts.delete(postId, token);
  return NextResponse.json({ ok: true });
}
