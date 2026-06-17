import { useEffect, useRef, useState, useCallback } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Smile } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const EMOJIS = [
  '😀', '😃', '😄', '😁', '😊', '🙂', '😉', '😍', '🥰', '😎',
  '🤩', '🥳', '🤗', '🤝', '👋', '👍', '👏', '🙌', '💪', '🙏',
  '🔥', '✨', '⭐', '🌟', '💡', '🎯', '🚀', '🏆', '🎉', '❤️',
  '💙', '💚', '💜', '🧡', '💛', '✅', '☑️', '📌', '📣', '💬',
  '🌍', '🌱', '🎓', '📚', '🧠', '💼', '🤔', '😢', '😮', '👀',
];

/**
 * Lightweight WYSIWYG editor for the circle "About Us" description.
 * Supports bold / italic / underline, bulleted + numbered lists, and emoji.
 * No alignment controls — content is always left-aligned. Output is HTML; it is
 * sanitized on save and on render (see sanitizeRichText), and pasting is forced
 * to plain text so no foreign markup enters the document.
 */
export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  // Seed/replace content only when the incoming value diverges and the editor
  // isn't focused, so we never reset the caret while the admin is typing.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.innerHTML !== (value || '')) {
      el.innerHTML = value || '';
    }
    setIsEmpty(!el.textContent?.trim());
  }, [value]);

  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  const pushChange = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    setIsEmpty(!el.textContent?.trim());
    onChange(el.innerHTML);
  }, [onChange]);

  const exec = useCallback((command: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    // Produce semantic tags (<b>/<i>/<ul>…) rather than inline styles.
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand(command);
    pushChange();
  }, [pushChange]);

  const insertEmoji = useCallback((emoji: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (savedRange.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
    document.execCommand('insertText', false, emoji);
    pushChange();
  }, [pushChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    pushChange();
  }, [pushChange]);

  const ToolbarButton = ({
    onApply, title, children,
  }: { onApply: () => void; title: string; children: React.ReactNode }) => (
    <button
      type="button"
      title={title}
      // Keep the editor selection intact when clicking the toolbar.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onApply}
      className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {children}
    </button>
  );

  return (
    <div className={cn('rounded-xl border border-input bg-background overflow-hidden focus-within:border-primary transition-colors', className)}>
      <div className="flex items-center gap-0.5 border-b border-border/60 bg-muted/30 px-1.5 py-1">
        <ToolbarButton title="Bold" onApply={() => exec('bold')}><Bold className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Italic" onApply={() => exec('italic')}><Italic className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Underline" onApply={() => exec('underline')}><Underline className="h-4 w-4" /></ToolbarButton>
        <div className="w-px h-5 bg-border/60 mx-1" />
        <ToolbarButton title="Bulleted list" onApply={() => exec('insertUnorderedList')}><List className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Numbered list" onApply={() => exec('insertOrderedList')}><ListOrdered className="h-4 w-4" /></ToolbarButton>
        <div className="w-px h-5 bg-border/60 mx-1" />
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              title="Emoji"
              onMouseDown={saveSelection}
              className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Smile className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-2">
            <div className="grid grid-cols-10 gap-0.5 max-w-[300px]">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-lg leading-none"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          onInput={pushChange}
          onBlur={pushChange}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onPaste={handlePaste}
          className="rich-content min-h-[140px] max-h-[360px] overflow-y-auto px-4 py-3 text-sm leading-relaxed text-foreground focus:outline-none"
        />
        {isEmpty && placeholder && (
          <div className="pointer-events-none absolute left-4 top-3 text-sm text-muted-foreground">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
