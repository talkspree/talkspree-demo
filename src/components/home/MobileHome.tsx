import { useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Globe, Instagram, Facebook, Linkedin, Mail, Copy, MessageSquare, Info, User, Bell, Shield } from 'lucide-react';
import { FiltersSection } from './FiltersSection';
import { toast } from '@/hooks/use-toast';
import logo from '@/assets/logo.svg';
import headerPattern from '@/assets/header-pattern.png';
import profileViewIcon from '@/assets/profile-view.png';
import { useNavigate } from 'react-router-dom';
import { ProfileCard } from './ProfileCard';
import { RoleChangeModal } from './RoleChangeModal';
import { connectionsManager } from '@/utils/connections';
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

export function MobileHome() {
  const [activeTab, setActiveTab] = useState<'chat' | 'about'>('chat');
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { profileData } = useProfileData();
  const { circle: contextCircle, role: circleRole, isAdmin, memberCounts, loading: roleLoading, reloadRole, unseenContactCount } = useCircle();
  const [showProfile, setShowProfile] = useState(false);

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
  const [connectionNotifications, setConnectionNotifications] = useState<any[]>([]);

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

  // Load recent connections for notifications (once on mount, no polling)
  const loadNotifications = useCallback(async () => {
    try {
      const connections = await connectionsManager.getConnectionsAsync();
      const seenIds = connectionsManager.getSeenContactIds();
      const recentConnections = connections
        .slice(0, 5)
        .map(conn => ({
          id: conn.userId,
          text: `${conn.user.firstName} ${conn.user.lastName}`,
          time: new Date(conn.connectedAt).toLocaleDateString(),
          avatarUrl: (conn.user as any).profilePicture || '',
          initials: `${conn.user.firstName[0]}${conn.user.lastName[0]}`,
          isNew: !conn.isSeen && !seenIds.includes(conn.userId),
        }));
      setConnectionNotifications(recentConnections);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const notifications = connectionNotifications;

  const circleData = {
    name: contextCircle?.name || 'Mentor the Young',
    members: totalMembers.toString(),
    online: onlineCount.toString(),
    bio: contextCircle?.description || 'Mentor the Young Bulgaria is a nonprofit organization dedicated to empowering young individuals through mentorship programs. We connect experienced professionals with ambitious youth to foster personal and professional growth.',
    inviteLink: `https://talkspree.com/${contextCircle?.invite_code || 'mentortheyoung'}/invite`,
    logoUrl: contextCircle?.logo_url || '',
    socials: {
      website: contextCircle?.social_links?.website || 'https://example.com',
      instagram: contextCircle?.social_links?.instagram || 'https://instagram.com',
      facebook: contextCircle?.social_links?.facebook || 'https://facebook.com',
      linkedin: contextCircle?.social_links?.linkedin || 'https://linkedin.com',
      email: contextCircle?.social_links?.email || 'mailto:info@example.com',
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(circleData.inviteLink);
    toast({ description: 'Invite link copied!' });
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14">
        <div className="h-full bg-card/95 backdrop-blur-md border-b border-border flex items-center justify-between px-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-40 md:rounded-2xl" style={{ backgroundImage: `url(${headerPattern})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <button onClick={() => navigate('/')} className="focus:outline-none relative z-10">
            <img src={logo} alt="TalkSpree" className="h-5" />
          </button>

          <div className="flex items-center gap-2 relative z-10">
          {/* Notifications */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none">
                <Bell className="h-5 w-5" />
                {unseenContactCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-semibold">
                    {unseenContactCount > 9 ? '9+' : unseenContactCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-[calc(100vw-2rem)] md:w-80 bg-card z-[100] max-h-[400px] overflow-y-auto custom-scrollbar">
                <div className="p-3 border-b border-border">
                  <h3 className="font-semibold">Notifications</h3>
                  {unseenContactCount > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">{unseenContactCount} new contact{unseenContactCount !== 1 ? 's' : ''}</p>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No contacts yet
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <DropdownMenuItem 
                      key={notif.id} 
                      className={`p-4 cursor-pointer flex items-center gap-3 ${notif.isNew ? 'bg-primary/5' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate('/contacts');
                      }}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={notif.avatarUrl} />
                          <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm">
                            {notif.initials}
                          </AvatarFallback>
                        </Avatar>
                        {notif.isNew && (
                          <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary border-2 border-card" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{notif.text}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {notif.isNew ? 'New contact • ' : ''}{notif.time}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
                {notifications.length > 0 && (
                  <div className="p-2 border-t border-border">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full"
                      onClick={() => navigate('/contacts')}
                    >
                      View all contacts
                    </Button>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full p-0 ml-2 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none">
                  <Avatar className="h-10 w-10">
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
              <DropdownMenuContent align="end" className="w-48 bg-card z-[100]">
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
                  <Avatar className={`h-6 w-6 ${isAdminRole ? 'border border-white/30' : 'border border-border/50'}`}>
                    <AvatarImage src={profileData.profilePicture} alt="Profile" />
                    <AvatarFallback className={`text-xs ${isAdminRole ? 'bg-white/20' : 'bg-muted'}`}>
                      {profileData.firstName?.[0]}{profileData.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
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
                  <div className="flex-1 px-3 py-2 bg-muted/50 rounded-lg text-xs truncate">
                    {circleData.inviteLink}
                  </div>
                  <Button size="icon" variant="outline" onClick={copyInviteLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Contacts Button */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-glow bg-gradient-primary hover:opacity-90 z-40 p-0 flex items-center justify-center"
        onClick={() => {
          // Navigate to contacts - notifications will be cleared when the page loads
          navigate('/contacts');
        }}
      >
        <img src={profileViewIcon} alt="Contacts" className="h-7 w-7" />
        {unseenContactCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-semibold">
            {unseenContactCount}
          </span>
        )}
      </Button>

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
