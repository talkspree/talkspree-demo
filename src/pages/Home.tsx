import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Header } from '@/components/home/Header';
import { CircleCard } from '@/components/home/CircleCard';
import { FiltersSection } from '@/components/home/FiltersSection';
import { MobileHome } from '@/components/home/MobileHome';
import { useCircle } from '@/contexts/CircleContext';
import { ExpandableContactsButton } from '@/components/home/ExpandableContactsButton';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const isMobile = useIsMobile();
  const { unseenContactCount } = useCircle();
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

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
  
  if (isMobile || isTabletPortrait) {
    return <MobileHome />;
  }

  return (
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
}