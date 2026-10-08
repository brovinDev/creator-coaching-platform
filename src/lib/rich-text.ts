import sanitizeHtml from "sanitize-html";

// Only what the RichTextEditor toolbar can produce (header, bold, italic, lists, link).
const ALLOWED_TAGS = ["p", "br", "strong", "em", "h1", "h2", "h3", "ul", "ol", "li", "a"];
const ALLOWED_SCHEMES = ["http", "https", "mailto", "tel"];
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Cleans creator-written HTML before it is stored or shown to visitors.
 * Keeps basic formatting, makes every link open in a new tab, and drops everything else
 * (scripts, event handlers, styles, unknown tags). An empty editor ("<p><br></p>") becomes "".
 */
export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";

  const clean = sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    // data-list is how the editor marks bullet vs numbered items.
    allowedAttributes: { a: ["href", "target", "rel"], li: ["data-list"] },
    allowedSchemes: ALLOWED_SCHEMES,
    transformTags: {
      a: (tagName, attribs) => {
        const href = (attribs.href || "").trim();
        return {
          tagName,
          attribs: {
            // A bare "example.com" would otherwise be treated as a path on our own site.
            href: href && !HAS_SCHEME.test(href) && !href.startsWith("/") ? `https://${href}` : href,
            target: "_blank",
            rel: "noopener noreferrer",
          },
        };
      },
    },
  });

  const hasContent = sanitizeHtml(clean, { allowedTags: [], allowedAttributes: {} }).trim() !== "";
  return hasContent ? clean : "";
}

/** Plain text of a description (for meta tags, previews). */
export function richTextToPlain(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}
