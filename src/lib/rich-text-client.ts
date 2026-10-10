// Browser-safe helpers for the description editor (no sanitizer here, so it stays out of the bundle).

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Descriptions saved before the editor existed are plain text with line breaks.
 * Turn those into paragraphs so they load into the editor as written.
 */
export function toEditorHtml(value: string | null | undefined): string {
  if (!value) return "";
  if (/<\/?[a-z][\s\S]*>/i.test(value)) return value;
  return value
    .split(/\r?\n/)
    .map((line) => `<p>${escapeHtml(line) || "<br>"}</p>`)
    .join("");
}
