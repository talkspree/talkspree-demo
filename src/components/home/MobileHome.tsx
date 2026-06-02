import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Globe, Instagram, Facebook, Linkedin, Mail, Copy, Check, MessageSquare, MessageCircle, Info, User, Shield, Users, LogOut } from 'lucide-react';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useChat } from '@/contexts/ChatContext';
import { FiltersSection } from './FiltersSection';
import logo from '@/assets/logo.svg';
import headerPattern from '@/assets/header-pattern.png';
import profileViewIcon from '@/assets/profile-view.png';
import { useNavigate } from 'react-router-dom';
import { ProfileCard } from './ProfileCard';
import { RoleChangeModal } from './RoleChangeModal';
import { NotificationBell } from './NotificationBell';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileData } from '@/hooks/useProfileData';
import { useCircle } from '@/contexts/CircleContext';
import { supabase } from '@/lib/supabase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FeedbackButton } from '@/components/feedback/FeedbackButton';
import { copyTextToClipboard } from '@/lib/copyToClipboard';
import { cn } from '@/lib/utils';

export function MobileHome() {
  const [activeTab, setActiveTab] = useState<'chat' | 'about'>('chat');
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { profileData } = useProfileData();
  const { circle: contextCircle, role: circleRole, isAdmin, memberCounts, loading: roleLoading, reloadRole, unseenContactCount } = useCircle();
  const { totalUnread, openMobileMessenger } = useChat();
  const [showProfile, setShowProfile] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const inviteCopyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (inviteCopyResetRef.current) clearTimeout(inviteCopyResetRef.current);
    };
  }, []);

  // Safety net: clean up stale matchmaking state on home page mount
  useEffect(() => {
    const cleanup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await Promise.allSettled([
        supabase
          .from('matchmaking_queue')
          .delete()
          .eq('user_id', user.id)
          .in('status', ['waiting', 'matched']),
        supabase
          .from('profiles')
          .update({ in_call: false, is_online: false })
          .eq('id', user.id),
      ]);
    };
    cleanup();
  }, []);
  const [showRoleModal, setShowRoleModal] = useState(false);

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

  // Derive counts from context (no separate polling needed)
  const totalMembers = memberCounts.total;
  const onlineCount = memberCounts.online;

  // Personal affiliate invite link: every viewer sees a link with THEIR own
  // slug so any signups attributed to it record `invited_by = me`.
  const circleAbbr = contextCircle?.abbreviation || contextCircle?.invite_code || 'MTY';
  const personalSlug = profileData.slug || 'invite';
  const circleData = {
    name: contextCircle?.name || 'Mentor the Young',
    members: totalMembers.toString(),
    online: onlineCount.toString(),
    bio: contextCircle?.description || 'Mentor the Young Bulgaria is a nonprofit organization dedicated to empowering young individuals through mentorship programs. We connect experienced professionals with ambitious youth to foster personal and professional growth.',
    inviteLink: `https://talkspree.com/${circleAbbr}/${personalSlug}`,
    logoUrl: contextCircle?.logo_url || '',
    socials: {
      website: contextCircle?.social_links?.website || 'https://example.com',
      instagram: contextCircle?.social_links?.instagram || 'https://instagram.com',
      facebook: contextCircle?.social_links?.facebook || 'https://facebook.com',
      linkedin: contextCircle?.social_links?.linkedin || 'https://linkedin.com',
      email: contextCircle?.social_links?.email || 'mailto:info@example.com',
    }
  };

  const copyInviteLink = async () => {
    const ok = await copyTextToClipboard(circleData.inviteLink);
    if (ok) {
      setInviteCopied(true);
      if (inviteCopyResetRef.current) clearTimeout(inviteCopyResetRef.current);
      inviteCopyResetRef.current = setTimeout(() => {
        setInviteCopied(false);
        inviteCopyResetRef.current = null;
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14">
        <div className="h-full bg-card/95 backdrop-blur-md border-b border-border flex items-center justify-between px-4 relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-40 md:rounded-2xl"
            style={{ backgroundImage: `url(${headerPattern})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
          <button onClick={() => navigate('/')} className="focus:outline-none relative z-10">
            <img src={logo} alt="TalkSpree" className="h-5" />
          </button>

          <div className="flex items-center gap-2 relative z-10">
          {/* Report a bug / feedback */}
          <FeedbackButton />

          {/* Notifications */}
          <NotificationBell align="center" modal={false} />

            {/* Profile */}
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
                {isAdminRole && (
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

      {/* Content with top padding to account for fixed header */}
      <div className="pt-14">
        {/* Circle Cover */}
        <div
          className="h-32 bg-gradient-primary relative"
          style={contextCircle?.cover_image_url ? { backgroundImage: `url(${contextCircle.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        >
          {!contextCircle?.cover_image_url && (
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyIiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMiIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')] opacity-30" />
          )}
        </div>

        {/* Profile Section */}
        <div className="px-4 -mt-16 pb-4">
          {/* Avatar */}
          <div className="flex justify-center mb-3">
            <Avatar className="h-28 w-28 border-4 border-background shadow-lg">
              <AvatarImage src={circleData.logoUrl} />
              <AvatarFallback className="bg-warning text-warning-foreground text-2xl font-semibold">
                {circleData.name?.[0] || 'C'}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Title and Members */}
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold mb-1">{circleData.name}</h1>
            <div className="flex items-center justify-center gap-4 text-sm">
              <span className="text-muted-foreground">{circleData.members} members</span>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span className="font-medium">{circleData.online} online</span>
              </div>
            </div>
            
            {/* Role Badge Button */}
            {!roleLoading && circleRole && (
              <div className="flex justify-center mt-3">
                <button
                  onClick={() => !isAdminRole && setShowRoleModal(true)}
                  disabled={isAdminRole}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                    getRoleBadgeStyle(circleRole).className
                  } ${!isAdminRole ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
                  title={!isAdminRole ? 'Tap to change your role' : ''}
                >
                  <span className="text-sm font-medium">{circleRole}</span>
                  {isAdmin && <Shield className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Tab Toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={activeTab === 'chat' ? 'default' : 'outline'}
              className="flex-1 gap-2"
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare className="h-4 w-4" />
              Chat
            </Button>
            <Button
              variant={activeTab === 'about' ? 'default' : 'outline'}
              className="flex-1 gap-2"
              onClick={() => setActiveTab('about')}
            >
              <Info className="h-4 w-4" />
              About
            </Button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-4 pb-24">
          {activeTab === 'chat' ? (
            <div className="mobile-filters">
              <FiltersSection />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Bio */}
              <div className="bg-card rounded-lg p-4 border border-border">
                <h3 className="font-semibold mb-2">About</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {circleData.bio}
                </p>
              </div>

              {/* Social Links */}
              <div className="bg-card rounded-lg p-4 border border-border">
                <h3 className="font-semibold mb-3">Connect with us</h3>
                <div className="flex gap-2 justify-center">
                  <Button size="icon" variant="outline" className="rounded-full h-12 w-12">
                    <Globe className="h-5 w-5" />
                  </Button>
                  <Button size="icon" variant="outline" className="rounded-full h-12 w-12">
                    <Instagram className="h-5 w-5" />
                  </Button>
                  <Button size="icon" variant="outline" className="rounded-full h-12 w-12">
                    <Facebook className="h-5 w-5" />
                  </Button>
                  <Button size="icon" variant="outline" className="rounded-full h-12 w-12">
                    <Linkedin className="h-5 w-5" />
                  </Button>
                  <Button size="icon" variant="outline" className="rounded-full h-12 w-12">
                    <Mail className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Invite Link */}
              <div className="bg-card rounded-lg p-4 border border-border">
                <h3 className="font-semibold mb-2">Invite members</h3>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-muted/50 rounded-lg text-sm truncate">
                    {circleData.inviteLink}
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className={cn(
                      'rounded-full shrink-0',
                      inviteCopied &&
                        'border-success bg-success text-success-foreground hover:bg-success/90 hover:border-success hover:text-success-foreground'
                    )}
                    onClick={() => void copyInviteLink()}
                    aria-label={inviteCopied ? 'Copied' : 'Copy invite link'}
                  >
                    {inviteCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messenger FAB — bottom-left */}
      <button
        type="button"
        onClick={openMobileMessenger}
        aria-label="Open messenger"
        style={{ position: 'fixed', bottom: '0.4rem', left: '1.2rem' }}
        className="h-16 w-16 rounded-full bg-gradient-primary shadow-md hover:opacity-90 active:scale-95 transition-all z-40 flex items-center justify-center"
      >
        <MessageCircle size={30} strokeWidth={2} className="text-white" />
        {totalUnread > 0 && (
          <span
            style={{ position: 'absolute', top: '-4px', right: '-4px' }}
            className="min-w-[20px] h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[11px] flex items-center justify-center font-semibold border-2 border-background"
          >
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {/* Contacts FAB — bottom-right */}
      <button
        type="button"
        onClick={() => navigate('/contacts')}
        aria-label="View contacts"
        style={{ position: 'fixed', bottom: '0.4rem', right: '1.2rem' }}
        className="h-16 w-16 rounded-full bg-gradient-primary shadow-md hover:opacity-90 active:scale-95 transition-all z-40 flex items-center justify-center"
      >
        <Users size={28} strokeWidth={2} className="text-white" />
        {unseenContactCount > 0 && (
          <span
            style={{ position: 'absolute', top: '-4px', right: '-4px' }}
            className="h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-semibold"
          >
            {unseenContactCount}
          </span>
        )}
      </button>

      <ProfileCard open={showProfile} onOpenChange={setShowProfile} />
      
      <RoleChangeModal
        open={showRoleModal}
        onOpenChange={setShowRoleModal}
        currentRole={circleRole}
        onRoleChanged={reloadRole}
      />
    </div>
  );
}
