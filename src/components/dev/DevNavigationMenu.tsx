// ⚠️ TEMPORARY DEV COMPONENT - DELETE BEFORE PRODUCTION ⚠️
// This component provides quick navigation between pages for testing purposes
// To remove: Simply delete this file and remove the import from App.tsx

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Menu, Home, Phone, Users, UserCircle, Settings, X, Bell } from 'lucide-react';
import { connectionsManager } from '@/utils/connections';

export function DevNavigationMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Check for new connections
  useEffect(() => {
    const updateNotifications = () => {
      setNotificationCount(connectionsManager.getNewConnectionsCount());
    };
    
    updateNotifications();
    
    // Update every second to catch new connections
    const interval = setInterval(updateNotifications, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const pages = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/auth', label: 'Auth', icon: UserCircle },
    { path: '/onboarding', label: 'Onboarding', icon: Settings },
    { path: '/call', label: 'Call', icon: Phone },
    { path: '/wrap-up', label: 'Wrap Up', icon: Bell },
    { path: '/contacts', label: 'Contacts', icon: Users },
    { path: '/waiting', label: 'Waiting Room', icon: Menu },
    { path: '/profile/edit', label: 'Profile Edit', icon: UserCircle },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
    
    // Clear notifications when navigating to contacts
    if (path === '/contacts') {
      connectionsManager.clearNewConnectionsCount();
      setNotificationCount(0);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {isOpen && (
        <Card className="mb-4 p-4 shadow-lg border-2 border-primary/20 bg-card/95 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-primary">🚧 Dev Navigation</h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2 min-w-[180px]">
            {pages.map(({ path, label, icon: Icon }) => (
              <Button
                key={path}
                variant={location.pathname === path ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleNavigate(path)}
                className="w-full justify-start text-sm"
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </Button>
            ))}
          </div>
        </Card>
      )}
      
      <Button
        size="lg"
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full shadow-glow bg-warning hover:bg-warning/90 relative"
        title="Dev Navigation Menu"
      >
        <Menu className="h-6 w-6" />
        {notificationCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-destructive text-white text-xs font-bold flex items-center justify-center">
            {notificationCount}
          </span>
        )}
      </Button>
    </div>
  );
}
