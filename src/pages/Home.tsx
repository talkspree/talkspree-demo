import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { Header } from '@/components/home/Header';
import { CircleCard } from '@/components/home/CircleCard';
import { FiltersSection } from '@/components/home/FiltersSection';
import { MobileHome } from '@/components/home/MobileHome';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (isMobile) {
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
          className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-glow bg-gradient-primary hover:opacity-90"
          onClick={() => navigate('/contacts')}
        >
          <Users className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-semibold">
            1
          </span>
        </Button>
      </div>
    </div>
  );
}