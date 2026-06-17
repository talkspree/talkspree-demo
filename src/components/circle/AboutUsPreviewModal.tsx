import { CirclePreviewModal } from '@/components/circles/CirclePreviewModal';
import type { CircleCardData } from '@/components/circles/types';
import type { AboutMediaItem, Circle, CircleCreatorInfo } from '@/lib/api/circles';
import type { EditableMedia } from './AboutUsSection';

interface AboutUsPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The circle being edited (for id / abbreviation / visibility / counts). */
  circle: Circle | null;
  name: string;
  description: string;
  logoUrl: string;
  coverImageUrl: string;
  aboutDescription: string;
  media: EditableMedia[];
  anonymousCreator: boolean;
  memberCount: number;
  onlineCount: number;
  creator: CircleCreatorInfo | null;
}

/**
 * Shows admins exactly what members will see in the Discover preview, built from
 * the live (unsaved) About Us form state. Reuses CirclePreviewModal in
 * previewMode so the rendering can never drift from the real thing. Pending
 * (not-yet-uploaded) images are shown via their local object URLs.
 */
export function AboutUsPreviewModal(props: AboutUsPreviewModalProps) {
  const {
    isOpen, onClose, circle, name, description, logoUrl, coverImageUrl,
    aboutDescription, media, anonymousCreator, memberCount, onlineCount, creator,
  } = props;

  const aboutMedia: AboutMediaItem[] = media.map((m) =>
    m.kind === 'video'
      ? { type: 'video', url: m.url }
      : m.kind === 'image'
        ? { type: 'image', url: m.url }
        : { type: 'image', url: m.previewUrl },
  );

  const card: CircleCardData = {
    id: circle?.id ?? 'preview',
    name: name || circle?.name || 'Your circle',
    description,
    logo_url: logoUrl || null,
    cover_image_url: coverImageUrl || null,
    abbreviation: circle?.abbreviation ?? 'XXXX',
    visibility: circle?.visibility ?? 'private',
    memberCount,
    onlineCount,
    aboutDescription,
    aboutMedia,
    anonymousCreator,
    creator,
  };

  return (
    <CirclePreviewModal
      circle={card}
      isOpen={isOpen}
      onClose={onClose}
      onJoinViaLink={() => {}}
      onJoinFree={() => {}}
      previewMode
    />
  );
}
