import { Bell, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevice } from '@/hooks/useDevice';
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
import { connectionsManager } from '@/utils/connections';

export function Header() {
  const navigate = useNavigate();
  const device = useDevice();
  const [showProfile, setShowProfile] = useState(false);
  const [connectionNotifications, setConnectionNotifications] = useState<any[]>([]);

  useEffect(() => {
    // Update connection notifications
    const updateNotifications = () => {
      const connections = connectionsManager.getConnections();
      const newConnections = connections
        .slice(-5) // Get last 5 connections
        .reverse()
        .map(conn => ({
          id: conn.userId,
          text: `New connection: ${conn.user.firstName} ${conn.user.lastName}`,
          time: new Date(conn.connectedAt).toLocaleDateString(),
        }));
      setConnectionNotifications(newConnections);
    };
    
    updateNotifications();
    const interval = setInterval(updateNotifications, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const notifications = connectionNotifications;

  return (
    <>
      <header className="h-16 sticky top-4 z-50 px-6">
        <div className="h-full max-w-[1920px] mx-auto bg-card/95 backdrop-blur-md rounded-full border border-border shadow-apple-md flex items-center justify-between px-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: `url(${headerPattern})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <button onClick={() => navigate('/')} className="focus:outline-none relative z-10">
            <img src={logo} alt="TalkSpree" className={device === 'mobile' ? 'h-5' : 'h-6'} />
          </button>

          <div className="flex items-center gap-3 relative z-10">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
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
                    <DropdownMenuItem 
                      key={notif.id} 
                      className="p-4 cursor-pointer"
                      onClick={() => navigate('/contacts')}
                    >
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
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                      <User className="h-5 w-5" />
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

      <ProfileCard open={showProfile} onOpenChange={setShowProfile} />
    </>
  );
}
