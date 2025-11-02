import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Globe, Instagram, Facebook, Linkedin, Mail, Copy, MessageSquare, Info, Bell, User } from 'lucide-react';
import { FiltersSection } from './FiltersSection';
import { toast } from '@/hooks/use-toast';
import logo from '@/assets/logo.svg';
import headerPattern from '@/assets/header-pattern.png';
import { useNavigate } from 'react-router-dom';
import { ProfileCard } from './ProfileCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function MobileHome() {
  const [activeTab, setActiveTab] = useState<'chat' | 'about'>('chat');
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);

  const notifications = [
    { id: 1, text: 'New match request from John', time: '2m ago' },
    { id: 2, text: 'Your session with Sarah starts in 10 minutes', time: '8m ago' },
  ];

  const circleData = {
    name: 'Mentor the Young',
    members: '7.5k',
    online: '120',
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
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 px-4">
        <div className="h-full bg-card/95 backdrop-blur-md border-b border-border flex items-center justify-between px-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: `url(${headerPattern})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <button onClick={() => navigate('/')} className="focus:outline-none relative z-10">
            <img src={logo} alt="TalkSpree" className="h-5" />
          </button>

          <div className="flex items-center gap-2 relative z-10">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                  <Bell className="h-4 w-4" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-card">
                <div className="p-3 border-b border-border">
                  <h3 className="font-semibold">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notif) => (
                    <DropdownMenuItem key={notif.id} className="p-4 cursor-pointer">
                      <div>
                        <p className="text-sm">{notif.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card">
                <DropdownMenuItem onClick={() => setShowProfile(true)} className="cursor-pointer">
                  View Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/auth')} className="cursor-pointer">
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
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-glow bg-gradient-primary hover:opacity-90 z-40 p-0"
        onClick={() => console.log('Navigate to contacts')}
      >
        <MessageSquare className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-semibold">
          1
        </span>
      </Button>

      <ProfileCard open={showProfile} onOpenChange={setShowProfile} />
    </div>
  );
}
