import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SampleUser, sampleUserManager } from '@/data/sampleUsers';
import { interests } from '@/data/interests';
import { connectionsManager } from '@/utils/connections';
import { AboutMeSection } from '@/components/profile/AboutMeSection';
import { ReportModal } from '@/components/call/ReportModal';
import { useProfileData } from '@/hooks/useProfileData';

export default function WrapUp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profileData } = useProfileData();
  const matchedUser = location.state?.matchedUser as SampleUser | undefined;
  const [decision, setDecision] = useState<'connect' | 'skip' | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  if (!matchedUser) {
    navigate('/');
    return null;
  }

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const userInterests = matchedUser.interests
    .map(id => interests.find(i => i.id === id))
    .filter(Boolean);

  const handleConnect = () => {
    setDecision('connect');
    connectionsManager.addConnection(matchedUser);
  };

  const handleSkip = () => {
    setDecision('skip');
  };

  const handleNext = () => {
    // Calculate interest similarity
    const calculateSimilarity = (interests1: string[], interests2: string[]): number => {
      if (interests1.length === 0 || interests2.length === 0) return 0;
      const common = interests1.filter(i => interests2.includes(i)).length;
      const total = new Set([...interests1, ...interests2]).size;
      return Math.round((common / total) * 100);
    };
    
    // Get available users
    const availableUsers = sampleUserManager.getAvailableUsers();
    
    // Apply filters from location state
    let candidates = availableUsers;
    const filters = location.state || {};
    
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
    
    if (filtered.length > 0) {
      // Match found - go to countdown
      const match = filtered[Math.floor(Math.random() * filtered.length)];
      navigate('/countdown', { 
        state: { 
          matchedUser: match.user,
          ...filters
        },
        replace: true 
      });
    } else {
      // No match - go to waiting room
      navigate('/waiting', { 
        state: filters,
        replace: true 
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-card rounded-3xl shadow-apple-lg border border-border overflow-hidden">
        {/* Header with Report Button */}
        <div className="p-6 border-b border-border relative">
          <h1 className="text-2xl font-bold text-center">Call Ended</h1>
          <Button
            size="sm"
            variant="destructive"
            className="absolute right-6 top-6"
            onClick={() => setShowReportModal(true)}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Report
          </Button>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 p-6">
            {/* Profile Section */}
            <div className="flex items-start gap-6">
              <Avatar className="h-32 w-32 shrink-0">
                <AvatarImage src="" />
                <AvatarFallback className="bg-warning text-warning-foreground text-3xl">
                  {matchedUser.firstName[0]}{matchedUser.lastName[0]}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold mb-3">{matchedUser.firstName} {matchedUser.lastName}</h2>
                  <AboutMeSection
                    role={matchedUser.role}
                    occupation={matchedUser.occupation}
                    industry={matchedUser.industry}
                    studyField={matchedUser.studyField}
                    university={matchedUser.university}
                    age={calculateAge(matchedUser.dateOfBirth)}
                    gender={matchedUser.gender}
                    location={matchedUser.location}
                    className="text-muted-foreground"
                  />
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Bio</h4>
                  <p className="text-sm text-muted-foreground">
                    {matchedUser.bio}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Interests</h4>
                  <div className="flex flex-wrap gap-2">
                    {userInterests.map((interest) => (
                      <Badge key={interest!.id} variant="secondary">
                        {interest!.emoji} {interest!.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex gap-3 p-6 pt-0">
          {decision === null ? (
            <>
              <Button
                size="lg"
                className="flex-1 bg-success hover:bg-success/90 text-white"
                onClick={handleConnect}
              >
                Connect
              </Button>
              <Button
                size="lg"
                className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
                onClick={handleSkip}
              >
                Skip
              </Button>
            </>
          ) : (
            <>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/')}
              >
                Back to Circle
              </Button>
              <Button
                size="lg"
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={handleNext}
              >
                NEXT
              </Button>
            </>
          )}
        </div>
      </div>

      <ReportModal
        open={showReportModal}
        onOpenChange={setShowReportModal}
        userName={`${matchedUser.firstName} ${matchedUser.lastName}`}
      />
    </div>
  );
}
