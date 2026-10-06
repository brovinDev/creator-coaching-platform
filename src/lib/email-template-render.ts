import { convert } from "html-to-text";
import { escapeHtml, renderPlaceholders, splitName, type PlaceholderValues } from "@/lib/email-merge-tags";

export interface EmailTemplateContent {
  subject: string;
  /**
   * What learners receive. "text" is the simple email. "html" is the designed email, always sent
   * with a plain-text part: `body_text` when the creator wrote one, otherwise one made from the design.
   */
  format: "text" | "html";
  body_text?: string;
  html?: string;
}

/**
 * Plain-text version of an HTML email. Placeholders survive: braces that editors URL-encode inside
 * links are restored first, so {link.dashboard} still reads as a placeholder.
 */
export function htmlToPlainText(html: string) {
  const restored = html.replace(/%7B([a-z_]+(?:\.[a-z_]+)?)%7D/gi, "{$1}");
  return convert(restored, {
    wordwrap: false,
    selectors: [
      { selector: "head", format: "skip" },
      { selector: "style", format: "skip" },
      { selector: "img", format: "skip" },
      { selector: "a", options: { hideLinkHrefIfSameAsText: true, linkBrackets: ["(", ")"] } },
      { selector: "h1", options: { uppercase: false } },
      { selector: "h2", options: { uppercase: false } },
      { selector: "h3", options: { uppercase: false } },
    ],
  })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Everything a template can use, from the facts known at send (or test) time. */
export function buildPlaceholderValues(input: {
  learnerName: string;
  learnerEmail: string;
  creatorName: string;
  serviceName: string;
  amount: string;
  transactionId: string;
}): PlaceholderValues {
  const { first, last } = splitName(input.learnerName);
  return {
    "contact.firstname": first || "there",
    "contact.lastname": last,
    "contact.fullname": input.learnerName || "there",
    "contact.email": input.learnerEmail,
    "service.name": input.serviceName,
    "order.amount": input.amount,
    "order.transaction_id": input.transactionId,
    "creator.name": input.creatorName,
    "link.dashboard": `${process.env.NEXT_PUBLIC_APP_URL}/student`,
  };
}

/** Plain text shown as a readable email: escaped, line breaks kept. */
function textToHtml(text: string) {
  return `<div style="font-family: sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; max-width: 600px;">${escapeHtml(
    text
  ).replace(/\r?\n/g, "<br>")}</div>`;
}

/** Subject, HTML and (for the simple editor) a plain-text alternative, ready for sendEmail. */
export function renderEmailTemplate(content: EmailTemplateContent, values: PlaceholderValues) {
  // Header values: no HTML escaping (it would show as &amp;) and no line breaks (header injection).
  const subject = renderPlaceholders(content.subject, values, { escape: false }).replace(/[\r\n]+/g, " ").trim();

  if (content.format === "html") {
    const html = renderPlaceholders(content.html || "", values);
    // The creator's own plain text wins; otherwise derive one from the rendered design.
    const text = content.body_text?.trim()
      ? renderPlaceholders(content.body_text, values, { escape: false })
      : htmlToPlainText(html);
    return { subject, html, text };
  }
  const text = renderPlaceholders(content.body_text || "", values, { escape: false });
  return { subject, html: textToHtml(text), text };
}

/** The usable part of a stored template row (service or creator default), or null when it has none. */
export function contentFromRow(
  row: Record<string, unknown> | null | undefined,
  prefix: "" | "default_"
): EmailTemplateContent | null {
  if (!row) return null;
  const subject = String(row[`${prefix}subject`] || "");
  const bodyText = String(row[`${prefix}body_text`] || "");
  const html = String(row[`${prefix}html`] || "");
  // Designs saved before the simple editor existed have no format; they are HTML.
  const stored = row[`${prefix}format`];
  const format = stored === "text" || stored === "html" ? stored : html ? "html" : "text";
  if (!subject) return null;
  if (format === "html" ? !html : !bodyText) return null;
  return { subject, format, body_text: bodyText, html };
}
