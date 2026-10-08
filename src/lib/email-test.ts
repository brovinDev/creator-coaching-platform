import { nocodeDb } from "@/lib/nocode/db";
import { sendEmail, formatAmount } from "@/lib/email";
import { splitName } from "@/lib/email-merge-tags";
import type { EmailKind } from "@/lib/email-notifications";
import { REMINDERS } from "@/lib/workshop-reminder-schedule";
import {
  buildPlaceholderValues,
  buildReminderPlaceholderValues,
  renderEmailTemplate,
  type EmailTemplateContent,
} from "@/lib/email-template-render";

/**
 * Sends a template as it currently stands in an editor to the creator only, with sample values.
 * Throws if the email cannot be sent.
 */
export async function sendTemplateTest(opts: {
  user: { id: string; name: string; email: string };
  token: string;
  content: EmailTemplateContent;
  service?: Record<string, unknown>;
}) {
  const { user, token, content, service } = opts;
  const settings = await nocodeDb.creatorEmailSettings.findUnique({ creator_id: user.id }, token).catch(() => null);

  const price = Number(service?.price) || 0;
  const values = buildPlaceholderValues({
    learnerName: user.name || "",
    learnerEmail: user.email,
    creatorName: user.name || "",
    serviceName: service ? String(service.title || "") : "Your service",
    amount: price > 0 ? formatAmount(price, String(service?.currency || "INR")) : "Free",
    transactionId: "pay_TEST000000",
  });
  const rendered = renderEmailTemplate(content, values);

  await sendEmail({
    to: user.email,
    ...rendered,
    subject: `[Test] ${rendered.subject}`,
    fromName: String(settings?.from_name || "") || undefined,
    replyTo: String(settings?.reply_to || "") || undefined,
  });
}

/** Sample values for each kind of notification, so a test email reads like the real thing. */
function sampleValues(kind: EmailKind, user: { name: string; email: string }): Record<string, string> {
  const { first } = splitName(user.name || "");
  const app = process.env.NEXT_PUBLIC_APP_URL;
  if (kind === "post_comment" || kind === "comment_reply") {
    return {
      "contact.firstname": first || "there",
      "contact.fullname": user.name || "there",
      "contact.email": user.email,
      "commenter.name": "Asha Rao",
      "comment.text": "This was really helpful, thank you!",
      "post.excerpt": "Welcome to the new batch. Here is what we cover this week...",
      "replier.name": "Asha Rao",
      "reply.text": "Thanks, I will try that today.",
      "comment.excerpt": "How do I get started with the first lesson?",
      "link.feed": `${app}/creator/feed`,
      "link.dashboard": `${app}/creator`,
    };
  }
  return buildReminderPlaceholderValues({
    learnerName: user.name || "",
    learnerEmail: user.email,
    workshopTitle: "Your workshop",
    hostName: user.name || "Your name",
    date: "Thu, 8 Oct",
    time: "7:00 pm IST",
    startsIn: REMINDERS.find((r) => r.key === kind)?.phrase ?? "",
    link: `${app}/student/workshops`,
  });
}

/** Sends a notification or reminder as it currently stands in an editor to the creator only, with sample values. */
export async function sendKindTest(opts: {
  user: { id: string; name: string; email: string };
  token: string;
  content: EmailTemplateContent;
  kind: EmailKind;
}) {
  const { user, token, content, kind } = opts;
  const settings = await nocodeDb.creatorEmailSettings.findUnique({ creator_id: user.id }, token).catch(() => null);
  const rendered = renderEmailTemplate(content, sampleValues(kind, user));
  await sendEmail({
    to: user.email,
    ...rendered,
    subject: `[Test] ${rendered.subject}`,
    fromName: String(settings?.from_name || "") || undefined,
    replyTo: String(settings?.reply_to || "") || undefined,
  });
}

/**
 * Validates the editor's request body into template content, or returns an error message.
 * A designed email may arrive without its HTML when the designer was not opened; the saved
 * design (`saved`) is used then.
 */
export function contentFromTestBody(
  body: Record<string, unknown>,
  saved?: { row: Record<string, unknown> | null; prefix: "" | "default_" }
): EmailTemplateContent | string {
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const format = body.format === "html" ? "html" : "text";
  const bodyText = typeof body.body_text === "string" ? body.body_text : "";
  let html = typeof body.html === "string" ? body.html : "";
  if (format === "html" && !html && saved) html = String(saved.row?.[`${saved.prefix}html`] || "");
  if (!subject || (format === "html" ? !html : !bodyText.trim())) {
    return format === "html" ? "Add a subject and design the email first" : "Add a subject and write the email first";
  }
  return { subject, format, body_text: bodyText, html };
}
