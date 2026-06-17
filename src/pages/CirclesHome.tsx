import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, MessageCircle } from 'lucide-react';
import { Header } from '@/components/home/Header';
import { HubMobileHeader } from '@/components/circles/HubMobileHeader';
import { ExpandableContactsButton } from '@/components/home/ExpandableContactsButton';
import { YourCirclesSection } from '@/components/circles/YourCirclesSection';
import { DiscoverSection } from '@/components/circles/DiscoverSection';
import { CirclePreviewModal } from '@/components/circles/CirclePreviewModal';
import { JoinCircleModal } from '@/components/circles/JoinCircleModal';
import type { CircleCardData } from '@/components/circles/types';
import {
  getMyCircles,
  getDiscoverableCircles,
  getCircleMemberCounts,
  joinCircleById,
  type JoinCircleResult,
} from '@/lib/api/circles';
import { useDevice } from '@/hooks/useDevice';
import { useCircle } from '@/contexts/CircleContext';
import { useChat } from '@/contexts/ChatContext';
import { circlePath } from '@/lib/navigation';
import { toast } from '@/hooks/use-toast';

export default function CirclesHome() {
  const navigate = useNavigate();
  const device = useDevice();
  const isMobile = device === 'mobile';
  const { unseenContactCount } = useCircle();
  const { totalUnread, openMobileMessenger } = useChat();

  const [myCircles, setMyCircles] = useState<CircleCardData[]>([]);
  const [discover, setDiscover] = useState<CircleCardData[]>([]);
  const [loadingMine, setLoadingMine] = useState(true);
  const [loadingDiscover, setLoadingDiscover] = useState(true);

  const [previewCircle, setPreviewCircle] = useState<CircleCardData | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinTarget, setJoinTarget] = useState<CircleCardData | null>(null);
  const [joiningFree, setJoiningFree] = useState(false);

  const loadAll = useCallback(async () => {
    setLoadingMine(true);
    try {
      const rows = await getMyCircles();
      const cards = await Promise.all(
        (rows ?? []).map(async (r: any) => {
          const c = r.circles;
          if (!c) return null;
          const counts = await getCircleMemberCounts(c.id).catch(() => ({ total: 0, online: 0 }));
          return {
            id: c.id,
            name: c.name,
            description: c.description,
            logo_url: c.logo_url,
            cover_image_url: c.cover_image_url,
            abbreviation: c.abbreviation,
            visibility: c.visibility,
            memberCount: counts.total,
            onlineCount: counts.online,
            role: r.role,
          } as CircleCardData;
        }),
      );
      setMyCircles(cards.filter(Boolean) as CircleCardData[]);
    } catch (e) {
      console.error('CirclesHome: failed to load your circles', e);
    } finally {
      setLoadingMine(false);
    }

    setLoadingDiscover(true);
    try {
      const d = await getDiscoverableCircles();
      setDiscover(d as CircleCardData[]);
    } catch (e) {
      console.error('CirclesHome: failed to load discover circles', e);
    } finally {
      setLoadingDiscover(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openGenericJoin = () => {
    setJoinTarget(null);
    setJoinOpen(true);
  };

  const handleJoined = (circle: CircleCardData, result: JoinCircleResult) => {
    setJoinOpen(false);
    setJoinTarget(null);
    setPreviewCircle(null);

    if (result === 'pending') {
      toast({
        title: 'Request sent',
        description: `Your request to join ${circle.name} is pending approval.`,
      });
      loadAll();
      return;
    }
    if (result === 'already-member') {
      toast({ title: "You're already a member", description: `Taking you to ${circle.name}.` });
      navigate(circlePath(circle.abbreviation));
      return;
    }
    // Freshly joined: hop to the circle page and let it run the welcome/role overlay.
    navigate(circlePath(circle.abbreviation), { state: { justJoined: true } });
  };

  const handleJoinFree = async (circle: CircleCardData) => {
    setJoiningFree(true);
    try {
      const result = await joinCircleById(circle.id);
      handleJoined(circle, result);
    } catch (e: any) {
      toast({
        title: 'Could not join',
        description: e?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setJoiningFree(false);
    }
  };

  const handleJoinViaLink = (circle: CircleCardData) => {
    setPreviewCircle(null);
    setJoinTarget(circle);
    setJoinOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle px-4 sm:px-6 lg:px-16">
      {isMobile ? <HubMobileHeader /> : <Header showRolePill={false} />}

      <main className={`max-w-6xl mx-auto pb-4 ${isMobile ? 'pt-20' : 'pt-6 sm:pt-10'}`}>
        <YourCirclesSection circles={myCircles} loading={loadingMine} onJoinClick={openGenericJoin} />

        <div className="h-[2px] bg-gray-200/70 w-full my-4 sm:my-4 rounded-full" />

        <DiscoverSection circles={discover} loading={loadingDiscover} onSelect={setPreviewCircle} />
      </main>

      {/* Messenger FAB — bottom-left (mobile only) */}
      {isMobile && (
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
      )}

      {/* Contacts entry point */}
      {isMobile ? (
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
      ) : (
        <ExpandableContactsButton unseenCount={unseenContactCount} />
      )}

      <CirclePreviewModal
        circle={previewCircle}
        isOpen={!!previewCircle}
        onClose={() => setPreviewCircle(null)}
        onJoinViaLink={handleJoinViaLink}
        onJoinFree={handleJoinFree}
        joining={joiningFree}
      />

      <JoinCircleModal
        isOpen={joinOpen}
        onClose={() => {
          setJoinOpen(false);
          setJoinTarget(null);
        }}
        targetCircle={joinTarget}
        onJoined={handleJoined}
      />
    </div>
  );
}
