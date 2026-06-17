import { sanitizeRichText } from '@/lib/sanitizeHtml';
import { cn } from '@/lib/utils';

/**
 * Renders admin-authored rich text. The HTML is sanitized to a strict allow-list
 * before insertion (see sanitizeRichText). Pair with the `rich-content` class for
 * list/emphasis styling (Tailwind base resets those otherwise).
 */
export function SafeHtml({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn('rich-content', className)}
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }}
    />
  );
}
