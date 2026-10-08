import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";

export const MAX_POST_LENGTH = 5000;
export const MAX_COMMENT_LENGTH = 1000;

type Row = Record<string, unknown>;

export const idList = (value: unknown) =>
  String(value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

export function isPublished(post: Row, now = Date.now()) {
  const at = String(post.publish_at || "");
  if (!at) return true;
  const time = Date.parse(at);
  return Number.isNaN(time) || time <= now;
}

/** A learner sees a post unless one of their services is excluded; a non-empty include list limits it to those services. */
export function canLearnerSee(post: Row, serviceIds: Set<string>) {
  if (idList(post.exclude_service_ids).some((id) => serviceIds.has(id))) return false;
  const include = idList(post.include_service_ids);
  return include.length === 0 || include.some((id) => serviceIds.has(id));
}

/** The services a learner has bought, and the creators who own them. */
export async function learnerAccess(userId: string, token: string) {
  const enrollments = await nocodeDb.enrollments.findMany({ where: { user_id: userId } }, token);
  const serviceIds = new Set<string>();
  const creatorIds = new Set<string>();
  for (const e of enrollments) {
    if (!e.service_id) continue;
    const id = String(e.service_id);
    if (serviceIds.has(id)) continue;
    serviceIds.add(id);
    const service = await nocodeDb.services.findUnique({ id }, token).catch(() => null);
    if (service?.creator_id) creatorIds.add(String(service.creator_id));
  }
  return { serviceIds, creatorIds };
}

export async function requireUser() {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized", status: 401 } as const;
  return { user: session.user, token: await getNocodeToken() } as const;
}

/** The post, only if this user is allowed to see it (creator: own posts, learner: audience rules). */
export async function getVisiblePost(postId: string, user: { id: string; role: string }, token: string) {
  const post = await nocodeDb.feedPosts.findUnique({ id: postId }, token).catch(() => null);
  if (!post) return null;
  if (user.role === "CREATOR") return post.creator_id === user.id ? post : null;
  if (!isPublished(post)) return null;
  const access = await learnerAccess(user.id, token);
  if (!access.creatorIds.has(String(post.creator_id))) return null;
  return canLearnerSee(post, access.serviceIds) ? post : null;
}
