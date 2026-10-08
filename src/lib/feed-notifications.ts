import { nocodeDb } from "@/lib/nocode/db";
import { splitName } from "@/lib/email-merge-tags";
import { sendNotificationEmail } from "@/lib/notification-emails";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

type Row = Record<string, unknown>;

const excerpt = (text: unknown, max = 120) => {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
};

/**
 * Emails whoever a new feed comment is for: the author of the comment being replied to, or, for
 * a top-level comment, the author of the post. Nobody is emailed about their own comment. The
 * switches and wording are those of the creator who owns the feed. Never throws.
 */
export async function notifyFeedComment(input: {
  post: Row;
  /** The comment just written. */
  comment: { user_id: string; user_name: string; content: string };
  /** The comment it replies to, if it is a reply. */
  repliedTo?: Row | null;
}) {
  try {
    const { post, comment, repliedTo } = input;
    const recipientId = String(repliedTo ? repliedTo.user_id : post.creator_id);
    if (!recipientId || recipientId === comment.user_id) return;

    const profile = await nocodeDb.userProfiles.findUnique({ user_id: recipientId }, SYSTEM_TOKEN).catch(() => null);
    const email = String(profile?.email || "").trim();
    if (!email) return;

    const name = [profile?.first_name, profile?.last_name]
      .filter((p) => typeof p === "string" && p && p !== ".")
      .join(" ")
      .trim();
    const { first } = splitName(name);
    const app = process.env.NEXT_PUBLIC_APP_URL;
    const side = profile?.role === "CREATOR" ? "creator" : "student";

    const common = {
      "contact.firstname": first || "there",
      "contact.fullname": name || "there",
      "contact.email": email,
      "link.feed": `${app}/${side}/feed`,
      "link.dashboard": `${app}/${side === "creator" ? "creator" : "student"}`,
    };

    if (repliedTo) {
      await sendNotificationEmail({
        creatorId: String(post.creator_id),
        kind: "comment_reply",
        to: email,
        values: {
          ...common,
          "replier.name": comment.user_name || "Someone",
          "reply.text": comment.content,
          "comment.excerpt": excerpt(repliedTo.content),
        },
      });
    } else {
      await sendNotificationEmail({
        creatorId: String(post.creator_id),
        kind: "post_comment",
        to: email,
        values: {
          ...common,
          "commenter.name": comment.user_name || "Someone",
          "comment.text": comment.content,
          "post.excerpt": excerpt(post.content) || "(a photo)",
        },
      });
    }
  } catch (error) {
    console.error("[feed-notifications] failed:", error instanceof Error ? error.message : error);
  }
}
