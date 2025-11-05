import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Star, Instagram, Linkedin, Facebook, Youtube, Music } from 'lucide-react';
import { Connection } from '@/utils/connections';
import { interests } from '@/data/interests';
import { useProfileData } from '@/hooks/useProfileData';
import { AboutMeSection } from '@/components/profile/AboutMeSection';
import { useDevice } from '@/hooks/useDevice';
import { useState } from 'react';

interface ContactDetailModalProps {
  contact: Connection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactDetailModal({ contact, open, onOpenChange }: ContactDetailModalProps) {
  const { profileData } = useProfileData();
  const device = useDevice();
  const [hoveredSocial, setHoveredSocial] = useState<string | null>(null);

  if (!contact) return null;

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const userInterests = contact.user.interests
    .map(id => interests.find(i => i.id === id))
    .filter(Boolean);

  const currentUserInterests = profileData.interests
    .map(id => interests.find(i => i.id === id))
    .filter(Boolean);

  const fullStars = Math.floor(4.5);
  const hasHalfStar = 4.5 % 1 !== 0;

  const socialLinks = [
    { platform: 'Instagram', handle: contact.user.instagram, icon: Instagram, url: `https://instagram.com/${contact.user.instagram?.replace('@', '')}`, color: '#E4405F' },
    { platform: 'LinkedIn', handle: contact.user.linkedin, icon: Linkedin, url: contact.user.linkedin?.startsWith('http') ? contact.user.linkedin : `https://linkedin.com/in/${contact.user.linkedin}`, color: '#0A66C2' },
    { platform: 'Facebook', handle: contact.user.facebook, icon: Facebook, url: contact.user.facebook?.startsWith('http') ? contact.user.facebook : `https://facebook.com/${contact.user.facebook}`, color: '#1877F2' },
    { platform: 'YouTube', handle: contact.user.youtube, icon: Youtube, url: contact.user.youtube?.startsWith('http') ? contact.user.youtube : `https://youtube.com/@${contact.user.youtube?.replace('@', '')}`, color: '#FF0000' },
    { platform: 'TikTok', handle: contact.user.tiktok, icon: Music, url: `https://tiktok.com/@${contact.user.tiktok?.replace('@', '')}`, color: '#000000' },
  ].filter(link => link.handle && link.handle.trim() !== '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        {device !== 'mobile' && (
          <DialogHeader>
            <DialogTitle>Contact Details</DialogTitle>
          </DialogHeader>
        )}

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6 p-6">
            {/* Profile Header */}
            <div className={`flex ${device === 'mobile' ? 'flex-col items-center' : 'items-start'} gap-6`}>
              <Avatar className="h-32 w-32 shrink-0 border-4 border-primary">
                <AvatarImage src="" />
                <AvatarFallback className="bg-warning text-warning-foreground text-3xl">
                  {contact.user.firstName[0]}{contact.user.lastName[0]}
                </AvatarFallback>
              </Avatar>

              <div className={`flex-1 space-y-3 ${device === 'mobile' ? 'text-center w-full' : ''}`}>
                <div>
                  <h2 className={`text-2xl font-bold ${device === 'mobile' ? 'text-center' : ''}`}>
                    {contact.user.firstName} {contact.user.lastName}
                  </h2>
                  
                  {/* Rating */}
                  <div className="flex items-center gap-1 my-2">
                    {[...Array(fullStars)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                    ))}
                    {hasHalfStar && (
                      <div className="relative">
                        <Star className="h-4 w-4 text-warning" />
                        <div className="absolute inset-0 overflow-hidden w-1/2">
                          <Star className="h-4 w-4 fill-warning text-warning" />
                        </div>
                      </div>
                    )}
                    {[...Array(5 - fullStars - (hasHalfStar ? 1 : 0))].map((_, i) => (
                      <Star key={`empty-${i}`} className="h-4 w-4 text-muted-foreground/30" />
                    ))}
                  </div>
                </div>

                {/* About Me Section */}
                <AboutMeSection
                  role={contact.user.role}
                  occupation={contact.user.occupation}
                  industry={contact.user.industry}
                  studyField={contact.user.studyField}
                  university={contact.user.university}
                  age={calculateAge(contact.user.dateOfBirth)}
                  gender={contact.user.gender}
                  location={contact.user.location}
                  className="text-muted-foreground"
                />
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Bio</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {contact.user.bio}
              </p>
            </div>

            {/* Social Media */}
            {socialLinks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Social Media</h4>
                {device === 'mobile' ? (
                  <div className="flex gap-3 justify-center flex-wrap">
                    {socialLinks.map(({ platform, url, icon: Icon, color }) => (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-xl hover:scale-110 transition-transform"
                        style={{ backgroundColor: `${color}15` }}
                      >
                        <Icon className="h-6 w-6" style={{ color }} />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {socialLinks.map(({ platform, handle, url, icon: Icon, color }) => (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative group"
                        onMouseEnter={() => setHoveredSocial(platform)}
                        onMouseLeave={() => setHoveredSocial(null)}
                      >
                        <div
                          className="px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 hover:scale-105"
                          style={{ 
                            backgroundColor: hoveredSocial === platform ? `${color}15` : 'transparent',
                            border: `2px solid ${color}30`
                          }}
                        >
                          <Icon className="h-4 w-4" style={{ color }} />
                          <span className="text-sm font-medium" style={{ color }}>
                            {platform}
                          </span>
                        </div>
                        {hoveredSocial === platform && (
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs whitespace-nowrap z-50">
                            {handle}
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Interests */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Interests</h4>
              <div className="flex flex-wrap gap-2">
                {userInterests.map((interest) => {
                  const isCommon = currentUserInterests.some(ui => ui?.id === interest!.id);
                  return (
                    <Badge 
                      key={interest!.id} 
                      variant={isCommon ? "default" : "secondary"}
                      className={`text-xs ${isCommon ? 'bg-primary text-primary-foreground' : ''}`}
                    >
                      {interest!.emoji} {interest!.name}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Additional Info */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <h4 className="text-sm font-semibold mb-1">University</h4>
                <p className="text-sm text-muted-foreground">{contact.user.university}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-1">Study Field</h4>
                <p className="text-sm text-muted-foreground">{contact.user.studyField}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-1">Workplace</h4>
                <p className="text-sm text-muted-foreground">{contact.user.workPlace}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-1">Industry</h4>
                <p className="text-sm text-muted-foreground">{contact.user.industry}</p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
