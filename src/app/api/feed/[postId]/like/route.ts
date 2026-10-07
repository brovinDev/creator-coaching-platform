import { NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { getVisiblePost, requireUser } from "@/lib/feed";

/** Toggles the signed-in user's like. */
export async function POST(_req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const ctx = await requireUser();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { user, token } = ctx;
  const { postId } = await params;

  if (!(await getVisiblePost(postId, user, token))) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  const existing = await nocodeDb.feedLikes.findUnique({ post_id: postId, user_id: user.id }, token);
  if (existing) await nocodeDb.feedLikes.delete(String(existing.id), token);
  else await nocodeDb.feedLikes.create({ post_id: postId, user_id: user.id }, token);

  const likeCount = (await nocodeDb.feedLikes.findMany({ where: { post_id: postId } }, token)).length;
  return NextResponse.json({ liked: !existing, likeCount });
}
