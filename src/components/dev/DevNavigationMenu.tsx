// ⚠️ TEMPORARY DEV COMPONENT - DELETE BEFORE PRODUCTION ⚠️
// This component provides quick navigation between pages for testing purposes
// To remove: Simply delete this file and remove the import from App.tsx

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Menu, Home, Phone, Users, UserCircle, Settings, X, Bell, Monitor, Tablet, Smartphone } from 'lucide-react';
import { connectionsManager } from '@/utils/connections';
import { useCircle } from '@/contexts/CircleContext';
import { useDevViewport, type ViewportMode } from './DevViewportContext';

const MODES: { value: ViewportMode; label: string; icon: typeof Monitor }[] = [
  { value: 'mobile', label: 'Mobile', icon: Smartphone },
  { value: 'tablet', label: 'Tablet', icon: Tablet },
  { value: 'desktop', label: 'Desktop', icon: Monitor },
];

function ViewportToggle() {
  const { mode, setMode } = useDevViewport();

  const activeIdx = MODES.findIndex((m) => m.value === mode);

  return (
    <div className="px-1 py-2">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 px-1">
        Viewport
      </p>
      <div className="relative flex h-8 rounded-full bg-muted/60 p-0.5">
        {/* Sliding indicator */}
        <div
          className="absolute top-0.5 h-7 rounded-full bg-primary transition-all duration-200 ease-out"
          style={{
            width: `calc(${100 / MODES.length}% - 2px)`,
            left: `calc(${(activeIdx * 100) / MODES.length}% + 1px)`,
          }}
        />
        {MODES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setMode(value)}
            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-colors duration-200 ${
              mode === value
                ? 'text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden min-[0px]:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function DevNavigationMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { adminType, loading } = useCircle();

  // Only show to super admins
  const isSuperAdmin = adminType === 'super_admin';

  useEffect(() => {
    const updateNotifications = () => {
      setNotificationCount(connectionsManager.getNewConnectionsCount());
    };
    
    updateNotifications();
    const interval = setInterval(updateNotifications, 1000);
    return () => clearInterval(interval);
  }, []);

  // Hide entirely for non-superadmins (or while loading)
  if (loading || !isSuperAdmin) return null;

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
    if (path === '/contacts') {
      connectionsManager.clearNewConnectionsCount();
      setNotificationCount(0);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-[9999]">
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

          {/* Three-way viewport toggle */}
          <ViewportToggle />

          <div className="my-2 border-t border-border" />

          <div className="space-y-2 min-w-[220px]">
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
