import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Instagram, Facebook, Linkedin, Youtube, Music } from 'lucide-react';
import { useProfileData } from '@/hooks/useProfileData';
import { interests } from '@/data/interests';
import { AboutMeSection } from '@/components/profile/AboutMeSection';

interface ProfileCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileCard({ open, onOpenChange }: ProfileCardProps) {
  const navigate = useNavigate();
  const { profileData, age } = useProfileData();

  const getInterestData = (interestId: string) => {
    return interests.find(i => i.id === interestId);
  };

  const userInterests = profileData.interests
    .map(id => getInterestData(id))
    .filter(Boolean);

  const socialLinks = [
    { platform: 'Instagram', value: profileData.instagram, icon: Instagram, url: `https://instagram.com/${profileData.instagram?.replace('@', '')}`, color: '#E4405F' },
    { platform: 'Facebook', value: profileData.facebook, icon: Facebook, url: profileData.facebook?.startsWith('http') ? profileData.facebook : `https://facebook.com/${profileData.facebook}`, color: '#1877F2' },
    { platform: 'LinkedIn', value: profileData.linkedin, icon: Linkedin, url: profileData.linkedin?.startsWith('http') ? profileData.linkedin : `https://linkedin.com/in/${profileData.linkedin}`, color: '#0A66C2' },
    { platform: 'YouTube', value: profileData.youtube, icon: Youtube, url: profileData.youtube?.startsWith('http') ? profileData.youtube : `https://youtube.com/@${profileData.youtube?.replace('@', '')}`, color: '#FF0000' },
    { platform: 'TikTok', value: profileData.tiktok, icon: Music, url: `https://tiktok.com/@${profileData.tiktok?.replace('@', '')}`, color: '#000000' },
  ].filter(link => link.value && link.value.trim() !== '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-0 bg-transparent shadow-none">
        <div className="relative bg-white rounded-[2rem] shadow-[0_20px_70px_-15px_rgba(0,0,0,0.2)] overflow-hidden max-h-[90vh]">
          <div className="relative p-8 overflow-y-auto max-h-[90vh]">
            {/* Horizontal Layout */}
            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8">
              {/* Left Side - Avatar and Info */}
              <div className="flex flex-col items-center space-y-4">
                {/* Avatar */}
                <div className="relative">
                  <Avatar className="h-40 w-40 border-4 border-white shadow-lg">
                    <AvatarImage src={profileData.profilePicture} />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-4xl font-bold">
                      {profileData.firstName[0]}{profileData.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Name */}
                <h2 className="text-3xl font-bold text-gray-900 text-center">
                  {profileData.firstName} {profileData.lastName}
                </h2>
                
                {/* About Me - in bubble */}
                <div className="w-full bg-gray-50 rounded-2xl p-3">
                  <AboutMeSection
                    role={profileData.role}
                    occupation={profileData.occupation}
                    industry={profileData.industry}
                    studyField={profileData.studyField}
                    university={profileData.university}
                    age={age}
                    gender={profileData.gender}
                    location={profileData.location}
                    className="text-gray-700"
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
                {socialLinks.length > 0 && (
                  <div className="w-full bg-gray-50 rounded-2xl p-3">
                    <h3 className="font-semibold text-sm text-blue-600 mb-3">Connect</h3>
                    <div className="flex gap-2 justify-center">
                      {socialLinks.map(({ platform, url, icon: Icon, color }) => (
                        <a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-xl hover:scale-110 transition-transform"
                          style={{ backgroundColor: `${color}15` }}
                        >
                          <Icon className="h-5 w-5" style={{ color }} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side - Interests */}
              <div className="flex flex-col">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-blue-600">
                      Interests
                    </h3>
                    <span className="text-sm text-gray-500 font-medium">
                      {userInterests.length} selected
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2.5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {userInterests.map((interest) => (
                      <div
                        key={interest!.id}
                        className="px-4 py-2.5 text-sm font-medium bg-gray-100 rounded-full border border-gray-200 flex items-center gap-2"
                      >
                        <span className="text-base">{interest!.emoji}</span>
                        <span className="text-gray-700">{interest!.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Button - Bottom Right */}
            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => {
                  onOpenChange(false);
                  navigate('/profile/edit');
                }}
                size="lg"
                className="bg-gradient-primary hover:opacity-90 text-primary-foreground px-8 py-3 text-base font-semibold shadow-lg transition-opacity rounded-xl"
              >
                Edit Profile
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
