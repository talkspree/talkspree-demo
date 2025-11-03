import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Header } from '@/components/home/Header';
import { CircleCard } from '@/components/home/CircleCard';
import { FiltersSection } from '@/components/home/FiltersSection';
import { MobileHome } from '@/components/home/MobileHome';
import { Button } from '@/components/ui/button';
import profileViewIcon from '@/assets/profile-view.png';
import { connectionsManager } from '@/utils/connections';

export default function Home() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [newContactsCount, setNewContactsCount] = useState(0);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  const [viewedContactsCount, setViewedContactsCount] = useState(0);

  // Track new contacts
  useEffect(() => {
    const updateContactsCount = () => {
      const totalContacts = connectionsManager.getConnections().length;
      const newCount = Math.max(0, totalContacts - viewedContactsCount);
      setNewContactsCount(newCount);
    };
    
    updateContactsCount();
    const interval = setInterval(updateContactsCount, 2000);
    
    return () => clearInterval(interval);
  }, [viewedContactsCount]);

  // Reset notification count when navigating to contacts
  const handleContactsClick = () => {
    setViewedContactsCount(connectionsManager.getConnections().length);
    setNewContactsCount(0);
    navigate('/contacts');
  };

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
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      <div className="h-[calc(100vh-88px)] bg-gradient-subtle overflow-hidden">
        <div className="max-w-[1920px] mx-auto px-6 lg:px-12 pt-10 h-full">
          <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 h-full">
            {/* Left: Circle Info */}
            <div className="h-full overflow-y-auto">
              <CircleCard />
            </div>

            {/* Right: Filters */}
            <div className="h-full overflow-y-auto">
              <FiltersSection />
            </div>
          </div>
        </div>

        {/* Floating My Contacts Button */}
        <Button
          size="lg"
          className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-glow bg-gradient-primary hover:opacity-90 p-0 flex items-center justify-center"
          onClick={handleContactsClick}
        >
          <img src={profileViewIcon} alt="Contacts" className="h-7 w-7" />
          {newContactsCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-semibold">
              {newContactsCount}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}