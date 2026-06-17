export interface VideoEmbed {
  /** youtube/vimeo → iframe; file → <video>; link → external fallback. */
  kind: 'youtube' | 'vimeo' | 'file' | 'link';
  /** URL to use for the iframe/video src (or the original link for 'link'). */
  embedUrl: string;
  originalUrl: string;
}

const YT = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/;
const VIMEO = /vimeo\.com\/(?:video\/)?(\d+)/;
const FILE = /\.(mp4|webm|ogg|mov)(\?.*)?$/i;

/**
 * Parse a pasted video link into something embeddable. Returns null when the
 * input isn't a plausible URL. Supports YouTube + Vimeo (embedded inline),
 * direct video files, and falls back to an external link for anything else.
 */
export function parseVideoUrl(input: string): VideoEmbed | null {
  const url = (input || '').trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return null;

  const yt = url.match(YT);
  if (yt) {
    return { kind: 'youtube', embedUrl: `https://www.youtube.com/embed/${yt[1]}`, originalUrl: url };
  }

  const vimeo = url.match(VIMEO);
  if (vimeo) {
    return { kind: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeo[1]}`, originalUrl: url };
  }

  if (FILE.test(url)) {
    return { kind: 'file', embedUrl: url, originalUrl: url };
  }

  return { kind: 'link', embedUrl: url, originalUrl: url };
}

/** True when the string is a video link we can do something useful with. */
export function isValidVideoUrl(input: string): boolean {
  return parseVideoUrl(input) !== null;
}

/** A poster/thumbnail image URL for the video, when one can be derived. */
export function videoThumbnail(input: string): string | null {
  const yt = (input || '').match(YT);
  if (yt) return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`;
  return null;
}
