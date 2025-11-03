import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Star, Instagram, Linkedin, Facebook, Youtube, Music } from 'lucide-react';
import { Connection } from '@/utils/connections';
import { interests } from '@/data/interests';
import { useProfileData } from '@/hooks/useProfileData';
import { AboutMeSection } from '@/components/profile/AboutMeSection';

interface ContactDetailModalProps {
  contact: Connection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactDetailModal({ contact, open, onOpenChange }: ContactDetailModalProps) {
  const { profileData } = useProfileData();

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Contact Details</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6 p-6">
            {/* Profile Header */}
            <div className="flex items-start gap-6">
              <Avatar className="h-32 w-32 shrink-0 border-4 border-primary">
                <AvatarImage src="" />
                <AvatarFallback className="bg-warning text-warning-foreground text-3xl">
                  {contact.user.firstName[0]}{contact.user.lastName[0]}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-3">
                <div>
                  <h2 className="text-2xl font-bold">
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

            {/* Social Media - Unblurred for connected contacts */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Social Media</h4>
              <div className="space-y-2 text-sm">
                {contact.user.instagram && (
                  <div className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-pink-500" />
                    <span>{contact.user.instagram}</span>
                  </div>
                )}
                {contact.user.linkedin && (
                  <div className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-blue-600" />
                    <span>{contact.user.linkedin}</span>
                  </div>
                )}
                {contact.user.facebook && (
                  <div className="flex items-center gap-2">
                    <Facebook className="h-4 w-4 text-blue-500" />
                    <span>{contact.user.facebook}</span>
                  </div>
                )}
                {contact.user.youtube && (
                  <div className="flex items-center gap-2">
                    <Youtube className="h-4 w-4 text-red-600" />
                    <span>{contact.user.youtube}</span>
                  </div>
                )}
                {contact.user.tiktok && (
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    <span>{contact.user.tiktok}</span>
                  </div>
                )}
              </div>
            </div>

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
