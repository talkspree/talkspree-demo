import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Globe, Instagram, Facebook, Linkedin, Mail, Copy, MessageSquare, Info, User, Bell } from 'lucide-react';
import { FiltersSection } from './FiltersSection';
import { toast } from '@/hooks/use-toast';
import logo from '@/assets/logo.svg';
import headerPattern from '@/assets/header-pattern.png';
import profileViewIcon from '@/assets/profile-view.png';
import { useNavigate } from 'react-router-dom';
import { ProfileCard } from './ProfileCard';
import { connectionsManager } from '@/utils/connections';
import { getOrCreateDefaultCircle, getCircleMemberCounts } from '@/lib/api/circles';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileData } from '@/hooks/useProfileData';
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
  const [showProfile, setShowProfile] = useState(false);
  const [connectionNotifications, setConnectionNotifications] = useState<any[]>([]);
  const [newContactsCount, setNewContactsCount] = useState(0);
  const [viewedContactsCount, setViewedContactsCount] = useState(0);

  // Get actual user counts
  const [totalMembers, setTotalMembers] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);

  // Fetch real member counts from database
  useEffect(() => {
    const updateMemberCounts = async () => {
      try {
        const circle = await getOrCreateDefaultCircle();
        const counts = await getCircleMemberCounts(circle.id);
        
        // Use only real users (no sample users)
        setOnlineCount(counts.online);
        setTotalMembers(counts.total);
      } catch (error) {
        console.error('Error fetching circle member counts:', error);
        setOnlineCount(0);
        setTotalMembers(0);
      }
    };
    
    updateMemberCounts();
    const interval = setInterval(updateMemberCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update connection notifications and new contacts count
  useEffect(() => {
    const updateNotifications = () => {
      const connections = connectionsManager.getConnections();
      const newConnections = connections
        .slice(-5)
        .reverse()
        .map(conn => ({
          id: conn.userId,
          text: `New connection: ${conn.user.firstName} ${conn.user.lastName}`,
          time: new Date(conn.connectedAt).toLocaleDateString(),
        }));
      setConnectionNotifications(newConnections);
      
      // Update new contacts count
      const totalContacts = connections.length;
      const newCount = Math.max(0, totalContacts - viewedContactsCount);
      setNewContactsCount(newCount);
    };
    
    updateNotifications();
    const interval = setInterval(updateNotifications, 2000);
    
    return () => clearInterval(interval);
  }, [viewedContactsCount]);

  const notifications = connectionNotifications;

  const circleData = {
    name: 'Mentor the Young',
    members: totalMembers.toString(),
    online: onlineCount.toString(),
    bio: 'Mentor the Young Bulgaria is a nonprofit organization dedicated to empowering young individuals through mentorship programs. We connect experienced professionals with ambitious youth to foster personal and professional growth.',
    inviteLink: 'http://talkspree.com/mentortheyoung/136872/invite',
    socials: {
      website: 'https://example.com',
      instagram: 'https://instagram.com',
      facebook: 'https://facebook.com',
      linkedin: 'https://linkedin.com',
      email: 'mailto:info@example.com'
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
              <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full">
                <Bell className="h-5 w-5" />
                {connectionNotifications.length > 0 && (
                  <span className="absolute top-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-background" />
                )}
              </Button>
            </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-[calc(100vw-2rem)] md:w-80 bg-card z-[100] max-h-[400px] overflow-y-auto">
                <div className="p-3 border-b border-border">
                  <h3 className="font-semibold">Notifications</h3>
                </div>
                {notifications.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <DropdownMenuItem 
                      key={notif.id} 
                      className="p-4 cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate('/contacts');
                      }}
                    >
                      <div>
                        <p className="text-sm">{notif.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full p-0 ml-2">
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
        <div className="h-32 bg-gradient-primary relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyIiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMiIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')] opacity-30" />
        </div>

        {/* Profile Section */}
        <div className="px-4 -mt-16 pb-4">
          {/* Avatar */}
          <div className="flex justify-center mb-3">
            <Avatar className="h-28 w-28 border-4 border-background shadow-lg">
              <AvatarImage src="" />
              <AvatarFallback className="bg-warning text-warning-foreground text-2xl font-semibold">
                M
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
          setViewedContactsCount(connectionsManager.getConnections().length);
          setNewContactsCount(0);
          navigate('/contacts');
        }}
      >
        <img src={profileViewIcon} alt="Contacts" className="h-7 w-7" />
        {newContactsCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-semibold">
            {newContactsCount}
          </span>
        )}
      </Button>

      <ProfileCard open={showProfile} onOpenChange={setShowProfile} />
    </div>
  );
}
