/**
 * Placeholders shared by the editors (client) and the sender (server).
 * Keep this file free of server-only imports.
 *
 * The documented form is {contact.firstname}. The older {{name}} style (from the first
 * Beefree version) still renders so saved designs keep working.
 */
export const EMAIL_PLACEHOLDERS = [
  { key: "contact.firstname", label: "Learner first name" },
  { key: "contact.lastname", label: "Learner last name" },
  { key: "contact.fullname", label: "Learner full name" },
  { key: "contact.email", label: "Learner email" },
  { key: "service.name", label: "Service name" },
  { key: "order.amount", label: "Amount paid" },
  { key: "order.transaction_id", label: "Transaction ID" },
  { key: "creator.name", label: "Creator name" },
  { key: "link.dashboard", label: "Dashboard link" },
] as const;

/** What a workshop reminder can use. Shown in the reminder editor instead of the purchase placeholders. */
export const REMINDER_PLACEHOLDERS = [
  { key: "contact.firstname", label: "Learner first name" },
  { key: "contact.lastname", label: "Learner last name" },
  { key: "contact.fullname", label: "Learner full name" },
  { key: "contact.email", label: "Learner email" },
  { key: "workshop.title", label: "Workshop title" },
  { key: "workshop.host", label: "Host name" },
  { key: "workshop.date", label: "Session date" },
  { key: "workshop.time", label: "Session start time" },
  { key: "workshop.starts_in", label: "How soon it starts (in 1 hour)" },
  { key: "workshop.link", label: "Join link (or your workshops page before the join window)" },
  { key: "link.dashboard", label: "Dashboard link" },
] as const;

export type PlaceholderKey = (typeof EMAIL_PLACEHOLDERS)[number]["key"];
export type PlaceholderValues = Record<PlaceholderKey, string>;

export const placeholderToken = (key: string) => `{${key}}`;

/** Old {{key}} names mapped to their current placeholder. */
const LEGACY_ALIASES: Record<string, PlaceholderKey> = {
  name: "contact.fullname",
  email: "contact.email",
  service_name: "service.name",
  amount: "order.amount",
  transaction_id: "order.transaction_id",
  creator_name: "creator.name",
  dashboard_url: "link.dashboard",
};

/** Shape Beefree expects for its `mergeTags` config. */
export const toBeefreeMergeTags = (list: readonly { key: string; label: string }[]) =>
  list.map((p) => ({ name: p.label, value: placeholderToken(p.key) }));

export const BEEFREE_MERGE_TAGS = toBeefreeMergeTags(EMAIL_PLACEHOLDERS);
export const REMINDER_MERGE_TAGS = toBeefreeMergeTags(REMINDER_PLACEHOLDERS);

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** First/last name from a full name; the first word is the first name. */
export function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] || "", last: parts.slice(1).join(" ") };
}

/**
 * Replaces placeholders with values. Matches {contact.firstname}, {{contact.firstname}} and the
 * legacy {{name}}, plus the URL-encoded braces (%7B…%7D) editors produce inside links.
 * Unknown placeholders are left untouched. `escape` HTML-escapes the values (for HTML bodies);
 * leave it off for plain text and subjects.
 */
export function renderPlaceholders(
  template: string,
  values: Partial<Record<string, string>>,
  { escape = true }: { escape?: boolean } = {}
) {
  return template.replace(
    /(?:\{\{|%7B%7B|\{|%7B)\s*([a-z_]+(?:\.[a-z_]+)?)\s*(?:\}\}|%7D%7D|\}|%7D)/gi,
    (match, rawKey: string) => {
      const key = rawKey.toLowerCase();
      const value = values[key] ?? values[LEGACY_ALIASES[key]];
      if (value === undefined) return match;
      return escape ? escapeHtml(value) : value;
    }
  );
}
