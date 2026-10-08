import { NextRequest, NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { MAX_POST_LENGTH, canLearnerSee, idList, isPublished, learnerAccess, requireUser } from "@/lib/feed";
import { getBranding, isSafeUrl } from "@/lib/branding";

type Row = Record<string, unknown>;

export async function GET() {
  const ctx = await requireUser();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { user, token } = ctx;
  const isCreator = user.role === "CREATOR";

  let posts: Row[] = [];
  if (isCreator) {
    posts = await nocodeDb.feedPosts.findMany({ where: { creator_id: user.id } }, token);
  } else {
    const access = await learnerAccess(user.id, token);
    const lists = await Promise.all(
      [...access.creatorIds].map((id) => nocodeDb.feedPosts.findMany({ where: { creator_id: id } }, token))
    );
    posts = lists.flat().filter((p) => isPublished(p) && canLearnerSee(p, access.serviceIds));
  }

  // Newest first, by the time it went live.
  const liveAt = (p: Row) => Date.parse(String(p.publish_at || p.created_at || "")) || 0;
  posts.sort((a, b) => liveAt(b) - liveAt(a));
  posts = posts.slice(0, 30);

  const serviceNames = new Map<string, string>();
  if (isCreator) {
    const services = await nocodeDb.services.findMany({ where: { creator_id: user.id } }, token);
    for (const s of services) serviceNames.set(String(s.id), String(s.title));
  }
  const brandings = new Map<string, Awaited<ReturnType<typeof getBranding>>>();
  for (const id of new Set(posts.map((p) => String(p.creator_id)))) brandings.set(id, await getBranding(id));

  const out = await Promise.all(
    posts.map(async (p) => {
      const postId = String(p.id);
      // findMany().length, not count(): count() reports 0 for these modules.
      const [likes, comments] = await Promise.all([
        nocodeDb.feedLikes.findMany({ where: { post_id: postId } }, token),
        nocodeDb.feedComments.findMany({ where: { post_id: postId } }, token),
      ]);
      const branding = brandings.get(String(p.creator_id));
      return {
        id: postId,
        content: p.content || "",
        imageUrl: p.image_url || "",
        scheduled: !isPublished(p),
        createdAt: p.publish_at || p.created_at || "",
        author: {
          name: branding?.brandName || (isCreator ? user.name : "Creator"),
          logo: branding?.logoUrl || "",
        },
        likeCount: likes.length,
        liked: likes.some((l) => l.user_id === user.id),
        commentCount: comments.length,
        ...(isCreator
          ? {
              includeServices: idList(p.include_service_ids).map((id) => serviceNames.get(id) || "Deleted service"),
              excludeServices: idList(p.exclude_service_ids).map((id) => serviceNames.get(id) || "Deleted service"),
            }
          : {}),
      };
    })
  );

  return NextResponse.json(out);
}

export async function POST(req: NextRequest) {
  const ctx = await requireUser();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { user, token } = ctx;
  if (user.role !== "CREATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  if (!content && !imageUrl) return NextResponse.json({ error: "Write something or add an image" }, { status: 400 });
  if (content.length > MAX_POST_LENGTH) {
    return NextResponse.json({ error: `Posts can be up to ${MAX_POST_LENGTH} characters` }, { status: 400 });
  }
  if (imageUrl && !isSafeUrl(imageUrl)) return NextResponse.json({ error: "Invalid image" }, { status: 400 });

  // Only the creator's own services can be targeted.
  const services = await nocodeDb.services.findMany({ where: { creator_id: user.id } }, token);
  const own = new Set(services.map((s) => String(s.id)));
  const pick = (value: unknown) => (Array.isArray(value) ? value.map(String).filter((id) => own.has(id)) : []);
  const include = pick(body.includeServiceIds);
  const exclude = pick(body.excludeServiceIds).filter((id) => !include.includes(id));

  let publishAt = "";
  if (body.publishAt) {
    const time = Date.parse(String(body.publishAt));
    if (Number.isNaN(time)) return NextResponse.json({ error: "Invalid schedule time" }, { status: 400 });
    if (time > Date.now() + 1000) publishAt = new Date(time).toISOString();
  }

  const post = await nocodeDb.feedPosts.create(
    {
      creator_id: user.id,
      content,
      image_url: imageUrl,
      include_service_ids: include.join(","),
      exclude_service_ids: exclude.join(","),
      publish_at: publishAt,
    },
    token
  );
  return NextResponse.json({ id: post.id }, { status: 201 });
}
