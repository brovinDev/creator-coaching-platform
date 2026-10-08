// Tailwind resets list/heading/link styles, so give editor output its look back.
// The editor marks bullet vs numbered items with data-list on each <li>.
const CONTENT_STYLES =
  "[&_a]:text-indigo-600 [&_a]:underline [&_a:hover]:text-indigo-700 " +
  "[&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-semibold " +
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 " +
  "[&_li[data-list=bullet]]:list-disc [&_li[data-list=ordered]]:list-decimal";

interface RichTextContentProps {
  html: string;
  className?: string;
}

/**
 * Shows creator-written description HTML. Pass HTML already cleaned by sanitizeRichText on the
 * server (kept out of here so the sanitizer isn't shipped to the browser).
 */
export function RichTextContent({ html, className = "" }: RichTextContentProps) {
  return (
    <div
      className={`${CONTENT_STYLES} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
