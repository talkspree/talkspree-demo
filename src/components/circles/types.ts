/**
 * Shared shape for a circle rendered as a card / preview in the Circles hub.
 * Both "Your circles" (from getMyCircles + counts) and "Discover circles"
 * (from getDiscoverableCircles) are normalised to this so the card + preview
 * components don't care where the data came from.
 */
import type { AboutMediaItem, CircleCreatorInfo } from '@/lib/api/circles';

export interface CircleCardData {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  abbreviation: string;
  visibility: 'public' | 'private';
  memberCount: number;
  onlineCount: number;
  /** The viewer's role in this circle (only for "Your circles"). */
  role?: string | null;
  /** True when the viewer created/admins this circle (gradient border). */
  isCreated?: boolean;
  /** "About Us" preview content (Discover circles). */
  aboutDescription?: string | null;
  aboutMedia?: AboutMediaItem[];
  anonymousCreator?: boolean;
  creator?: CircleCreatorInfo | null;
}
