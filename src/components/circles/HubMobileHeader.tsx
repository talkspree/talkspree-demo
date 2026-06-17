import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/common/UserAvatar';
import { ProfileCard } from '@/components/home/ProfileCard';
import { NotificationBell } from '@/components/home/NotificationBell';
import { FeedbackButton } from '@/components/feedback/FeedbackButton';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileData } from '@/hooks/useProfileData';
import { useIsAdminAnywhere } from '@/hooks/useIsAdminAnywhere';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import logo from '@/assets/logo.svg';
import headerPattern from '@/assets/header-pattern.png';

/**
 * Mobile top bar for the Circles hub. Mirrors MobileHome's header (logo +
 * feedback + notifications + profile menu) so the hub matches the circle
 * homepage on phones. There is no role pill here — the hub isn't scoped to a
 * single circle.
 */
export function HubMobileHeader() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { profileData } = useProfileData();
  const { isAdminAnywhere } = useIsAdminAnywhere();
  const [showProfile, setShowProfile] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-14">
        <div className="h-full bg-card/95 backdrop-blur-md border-b border-border flex items-center justify-between px-4 relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-40"
            style={{ backgroundImage: `url(${headerPattern})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
          <button onClick={() => navigate('/home')} className="focus:outline-none relative z-10">
            <img src={logo} alt="TalkSpree" className="h-5" />
          </button>

          <div className="flex items-center gap-2 relative z-10">
            <FeedbackButton />
            <NotificationBell align="center" modal={false} />

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full p-0 ml-2 transition-transform hover:scale-105 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none">
                  <UserAvatar
                    src={profileData.profilePicture}
                    firstName={profileData.firstName}
                    lastName={profileData.lastName}
                    className="h-10 w-10"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card z-[100]">
                <DropdownMenuItem onClick={() => setShowProfile(true)} className="cursor-pointer justify-center">
                  View Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer justify-center">
                  Settings
                </DropdownMenuItem>
                {isAdminAnywhere && (
                  <DropdownMenuItem
                    onClick={() => window.open('https://admin.talkspree.com', '_blank', 'noopener,noreferrer')}
                    className="cursor-pointer justify-center gap-2 my-1 rounded-md border border-border/60 bg-muted/60 text-muted-foreground focus:bg-muted focus:text-foreground"
                  >
                    <Shield className="h-4 w-4" />
                    Admin Manager
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={async () => {
                  await signOut();
                  navigate('/auth');
                }} className="cursor-pointer justify-center gap-2 text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <ProfileCard open={showProfile} onOpenChange={setShowProfile} />
    </>
  );
}
