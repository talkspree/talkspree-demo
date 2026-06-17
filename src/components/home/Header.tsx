import { Shield, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDevice } from '@/hooks/useDevice';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileData } from '@/hooks/useProfileData';
import { useCircle } from '@/contexts/CircleContext';
import { useIsAdminAnywhere } from '@/hooks/useIsAdminAnywhere';
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
import { UserAvatar } from '@/components/common/UserAvatar';
import { ProfileCard } from './ProfileCard';
import { RoleChangeModal } from './RoleChangeModal';
import { NotificationBell } from './NotificationBell';
import { FeedbackButton } from '@/components/feedback/FeedbackButton';

interface HeaderProps {
  /** The hub (/home) passes false — it isn't scoped to a single circle. */
  showRolePill?: boolean;
}

export function Header({ showRolePill = true }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const device = useDevice();
  const { signOut } = useAuth();
  const { profileData } = useProfileData();
  const { circle, role: circleRole, isAdmin, loading: roleLoading, reloadRole } = useCircle();
  const { isAdminAnywhere } = useIsAdminAnywhere();
  const [showProfile, setShowProfile] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Role pill shows only when enabled, on a page with an active circle (or for a
  // global Super Admin), and not on the contacts page (unless Super Admin).
  const isContactsPage = location.pathname === '/contacts';
  const shouldShowRoleBadge =
    showRolePill &&
    (circleRole === 'Super Admin' || !!circle) &&
    (!isContactsPage || circleRole === 'Super Admin');

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
          <button type="button" onClick={() => navigate('/home')} className="focus:outline-none shrink-0">
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
                    {circle?.name?.charAt(0)?.toUpperCase() || 'C'}
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
                <Button variant="ghost" size="icon" className="rounded-full transition-transform hover:scale-105 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none">
                  <UserAvatar
                    src={profileData.profilePicture}
                    firstName={profileData.firstName}
                    lastName={profileData.lastName}
                    className="h-9 w-9"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card">
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
