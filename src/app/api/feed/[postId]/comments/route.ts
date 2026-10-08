import { after, NextRequest, NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { MAX_COMMENT_LENGTH, getVisiblePost, requireUser } from "@/lib/feed";
import { notifyFeedComment } from "@/lib/feed-notifications";

export async function GET(_req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const ctx = await requireUser();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { user, token } = ctx;
  const { postId } = await params;

  if (!(await getVisiblePost(postId, user, token))) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  const rows = await nocodeDb.feedComments.findMany({ where: { post_id: postId }, orderBy: { created_at: "asc" } }, token);
  return NextResponse.json(
    rows.map((c) => ({
      id: c.id,
      userName: c.user_name || "Member",
      content: c.content || "",
      createdAt: c.created_at || "",
      parentId: c.parent_id ? String(c.parent_id) : "",
    }))
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const ctx = await requireUser();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { user, token } = ctx;
  const { postId } = await params;

  const post = await getVisiblePost(postId, user, token);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) return NextResponse.json({ error: "Write a comment first" }, { status: 400 });
  if (content.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json({ error: `Comments can be up to ${MAX_COMMENT_LENGTH} characters` }, { status: 400 });
  }
  // A reply points at the comment it answers; threads are one level deep, so a reply to a reply
  // is filed under the original comment but still notifies the person it was addressed to.
  let repliedTo: Record<string, unknown> | null = null;
  let parentId = "";
  if (typeof body.parentId === "string" && body.parentId) {
    repliedTo = await nocodeDb.feedComments.findUnique({ id: body.parentId }, token).catch(() => null);
    if (!repliedTo || String(repliedTo.post_id) !== postId) {
      return NextResponse.json({ error: "The comment you are replying to no longer exists" }, { status: 404 });
    }
    parentId = String(repliedTo.parent_id || repliedTo.id);
  }

  const name = user.name || "Member";
  const comment = await nocodeDb.feedComments.create(
    { post_id: postId, user_id: user.id, user_name: name, content, parent_id: parentId },
    token
  );
  after(() => notifyFeedComment({ post, comment: { user_id: user.id, user_name: name, content }, repliedTo }));
  return NextResponse.json(
    { id: comment.id, userName: name, content, createdAt: comment.created_at || new Date().toISOString(), parentId },
    { status: 201 }
  );
}
