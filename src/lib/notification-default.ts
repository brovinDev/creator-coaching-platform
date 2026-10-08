import { buildDefaultEmail, type DefaultEmail, type EmailBrand } from "@/lib/default-email";
import type { EmailKind, NotificationKey } from "@/lib/email-notifications";
import { defaultReminderEmail } from "@/lib/workshop-reminder-default";

/** The notification emails learners and creators get until a creator writes their own. */
export function defaultNotificationEmail(key: NotificationKey, brand: EmailBrand = {}): DefaultEmail {
  if (key === "after15m") {
    return buildDefaultEmail({
      subject: "Thanks for joining {workshop.title}",
      heading: "Thanks for joining!",
      blocks: [
        { html: "Hey {contact.firstname}," },
        { html: "Hope you enjoyed your call with <strong>{workshop.host}</strong>. For more of {workshop.host}'s content, log on to {link.dashboard}." },
        { html: "Cheers!" },
      ],
      button: { label: "Go to my dashboard", href: "{link.dashboard}" },
      text: [
        "Hey {contact.firstname},",
        "Hope you enjoyed your call with {workshop.host}. For more of {workshop.host}'s content, log on to {link.dashboard}.",
        "Cheers!",
      ],
      brand,
    });
  }
  if (key === "post_comment") {
    return buildDefaultEmail({
      subject: "{commenter.name} commented on your post",
      heading: "New comment on your post",
      blocks: [
        { html: "Hi {contact.firstname}, <strong>{commenter.name}</strong> commented on your post:" },
        { html: "{comment.text}", style: "box" },
        { html: "Your post: {post.excerpt}", style: "note" },
      ],
      button: { label: "View comment", href: "{link.feed}" },
      text: [
        "Hi {contact.firstname}, {commenter.name} commented on your post:",
        "{comment.text}",
        "Your post: {post.excerpt}",
        "View comment: {link.feed}",
      ],
      brand,
    });
  }
  return buildDefaultEmail({
    subject: "{replier.name} replied to your comment",
    heading: "New reply to your comment",
    blocks: [
      { html: "Hi {contact.firstname}, <strong>{replier.name}</strong> replied to your comment:" },
      { html: "{reply.text}", style: "box" },
      { html: "Your comment: {comment.excerpt}", style: "note" },
    ],
    button: { label: "View reply", href: "{link.feed}" },
    text: [
      "Hi {contact.firstname}, {replier.name} replied to your comment:",
      "{reply.text}",
      "Your comment: {comment.excerpt}",
      "View reply: {link.feed}",
    ],
    brand,
  });
}

/** The default email for any editable kind (workshop reminder or notification). */
export function defaultEmailFor(key: EmailKind, brand: EmailBrand = {}): DefaultEmail {
  return key === "24h" || key === "1h" || key === "5m" ? defaultReminderEmail(key, brand) : defaultNotificationEmail(key, brand);
}
