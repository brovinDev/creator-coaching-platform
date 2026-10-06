/**
 * Merge tags shared by the Beefree editor (client) and the sender (server).
 * Keep this file free of server-only imports.
 */
export const EMAIL_MERGE_TAGS = [
  { name: "Learner name", key: "name" },
  { name: "Learner email", key: "email" },
  { name: "Creator name", key: "creator_name" },
  { name: "Service name", key: "service_name" },
  { name: "Amount paid", key: "amount" },
  { name: "Transaction ID", key: "transaction_id" },
  { name: "Dashboard link", key: "dashboard_url" },
] as const;

export type EmailMergeKey = (typeof EMAIL_MERGE_TAGS)[number]["key"];

/** Shape Beefree expects for its `mergeTags` config. */
export const BEEFREE_MERGE_TAGS = EMAIL_MERGE_TAGS.map((t) => ({
  name: t.name,
  value: `{{${t.key}}}`,
}));

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Replaces {{tags}} with HTML-escaped values. Also matches the URL-encoded form
 * (%7B%7B…%7D%7D) because editors may encode braces when a tag is used inside a link.
 * Unknown tags are left untouched.
 */
export function renderMergeTags(
  template: string,
  values: Partial<Record<EmailMergeKey, string>>
) {
  return template.replace(
    /(?:\{\{|%7B%7B)\s*([a-z_]+)\s*(?:\}\}|%7D%7D)/gi,
    (match, key: string) => {
      const value = values[key.toLowerCase() as EmailMergeKey];
      return value === undefined ? match : escapeHtml(value);
    }
  );
}
