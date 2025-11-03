import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { AboutMeSection } from '@/components/profile/AboutMeSection';
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
  role?: string;
  industry?: string;
  studyField?: string;
  university?: string;
}

interface ContactCardProps {
  contact: Contact;
  onClick?: () => void;
}

export function ContactCard({ contact, onClick }: ContactCardProps) {
  // Generate full stars and half star
  const fullStars = Math.floor(contact.rating);
  const hasHalfStar = contact.rating % 1 !== 0;
  
  // Convert age string to number
  const ageNum = parseInt(contact.age.replace('y', ''));

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
        <h3 className="text-center font-semibold mb-3 text-sm">{contact.name}</h3>

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
      </CardContent>
    </Card>
  );
}
