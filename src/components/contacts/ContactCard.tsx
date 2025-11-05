import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Instagram, Facebook, Linkedin, Youtube, Music } from 'lucide-react';
import { AboutMeSection } from '@/components/profile/AboutMeSection';
import { useProfileData } from '@/hooks/useProfileData';
import { Button } from '@/components/ui/button';
import { useDevice } from '@/hooks/useDevice';

interface Contact {
  id: number | string;
  name: string;
  job: string;
  age: string;
  country: string;
  gender: string;
  rating: number;
  avatarUrl: string;
  role?: string;
  industry?: string;
  studyField?: string;
  university?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  youtube?: string;
  tiktok?: string;
  isOnline?: boolean;
  isSample?: boolean;
}

interface ContactCardProps {
  contact: Contact;
  onClick?: () => void;
}

export function ContactCard({ contact, onClick }: ContactCardProps) {
  const device = useDevice();
  // Generate full stars and half star
  const fullStars = Math.floor(contact.rating);
  const hasHalfStar = contact.rating % 1 !== 0;
  
  // Convert age string to number
  const ageNum = parseInt(contact.age.replace('y', ''));

  // Sample users are always online, others have their actual status
  const isOnline = contact.isSample ? true : (contact.isOnline ?? false);

  const socialLinks = [
    { platform: 'instagram', icon: Instagram, handle: contact.instagram, color: 'text-[#E4405F]' },
    { platform: 'facebook', icon: Facebook, handle: contact.facebook, color: 'text-[#1877F2]' },
    { platform: 'linkedin', icon: Linkedin, handle: contact.linkedin, color: 'text-[#0A66C2]' },
    { platform: 'youtube', icon: Youtube, handle: contact.youtube, color: 'text-[#FF0000]' },
    { platform: 'tiktok', icon: Music, handle: contact.tiktok, color: 'text-foreground' },
  ].filter(link => link.handle);

  return (
    <Card 
      className="bg-muted/30 border-2 hover:shadow-apple-md transition-smooth overflow-hidden cursor-pointer h-full"
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Avatar */}
        <div className="flex justify-center mb-3">
          <Avatar className="h-20 w-20 border-2 border-card">
            <AvatarImage src={contact.avatarUrl} />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
              {contact.name.split(' ').map(n => n.charAt(0)).join('')}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Rating Stars */}
        <div className="flex justify-center gap-0.5 mb-2">
          {[...Array(fullStars)].map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />
          ))}
          {hasHalfStar && (
            <div className="relative">
              <Star className="h-3.5 w-3.5 text-warning" />
              <div className="absolute inset-0 overflow-hidden w-1/2">
                <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              </div>
            </div>
          )}
          {[...Array(5 - fullStars - (hasHalfStar ? 1 : 0))].map((_, i) => (
            <Star key={`empty-${i}`} className="h-3.5 w-3.5 text-muted-foreground/30" />
          ))}
        </div>

        {/* Name and Online Status */}
        <div className="text-center mb-3">
          <h3 className="font-semibold text-sm">{contact.name}</h3>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            {isOnline ? (
              <>
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs text-success font-medium">online</span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">offline</span>
              </>
            )}
          </div>
        </div>

        {/* About Me Section */}
        <AboutMeSection
          role={contact.role}
          occupation={contact.job}
          industry={contact.industry}
          studyField={contact.studyField}
          university={contact.university}
          age={ageNum}
          gender={contact.gender}
          location={contact.country}
          compact
          className="text-muted-foreground"
        />

        {/* Dividing Line */}
        {socialLinks.length > 0 && (
          <div className="border-t border-border my-3" />
        )}

        {/* Social Media Buttons */}
        {socialLinks.length > 0 && (
          <div className="flex items-center justify-center gap-2">
            {socialLinks.map(({ platform, icon: Icon, handle, color }) => (
              <Button
                key={platform}
                size="icon"
                variant="ghost"
                className={`h-8 w-8 rounded-full ${color} hover:bg-accent`}
                onClick={(e) => {
                  e.stopPropagation();
                  const urls: Record<string, string> = {
                    instagram: `https://instagram.com/${handle}`,
                    facebook: `https://facebook.com/${handle}`,
                    linkedin: `https://linkedin.com/in/${handle}`,
                    youtube: `https://youtube.com/@${handle}`,
                    tiktok: `https://tiktok.com/@${handle}`,
                  };
                  window.open(urls[platform], '_blank');
                }}
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
