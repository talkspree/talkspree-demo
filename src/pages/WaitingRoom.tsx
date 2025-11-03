import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Users, Clock } from 'lucide-react';
import { AdaptiveLayout } from '@/components/layouts/AdaptiveLayout';
import { sampleUserManager } from '@/data/sampleUsers';
import { useProfileData } from '@/hooks/useProfileData';
import { useIsMobile } from '@/hooks/use-mobile';

export default function WaitingRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profileData } = useProfileData();
  const isMobile = useIsMobile();
  const [matchingUsers, setMatchingUsers] = useState(0);
  const [chattingUsers, setChattingUsers] = useState(0);
  const [estimatedWait, setEstimatedWait] = useState(45);
  
  // Get filters from navigation state
  const filters = location.state as { 
    role?: string; 
    similarity?: number;
    topic?: string;
    duration?: number;
  } || {};

  // Calculate interest similarity
  const calculateSimilarity = (interests1: string[], interests2: string[]): number => {
    if (interests1.length === 0 || interests2.length === 0) return 0;
    const common = interests1.filter(i => interests2.includes(i)).length;
    const total = new Set([...interests1, ...interests2]).size;
    return Math.round((common / total) * 100);
  };

  // Check for available matches
  const checkForMatch = () => {
    const availableUsers = sampleUserManager.getAvailableUsers();
    
    // Filter by role if specified
    let candidates = availableUsers;
    if (filters.role && filters.role !== 'random') {
      candidates = candidates.filter(u => u.role === filters.role);
    }

    // Calculate similarity scores
    const candidatesWithScores = candidates.map(user => ({
      user,
      similarityScore: calculateSimilarity(profileData.interests, user.interests)
    }));

    // Filter by similarity preference
    let filtered = candidatesWithScores;
    if (filters.similarity === 0) {
      filtered = candidatesWithScores.filter(c => c.similarityScore <= 40);
    } else if (filters.similarity === 100) {
      filtered = candidatesWithScores.filter(c => c.similarityScore >= 60);
    }

    if (filtered.length === 0 && candidatesWithScores.length > 0) {
      filtered = candidatesWithScores;
    }

    setMatchingUsers(filtered.length);
    
    // Count chatting users (occupied users that match filters)
    const occupiedUsers = sampleUserManager.getOccupiedUsers();
    let chattingCandidates = occupiedUsers;
    if (filters.role && filters.role !== 'random') {
      chattingCandidates = chattingCandidates.filter(u => u.role === filters.role);
    }
    
    const chattingWithScores = chattingCandidates.map(user => ({
      user,
      similarityScore: calculateSimilarity(profileData.interests, user.interests)
    }));
    
    let chattingFiltered = chattingWithScores;
    if (filters.similarity === 0) {
      chattingFiltered = chattingWithScores.filter(c => c.similarityScore <= 40);
    } else if (filters.similarity === 100) {
      chattingFiltered = chattingWithScores.filter(c => c.similarityScore >= 60);
    }
    
    setChattingUsers(chattingFiltered.length);

    // If match found, navigate to countdown
    if (filtered.length > 0) {
      const match = filtered[Math.floor(Math.random() * filtered.length)];
      navigate('/countdown', {
        state: {
          matchedUser: match.user,
          ...filters
        },
        replace: true
      });
    }
  };

  useEffect(() => {
    // Check for matches every 5 seconds
    const interval = setInterval(checkForMatch, 5000);
    checkForMatch(); // Initial check

    return () => clearInterval(interval);
  }, [filters]);

  return (
    <AdaptiveLayout>
      <div className="h-screen flex items-center justify-center p-4 overflow-hidden">
        <Card className="max-w-4xl w-full h-[95vh] flex flex-col p-4 md:p-6 glass shadow-apple-lg">
          {/* Header */}
          <div className="text-center mb-4 flex-shrink-0">
            <div className="mx-auto w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-primary flex items-center justify-center mb-3 animate-pulse">
              <Loader2 className="h-8 w-8 md:h-10 md:w-10 text-white animate-spin" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Finding Your Match...</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              We're connecting you with someone who matches your preferences
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 flex-shrink-0">
            <div className="bg-muted/50 rounded-2xl p-2 md:p-4 text-center">
              <Users className="h-4 w-4 md:h-6 md:w-6 mx-auto mb-1 md:mb-2 text-primary" />
              <div className="text-lg md:text-2xl font-bold">{matchingUsers}</div>
              <div className="text-xs md:text-sm text-muted-foreground">Available Now</div>
            </div>
            <div className="bg-muted/50 rounded-2xl p-2 md:p-4 text-center">
              <Users className="h-4 w-4 md:h-6 md:w-6 mx-auto mb-1 md:mb-2 text-warning" />
              <div className="text-lg md:text-2xl font-bold">{chattingUsers}</div>
              <div className="text-xs md:text-sm text-muted-foreground">Currently Chatting</div>
            </div>
            <div className="bg-muted/50 rounded-2xl p-2 md:p-4 text-center">
              <Clock className="h-4 w-4 md:h-6 md:w-6 mx-auto mb-1 md:mb-2 text-primary" />
              <div className="text-lg md:text-2xl font-bold">~{estimatedWait}s</div>
              <div className="text-xs md:text-sm text-muted-foreground">Estimated Wait</div>
            </div>
          </div>

          {/* Game Section - Hidden on mobile */}
          {!isMobile && (
            <div className="mb-4 flex-1 min-h-0 flex flex-col">
              <h2 className="text-lg md:text-xl font-semibold mb-2 text-center flex-shrink-0">
                Play while you wait!
              </h2>
              <div className="bg-background rounded-2xl overflow-hidden border-2 border-border shadow-inner flex-1">
                <iframe
                  src="/match-dash.html"
                  className="w-full h-full"
                  title="Interest Dash"
                  style={{ border: 'none' }}
                />
              </div>
              <p className="text-xs md:text-sm text-muted-foreground text-center mt-2 flex-shrink-0">
                Press Space or Tap to Jump • Collect matching interests!
              </p>
            </div>
          )}

          {/* Cancel Button */}
          <div className="flex justify-center flex-shrink-0">
            <Button
              variant="destructive"
              onClick={() => navigate('/')}
              className="transition-spring"
            >
              Cancel & Return Home
            </Button>
          </div>
        </Card>
      </div>
    </AdaptiveLayout>
  );
}
