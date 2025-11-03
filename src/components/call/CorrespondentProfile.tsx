import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProfileData } from '@/hooks/useProfileData';
import { SampleUser } from '@/data/sampleUsers';
import { interests } from '@/data/interests';
import { AboutMeSection } from '@/components/profile/AboutMeSection';

interface CorrespondentProfileProps {
  matchedUser?: SampleUser;
  isConnected?: boolean;
  className?: string;
}

export function CorrespondentProfile({ matchedUser, isConnected = false, className = '' }: CorrespondentProfileProps) {
  const { profileData } = useProfileData();
  
  if (!matchedUser) {
    return (
      <div className={`bg-card border border-border rounded-lg overflow-hidden ${className}`}>
        <div className="p-6">
          <p className="text-muted-foreground">No user matched</p>
        </div>
      </div>
    );
  }

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

  const userInterests = matchedUser.interests
    .map(id => interests.find(i => i.id === id))
    .filter(Boolean);
  
  const currentUserInterests = profileData.interests
    .map(id => interests.find(i => i.id === id))
    .filter(Boolean);

  return (
    <div className={`bg-card border border-border rounded-lg overflow-hidden ${className}`}>
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          {/* Profile Header */}
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 mb-3">
              <AvatarImage src="" />
              <AvatarFallback className="bg-warning text-warning-foreground text-2xl">
                {matchedUser.firstName[0]}{matchedUser.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-bold">{matchedUser.firstName} {matchedUser.lastName}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <span>⭐⭐⭐⭐⭐</span>
            </div>
          </div>

          {/* About Me */}
          <div>
            <h4 className="font-semibold mb-2">About Me</h4>
            <AboutMeSection
              role={matchedUser.role}
              occupation={matchedUser.occupation}
              industry={matchedUser.industry}
              studyField={matchedUser.studyField}
              university={matchedUser.university}
              age={calculateAge(matchedUser.dateOfBirth)}
              gender={matchedUser.gender}
              location={matchedUser.location}
              className="text-muted-foreground"
            />
          </div>

          {/* Bio */}
          <div>
            <h4 className="font-semibold mb-2">Bio</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {matchedUser.bio}
            </p>
          </div>

          {/* Contacts (Social Media) - Blurred Badges */}
          <div>
            <h4 className="font-semibold mb-2">Contacts</h4>
            <div className="flex flex-wrap gap-2">
              {matchedUser.instagram && (
                <Badge variant="secondary" className="bg-[#E1306C]/10 border-[#E1306C]/20 blur-[2px] select-none cursor-not-allowed">
                  <span className="text-[#E1306C]">● Instagram</span>
                </Badge>
              )}
              {matchedUser.facebook && (
                <Badge variant="secondary" className="bg-[#1877F2]/10 border-[#1877F2]/20 blur-[2px] select-none cursor-not-allowed">
                  <span className="text-[#1877F2]">● Facebook</span>
                </Badge>
              )}
              {matchedUser.linkedin && (
                <Badge variant="secondary" className="bg-[#0A66C2]/10 border-[#0A66C2]/20 blur-[2px] select-none cursor-not-allowed">
                  <span className="text-[#0A66C2]">● LinkedIn</span>
                </Badge>
              )}
              {matchedUser.youtube && (
                <Badge variant="secondary" className="bg-[#FF0000]/10 border-[#FF0000]/20 blur-[2px] select-none cursor-not-allowed">
                  <span className="text-[#FF0000]">● YouTube</span>
                </Badge>
              )}
              {matchedUser.tiktok && (
                <Badge variant="secondary" className="bg-[#000000]/10 border-[#000000]/20 blur-[2px] select-none cursor-not-allowed">
                  <span className="text-[#000000] dark:text-[#FFFFFF]">● TikTok</span>
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground italic mt-2">
              Connect after the call to view contact details
            </p>
          </div>

          {/* Interests */}
          <div>
            <h4 className="font-semibold mb-3">Interests</h4>
            <div className="flex flex-wrap gap-2">
              {userInterests.map((interest) => {
                const isCommon = currentUserInterests.some(ui => ui?.id === interest!.id);
                return (
                  <Badge
                    key={interest!.id}
                    variant={isCommon ? 'default' : 'secondary'}
                    className={isCommon ? 'bg-primary text-primary-foreground' : ''}
                  >
                    {interest!.emoji} {interest!.name}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
