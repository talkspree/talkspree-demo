import { User, Shield } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDevice } from '@/hooks/useDevice';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileData } from '@/hooks/useProfileData';
import { useCircle } from '@/contexts/CircleContext';
import logo from '@/assets/logo.svg';
import headerPattern from '@/assets/header-pattern.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileCard } from './ProfileCard';
import { RoleChangeModal } from './RoleChangeModal';
import { NotificationBell } from './NotificationBell';
import { FeedbackButton } from '@/components/feedback/FeedbackButton';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const device = useDevice();
  const { signOut } = useAuth();
  const { profileData } = useProfileData();
  const { circle, role: circleRole, isAdmin, loading: roleLoading, reloadRole } = useCircle();
  const [showProfile, setShowProfile] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Check if we're on the contacts page
  const isContactsPage = location.pathname === '/contacts';
  const shouldShowRoleBadge = !isContactsPage || circleRole === 'Super Admin';

  // Get role badge styling based on role type
  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'Super Admin':
        return {
          className: 'bg-gradient-primary text-white shadow-md hover:shadow-lg',
          isGradient: true
        };
      case 'Creator':
      case 'Admin':
        return {
          className: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md hover:shadow-lg',
          isGradient: true
        };
      default:
        // Neumorphic style for regular roles
        return {
          className: 'bg-background text-foreground neu-concave hover:neu-concave-pressed',
          isGradient: false
        };
    }
  };
  
  const isAdminRole = circleRole === 'Super Admin' || circleRole === 'Creator' || circleRole === 'Admin';

  const circleLogoUrl = circle?.logo_url || '';

  return (
    <>
      <header className="h-16 sticky top-4 z-50">
        <div className="h-full max-w-[1920px] mx-auto bg-card/95 backdrop-blur-md rounded-full border border-border shadow-apple-md relative overflow-hidden px-6">
          <div
            className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] opacity-40"
            style={{ backgroundImage: `url(${headerPattern})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
          <div className="relative z-10 flex h-full w-full min-w-0 items-center justify-between gap-4">
          <button type="button" onClick={() => navigate('/')} className="focus:outline-none shrink-0">
            <img src={logo} alt="TalkSpree" className={device === 'mobile' ? 'h-5' : 'h-6'} />
          </button>

          <div className="flex min-w-0 items-center gap-3 shrink-0">
            {/* Report a bug / feedback — sits left of the role pill */}
            <FeedbackButton />

              {/* Role Badge Button */}
          {!roleLoading && circleRole && shouldShowRoleBadge && (
            <button
              onClick={() => !isAdminRole && setShowRoleModal(true)}
              disabled={isAdminRole}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                getRoleBadgeStyle(circleRole).className
              } ${!isAdminRole ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
              title={!isAdminRole ? 'Click to change your role' : ''}
            >
              {circleRole !== 'Super Admin' && (
                <Avatar className={`h-6 w-6 ${isAdminRole ? 'border border-white/30' : 'border border-border/50'}`}>
                  <AvatarImage src={circleLogoUrl} alt="Circle" />
                  <AvatarFallback className={`text-xs ${isAdminRole ? 'bg-white/20' : 'bg-muted'}`}>
                    M
                  </AvatarFallback>
                </Avatar>
              )}
              <span className="text-sm font-medium">{circleRole}</span>
              {isAdmin && <Shield className="h-3.5 w-3.5" />}
            </button>
          )}

            {/* Notifications */}
            <NotificationBell align="end" />

            {/* Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none">
                  <Avatar className="h-9 w-9">
                    {profileData.profilePicture ? (
                      <AvatarImage src={profileData.profilePicture} alt="Profile" />
                    ) : null}
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                      {profileData.firstName && profileData.lastName 
                        ? `${profileData.firstName[0]}${profileData.lastName[0]}`
                        : <User className="h-5 w-5" />
                      }
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card">
                <DropdownMenuItem onClick={() => setShowProfile(true)} className="cursor-pointer">
                  View Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  await signOut();
                  navigate('/auth');
                }} className="cursor-pointer">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          </div>
        </div>
      </header>

      <ProfileCard open={showProfile} onOpenChange={setShowProfile} />
      
      <RoleChangeModal
        open={showRoleModal}
        onOpenChange={setShowRoleModal}
        currentRole={circleRole}
        onRoleChanged={reloadRole}
      />
    </>
  );
}
