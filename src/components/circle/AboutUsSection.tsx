import { useRef, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import {
  ImagePlus, Video, Plus, X, GripVertical, Eye, Play, UserRound,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { parseVideoUrl, videoThumbnail, isValidVideoUrl } from '@/lib/videoEmbed';
import type { AboutMediaItem } from '@/lib/api/circles';

export const MAX_ABOUT_MEDIA = 5;

/**
 * Working model for the media manager. Existing/uploaded images and videos carry
 * a URL; a freshly-picked image is held as a File (with a local preview) and only
 * uploaded to storage when the admin saves.
 */
export type EditableMedia =
  | { id: string; kind: 'image'; url: string }
  | { id: string; kind: 'image-pending'; file: File; previewUrl: string }
  | { id: string; kind: 'video'; url: string };

const newId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `m_${Date.now()}_${Math.random().toString(36).slice(2)}`;

/** Stored media → editable list (on load). */
export function aboutMediaToEditable(media: AboutMediaItem[]): EditableMedia[] {
  return (media ?? []).map((m) =>
    m.type === 'video'
      ? { id: newId(), kind: 'video', url: m.url }
      : { id: newId(), kind: 'image', url: m.url },
  );
}

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

interface AboutUsSectionProps {
  media: EditableMedia[];
  onMediaChange: (media: EditableMedia[]) => void;
  description: string;
  onDescriptionChange: (html: string) => void;
  anonymousCreator: boolean;
  onAnonymousCreatorChange: (v: boolean) => void;
  onPreview: () => void;
}

export function AboutUsSection({
  media, onMediaChange, description, onDescriptionChange,
  anonymousCreator, onAnonymousCreatorChange, onPreview,
}: AboutUsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [videoMode, setVideoMode] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [error, setError] = useState('');

  const atCapacity = media.length >= MAX_ABOUT_MEDIA;

  const resetAdd = () => {
    setAddOpen(false);
    setVideoMode(false);
    setVideoUrl('');
    setError('');
  };

  const handlePickImage = () => {
    resetAdd();
    fileInputRef.current?.click();
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      setError('Please choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB.');
      return;
    }
    if (atCapacity) return;
    const item: EditableMedia = {
      id: newId(), kind: 'image-pending', file, previewUrl: URL.createObjectURL(file),
    };
    onMediaChange([...media, item]);
  };

  const handleAddVideo = () => {
    const url = videoUrl.trim();
    if (!isValidVideoUrl(url)) {
      setError('Paste a valid video link (YouTube, Vimeo, or a direct video URL).');
      return;
    }
    onMediaChange([...media, { id: newId(), kind: 'video', url }]);
    resetAdd();
  };

  const removeItem = (id: string) => {
    const item = media.find((m) => m.id === id);
    if (item?.kind === 'image-pending') URL.revokeObjectURL(item.previewUrl);
    onMediaChange(media.filter((m) => m.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>About Us info</CardTitle>
            <CardDescription>
              Curate what people see in your circle's preview — media, a rich description, and creator visibility.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" className="gap-2 shrink-0" onClick={onPreview}>
            <Eye className="h-4 w-4" />
            Preview
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* ── Media gallery ───────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Media gallery</Label>
            <span className="text-xs text-muted-foreground tabular-nums">{media.length}/{MAX_ABOUT_MEDIA}</span>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            Up to {MAX_ABOUT_MEDIA} items. Drag to reorder. Images upload from your device; videos are added by link.
            The cover image and logo aren't part of this gallery.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_TYPES.join(',')}
            className="hidden"
            onChange={handleImageFile}
          />

          <div className="flex flex-wrap items-stretch gap-3">
            {media.length > 0 && (
              <Reorder.Group
                axis="x"
                values={media}
                onReorder={onMediaChange}
                className="flex flex-wrap items-stretch gap-3"
              >
                {media.map((item) => (
                  <MediaTile key={item.id} item={item} onRemove={() => removeItem(item.id)} />
                ))}
              </Reorder.Group>
            )}

            {!atCapacity && (
              <Popover open={addOpen} onOpenChange={(o) => (o ? setAddOpen(true) : resetAdd())}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-28 h-28 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-muted/40 transition-colors flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-primary"
                  >
                    <Plus className="h-6 w-6" />
                    <span className="text-xs font-medium">Add media</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 p-3">
                  {!videoMode ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold px-1">What would you like to add?</p>
                      <button
                        type="button"
                        onClick={handlePickImage}
                        className="w-full flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary hover:bg-muted/40 transition-colors text-left"
                      >
                        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <ImagePlus className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">Image</div>
                          <div className="text-xs text-muted-foreground">Upload from your device</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setError(''); setVideoMode(true); }}
                        className="w-full flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary hover:bg-muted/40 transition-colors text-left"
                      >
                        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Video className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">Video</div>
                          <div className="text-xs text-muted-foreground">Paste a link (no upload)</div>
                        </div>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Video link</Label>
                      <Input
                        autoFocus
                        value={videoUrl}
                        onChange={(e) => { setVideoUrl(e.target.value); setError(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddVideo()}
                        placeholder="https://youtube.com/watch?v=…"
                      />
                      <div className="flex gap-2 pt-1">
                        <Button type="button" size="sm" className="flex-1" onClick={handleAddVideo}>Add video</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => { setVideoMode(false); setVideoUrl(''); setError(''); }}>Back</Button>
                      </div>
                    </div>
                  )}
                  {error && <p className="text-xs text-destructive mt-2">{error}</p>}
                </PopoverContent>
              </Popover>
            )}
          </div>
          {error && !addOpen && <p className="text-xs text-destructive">{error}</p>}
        </div>

        {/* ── Rich description ────────────────────────────────────────── */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Description</Label>
          <p className="text-xs text-muted-foreground -mt-1">
            The longer description shown in your circle's preview. Format with bold, italic, lists, and emoji.
          </p>
          <RichTextEditor
            value={description}
            onChange={onDescriptionChange}
            placeholder="Tell people what your circle is about, who it's for, and what they'll get out of it…"
          />
        </div>

        {/* ── Creator visibility ──────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-xl border border-border p-4 bg-muted/20">
          <div className="flex items-start gap-3 pr-4">
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <UserRound className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h5 className="font-medium text-sm">Anonymous creator</h5>
              <p className="text-xs text-muted-foreground mt-0.5">
                When on, the preview won't reveal who created this circle.
              </p>
            </div>
          </div>
          <Switch checked={anonymousCreator} onCheckedChange={onAnonymousCreatorChange} />
        </div>
      </CardContent>
    </Card>
  );
}

/** A single draggable media thumbnail. */
function MediaTile({ item, onRemove }: { item: EditableMedia; onRemove: () => void }) {
  const controls = useDragControls();

  const imgSrc =
    item.kind === 'image' ? item.url
    : item.kind === 'image-pending' ? item.previewUrl
    : videoThumbnail(item.url);

  const isVideo = item.kind === 'video';
  const host = isVideo ? hostnameOf(item.url) : '';

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      className="relative w-28 h-28 rounded-xl overflow-hidden border border-border bg-muted shadow-sm group select-none"
    >
      {imgSrc ? (
        <img src={imgSrc} alt="" className="w-full h-full object-cover" draggable={false} />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#4A72FF] to-[#BF48FF] flex items-center justify-center">
          <Play className="h-7 w-7 text-white" />
        </div>
      )}

      {isVideo && (
        <>
          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
            <div className="h-9 w-9 rounded-full bg-black/55 backdrop-blur flex items-center justify-center">
              <Play className="h-4 w-4 text-white fill-white" />
            </div>
          </div>
          <span className="absolute bottom-1 left-1 right-9 truncate text-[10px] font-medium text-white/90 drop-shadow">{host}</span>
        </>
      )}

      {/* Drag handle */}
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        className="absolute top-1 left-1 h-6 w-6 rounded-md bg-black/45 backdrop-blur flex items-center justify-center text-white cursor-grab active:cursor-grabbing touch-none"
        title="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 h-6 w-6 rounded-md bg-black/45 backdrop-blur flex items-center justify-center text-white hover:bg-destructive transition-colors"
        title="Remove"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <span className="absolute bottom-1 right-1 h-5 w-5 rounded bg-black/45 backdrop-blur flex items-center justify-center text-white">
        {isVideo ? <Video className="h-3 w-3" /> : <ImagePlus className="h-3 w-3" />}
      </span>
    </Reorder.Item>
  );
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'video';
  }
}
