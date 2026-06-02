import * as React from 'react';
import { User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  /** Profile picture URL. When missing/empty the consistent default fallback is shown. */
  src?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  /** Full name fallback, used when first/last names aren't available separately. */
  name?: string | null;
  alt?: string;
  /** Applied to the Avatar root — use this for sizing (e.g. "h-9 w-9"). */
  className?: string;
  /** Extra classes for the fallback (e.g. text size like "text-3xl"). */
  fallbackClassName?: string;
}

function getInitials(
  firstName?: string | null,
  lastName?: string | null,
  name?: string | null,
): string {
  const first = firstName?.trim();
  const last = lastName?.trim();
  if (first || last) {
    return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
  }
  const full = name?.trim();
  if (full) {
    const parts = full.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (parts[0]?.[0] ?? '').toUpperCase();
  }
  return '';
}

/**
 * Consistent user profile avatar used across the app.
 *
 * Renders the profile picture when available, otherwise a unified default:
 * the user's initials on the primary gradient, or a generic person icon when
 * no name is known. Keeping this in one place ensures the "no picture yet"
 * state looks identical everywhere.
 */
export function UserAvatar({
  src,
  firstName,
  lastName,
  name,
  alt,
  className,
  fallbackClassName,
}: UserAvatarProps) {
  const initials = getInitials(firstName, lastName, name);

  return (
    <Avatar className={className}>
      {src ? <AvatarImage src={src} alt={alt ?? 'Profile'} /> : null}
      <AvatarFallback
        className={cn(
          'bg-gradient-primary text-primary-foreground font-semibold',
          fallbackClassName,
        )}
      >
        {initials ? initials : <User className="h-1/2 w-1/2" />}
      </AvatarFallback>
    </Avatar>
  );
}

export default UserAvatar;
