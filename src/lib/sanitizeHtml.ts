import DOMPurify from 'dompurify';

// The rich-text editor only ever produces a small set of semantic formatting
// tags (bold / italic / underline / lists / paragraphs). We sanitize on render
// (and on save) to a strict allow-list and strip ALL attributes, so a malicious
// or compromised admin can't inject scripts, styles, event handlers, or links
// into content shown to every member in the Discover preview.
const ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'p', 'br', 'div', 'span'];

export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR: [] });
}

/** True when the (HTML) rich text has no visible text content. */
export function isRichTextEmpty(html: string | null | undefined): boolean {
  if (!html) return true;
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, '')
    .trim();
  return text.length === 0;
}
