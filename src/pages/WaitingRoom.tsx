import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Users, Clock } from 'lucide-react';
import { AdaptiveLayout } from '@/components/layouts/AdaptiveLayout';
import { sampleUserManager } from '@/data/sampleUsers';
import { useProfileData } from '@/hooks/useProfileData';

export default function WaitingRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profileData } = useProfileData();
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
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-4xl w-full p-6 md:p-8 glass shadow-apple-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mb-4 animate-pulse">
              <Loader2 className="h-10 w-10 text-white animate-spin" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Finding Your Match...</h1>
            <p className="text-muted-foreground">
              We're connecting you with someone who matches your preferences
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-muted/50 rounded-2xl p-4 text-center">
              <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{matchingUsers}</div>
              <div className="text-sm text-muted-foreground">Available Now</div>
            </div>
            <div className="bg-muted/50 rounded-2xl p-4 text-center">
              <Users className="h-6 w-6 mx-auto mb-2 text-warning" />
              <div className="text-2xl font-bold">{chattingUsers}</div>
              <div className="text-sm text-muted-foreground">Currently Chatting</div>
            </div>
            <div className="bg-muted/50 rounded-2xl p-4 text-center">
              <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">~{estimatedWait}s</div>
              <div className="text-sm text-muted-foreground">Estimated Wait</div>
            </div>
          </div>

          {/* Game Section */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4 text-center">
              Play while you wait!
            </h2>
            <div className="bg-background rounded-2xl overflow-hidden border-2 border-border shadow-inner">
              <iframe
                src="/match-dash.html"
                className="w-full h-[400px] md:h-[500px]"
                title="Interest Dash"
                style={{ border: 'none' }}
              />
            </div>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Press Space or Tap to Jump • Collect matching interests!
            </p>
          </div>

          {/* Cancel Button */}
          <div className="flex justify-center">
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
