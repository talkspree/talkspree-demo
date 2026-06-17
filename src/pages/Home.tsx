import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { Header } from '@/components/home/Header';
import { CircleCard } from '@/components/home/CircleCard';
import { FiltersSection } from '@/components/home/FiltersSection';
import { MobileHome } from '@/components/home/MobileHome';
import { useCircle } from '@/contexts/CircleContext';
import { ExpandableContactsButton } from '@/components/home/ExpandableContactsButton';
import { PostJoinOverlay } from '@/components/circles/PostJoinOverlay';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { unseenContactCount } = useCircle();
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  // Shown right after a hub join: "Welcome to <circle>" → pick a role.
  const [showJoinOverlay, setShowJoinOverlay] = useState<boolean>(
    !!(location.state as { justJoined?: boolean } | null)?.justJoined,
  );

  const dismissJoinOverlay = () => {
    setShowJoinOverlay(false);
    // Clear the nav state so a refresh / back-nav doesn't re-trigger the overlay.
    navigate(location.pathname, { replace: true, state: {} });
  };

  // Safety net: clean up any stale matchmaking state when user is on the home page.
  // If they're here, they're not waiting or in a call.
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

  // Track orientation for tablet
  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mobile or tablet in portrait mode use MobileHome
  const width = window.innerWidth;
  const isTabletPortrait = width >= 768 && width <= 1024 && isPortrait;
  
  const content = (isMobile || isTabletPortrait) ? (
    <MobileHome />
  ) : (
    <div className="min-h-screen bg-gradient-subtle px-6 lg:px-16">
      <Header />
      <div className="h-[calc(100vh-88px)] bg-gradient-subtle">
        <div className="max-w-[1920px] pt-10 mx-auto h-full">
          <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 h-full min-h-0">
            {/* Left: Circle Info */}
            <div className="h-full min-h-0 custom-scrollbar">
              <CircleCard />
            </div>

            {/* Right: Filters */}
            <div className="h-full min-h-0">
              <FiltersSection />
            </div>
          </div>
        </div>

        {/* Expandable Connections Button (desktop) */}
        <ExpandableContactsButton unseenCount={unseenContactCount} />
      </div>
    </div>
  );

  return (
    <>
      {content}
      {showJoinOverlay && <PostJoinOverlay onDone={dismissJoinOverlay} />}
    </>
  );
}