import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, AlertCircle, Ban, CheckCircle2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCircle } from '@/contexts/CircleContext';
import { connectionsManager } from '@/utils/connections';
import {
  getMyNotifications,
  markAllNotificationsRead,
  AppNotification,
} from '@/lib/api/notifications';

interface ContactNotification {
  id: string;
  text: string;
  time: string;
  avatarUrl: string;
  initials: string;
  isNew: boolean;
}

interface NotificationBellProps {
  align?: 'end' | 'center';
  modal?: boolean;
}

function notifIcon(type: string) {
  switch (type) {
    case 'moderation_warning':
      return { Icon: AlertTriangle, className: 'bg-warning/10 text-warning' };
    case 'moderation_restriction':
      return { Icon: AlertCircle, className: 'bg-warning/15 text-warning' };
    case 'moderation_ban':
      return { Icon: Ban, className: 'bg-destructive/10 text-destructive' };
    case 'moderation_restored':
      return { Icon: CheckCircle2, className: 'bg-success/10 text-success' };
    default:
      return { Icon: Bell, className: 'bg-muted text-muted-foreground' };
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Shared notification bell used by both the desktop Header and MobileHome.
 * Surfaces moderation (and any future) notifications from the notifications
 * table above the existing recent-contacts list, and rolls unread notifications
 * into the bell badge.
 */
export function NotificationBell({ align = 'end', modal = true }: NotificationBellProps) {
  const navigate = useNavigate();
  const { unseenContactCount } = useCircle();
  const [contacts, setContacts] = useState<ContactNotification[]>([]);
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isBellWobbling, setIsBellWobbling] = useState(false);

  const loadContacts = useCallback(async () => {
    try {
      const connections = await connectionsManager.getConnectionsAsync();
      const seenIds = connectionsManager.getSeenContactIds();
      setContacts(
        connections.slice(0, 5).map((conn) => ({
          id: conn.userId,
          text: `${conn.user.firstName} ${conn.user.lastName}`,
          time: new Date(conn.connectedAt).toLocaleDateString(),
          avatarUrl: (conn.user as any).profilePicture || '',
          initials: `${conn.user.firstName[0]}${conn.user.lastName[0]}`,
          isNew: !conn.isSeen && !seenIds.includes(conn.userId),
        })),
      );
    } catch {
      /* silent */
    }
  }, []);

  const loadAppNotifications = useCallback(async () => {
    const items = await getMyNotifications(10);
    setAppNotifications(items);
    setUnreadCount(items.filter((n) => !n.is_read).length);
  }, []);

  useEffect(() => {
    loadContacts();
    loadAppNotifications();
  }, [loadContacts, loadAppNotifications]);

  const handleOpenChange = async (open: boolean) => {
    if (open && unreadCount > 0) {
      setUnreadCount(0);
      await markAllNotificationsRead();
      setAppNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  const badgeCount = unseenContactCount + unreadCount;
  const hasContent = appNotifications.length > 0 || contacts.length > 0;

  return (
    <DropdownMenu modal={modal} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onMouseEnter={() => {
            setIsBellWobbling(false);
            requestAnimationFrame(() => setIsBellWobbling(true));
          }}
          onAnimationEnd={() => setIsBellWobbling(false)}
          className={`relative w-10 h-10 rounded-full bg-background neu-concave hover:neu-concave-pressed transition-shadow focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none${isBellWobbling ? ' bug-wobble' : ''}`}
        >
          <Bell className="h-5 w-5" />
          {badgeCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-semibold">
              {badgeCount > 9 ? '9+' : badgeCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-[calc(100vw-2rem)] md:w-80 bg-card z-[100] max-h-[420px] overflow-y-auto custom-scrollbar">
        <div className="p-3 border-b border-border">
          <h3 className="font-semibold">Notifications</h3>
          {unseenContactCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {unseenContactCount} new contact{unseenContactCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Moderation / app notifications */}
        {appNotifications.map((n) => {
          const { Icon, className } = notifIcon(n.type);
          return (
            <div key={n.id} className={`p-4 flex items-start gap-3 ${!n.is_read ? 'bg-primary/5' : ''}`}>
              <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${className}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{n.title}</p>
                {n.message && <p className="text-xs text-muted-foreground mt-0.5 break-words">{n.message}</p>}
                <p className="text-[11px] text-muted-foreground mt-1">{relativeTime(n.created_at)}</p>
              </div>
            </div>
          );
        })}

        {/* Recent contacts */}
        {contacts.map((notif) => (
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
                {notif.isNew ? 'New contact • ' : ''}
                {notif.time}
              </p>
            </div>
          </DropdownMenuItem>
        ))}

        {!hasContent && (
          <div className="p-4 text-center text-muted-foreground text-sm">No notifications yet</div>
        )}

        {contacts.length > 0 && (
          <div className="p-2 border-t border-border">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate('/contacts')}>
              View all contacts
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
