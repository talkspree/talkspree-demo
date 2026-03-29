import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Instagram, Facebook, Linkedin, Youtube, Music, Mail } from 'lucide-react';
import { useProfileData } from '@/hooks/useProfileData';
import { interests } from '@/data/interests';
import { AboutMeSection } from '@/components/profile/AboutMeSection';

interface ProfileCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileCard({ open, onOpenChange }: ProfileCardProps) {
  const navigate = useNavigate();
  const { profileData, age, loading } = useProfileData();

  const getInterestData = (interestId: string) => {
    return interests.find(i => i.id === interestId);
  };

  const userInterests = profileData.interests
    .map(id => getInterestData(id))
    .filter(Boolean);

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl p-0 overflow-hidden border-0 bg-transparent shadow-none mx-auto my-auto">
          <div className="relative bg-white rounded-[2rem] shadow-[0_20px_70px_-15px_rgba(0,0,0,0.2)] overflow-hidden">
            <div className="p-8 flex items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Loading profile...</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const socialLinks = [
    { platform: 'Instagram', value: profileData.instagram, icon: Instagram, url: `https://instagram.com/${profileData.instagram?.replace('@', '')}`, color: '#E4405F' },
    { platform: 'Facebook', value: profileData.facebook, icon: Facebook, url: profileData.facebook?.startsWith('http') ? profileData.facebook : `https://facebook.com/${profileData.facebook}`, color: '#1877F2' },
    { platform: 'LinkedIn', value: profileData.linkedin, icon: Linkedin, url: profileData.linkedin?.startsWith('http') ? profileData.linkedin : `https://linkedin.com/in/${profileData.linkedin}`, color: '#0A66C2' },
    { platform: 'YouTube', value: profileData.youtube, icon: Youtube, url: profileData.youtube?.startsWith('http') ? profileData.youtube : `https://youtube.com/@${profileData.youtube?.replace('@', '')}`, color: '#FF0000' },
    { platform: 'TikTok', value: profileData.tiktok, icon: Music, url: `https://tiktok.com/@${profileData.tiktok?.replace('@', '')}`, color: '#000000' },
  ].filter(link => link.value && link.value.trim() !== '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-4xl p-0 overflow-hidden border-0 bg-transparent shadow-none mx-auto my-auto">
        <div className="relative bg-white rounded-[2rem] shadow-[0_20px_70px_-15px_rgba(0,0,0,0.2)] overflow-hidden max-h-[85vh] md:max-h-[90vh] overflow-y-auto custom-scrollbar">
          <div className="relative p-6 md:p-8">
            {/* Horizontal Layout */}
            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 md:gap-8">
              {/* Left Side - Avatar and Info */}
              <div className="flex flex-col items-center space-y-3">
                {/* Avatar */}
                <div className="relative">
                  <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-white shadow-lg">
                    <AvatarImage src={profileData.profilePicture} />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-3xl md:text-4xl font-bold">
                      {profileData.firstName[0]}{profileData.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Name */}
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center">
                  {profileData.firstName} {profileData.lastName}
                </h2>
                
                {/* About Me - compact centered */}
                <div className="w-full bg-gray-50 rounded-2xl p-3">
                  <h3 className="text-sm font-semibold text-blue-600 mb-2">About Me</h3>
                  <AboutMeSection
                    role={profileData.role}
                    occupation={profileData.occupation}
                    industry={profileData.industry}
                    studyField={profileData.studyField}
                    university={profileData.university}
                    age={age}
                    gender={profileData.gender}
                    location={profileData.location}
                    className="text-gray-700 text-center justify-center text-sm"
                    compact
                  />
                </div>

                {/* Bio - in bubble */}
                {profileData.bio && (
                  <div className="w-full bg-gray-50 rounded-2xl p-3">
                    <h3 className="font-semibold text-sm text-blue-600 mb-2">Bio</h3>
                    <p className="text-sm leading-relaxed text-gray-700">
                      {profileData.bio}
                    </p>
                  </div>
                )}

                {/* Social Links - Icons only with brand colors */}
                {(socialLinks.length > 0 || profileData.email) && (
                  <div className="w-full bg-gray-50 rounded-2xl p-3">
                    <h3 className="font-semibold text-sm text-blue-600 mb-2">Connect</h3>
                    <div className="flex gap-2 justify-center flex-wrap">
                      {profileData.email && (
                        <a
                          href={`mailto:${profileData.email}`}
                          className="p-2 rounded-xl hover:scale-110 transition-transform"
                          style={{ backgroundColor: '#EA440515' }}
                        >
                          <Mail className="h-4 w-4" style={{ color: '#EA4405' }} />
                        </a>
                      )}
                      {socialLinks.map(({ platform, url, icon: Icon, color }) => (
                        <a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl hover:scale-110 transition-transform"
                          style={{ backgroundColor: `${color}15` }}
                        >
                          <Icon className="h-4 w-4" style={{ color }} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side - Interests and Edit Button */}
              <div className="flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-blue-600">
                      Interests
                    </h3>
                    <span className="text-xs text-gray-500 font-medium">
                      {userInterests.length} selected
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5">
                     {userInterests.map((interest) => (
                      <div
                        key={interest!.id}
                        className="px-2 py-1 text-xs md:text-sm font-medium bg-gray-100 rounded-full border border-gray-200 flex items-center gap-1"
                      >
                        <span className="text-xs md:text-sm">{interest!.emoji}</span>
                        <span className="text-gray-700">{interest!.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Edit Button - in grid */}
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={() => {
                      onOpenChange(false);
                      navigate('/profile/edit');
                    }}
                    size="lg"
                    className="bg-gradient-primary hover:opacity-90 text-primary-foreground px-6 md:px-8 py-2 md:py-3 text-sm md:text-base font-semibold shadow-lg transition-opacity rounded-xl"
                  >
                    Edit Profile
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
