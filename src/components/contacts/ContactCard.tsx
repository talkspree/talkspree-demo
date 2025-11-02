import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Briefcase, MapPin, Globe, Instagram, Facebook, Linkedin, Mail } from 'lucide-react';
import { useProfileData } from '@/hooks/useProfileData';

interface Contact {
  id: number | string;
  name: string;
  job: string;
  age: string;
  country: string;
  gender: string;
  rating: number;
  avatarUrl: string;
}

interface ContactCardProps {
  contact: Contact;
  onClick?: () => void;
}

export function ContactCard({ contact, onClick }: ContactCardProps) {
  const { profileData } = useProfileData();
  
  // Generate full stars and half star
  const fullStars = Math.floor(contact.rating);
  const hasHalfStar = contact.rating % 1 !== 0;

  // Mock social media - in real app, this would come from contact data
  const socials = {
    instagram: profileData.instagram,
    facebook: profileData.facebook,
    linkedin: profileData.linkedin,
  };

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

        {/* Name */}
        <h3 className="text-center font-semibold mb-2 text-sm">{contact.name}</h3>

        {/* Job & Age & Gender */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
          <Briefcase className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{contact.job}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
          <span>{contact.age}, {contact.gender}</span>
        </div>

        {/* Country */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{contact.country}</span>
        </div>

        {/* Social Media Links */}
        {(socials.instagram || socials.facebook || socials.linkedin) && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold">Social Media</p>
            <div className="flex gap-1.5 justify-center">
              {socials.instagram && (
                <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" asChild>
                  <a href={socials.instagram} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                    <Instagram className="h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
              {socials.facebook && (
                <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" asChild>
                  <a href={socials.facebook} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                    <Facebook className="h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
              {socials.linkedin && (
                <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" asChild>
                  <a href={socials.linkedin} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                    <Linkedin className="h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
