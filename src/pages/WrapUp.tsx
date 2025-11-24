import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SampleUser, sampleUserManager } from '@/data/sampleUsers';
import { connectionsManager } from '@/utils/connections';
import { AboutMeSection } from '@/components/profile/AboutMeSection';
import { ReportModal } from '@/components/call/ReportModal';
import { useProfileData } from '@/hooks/useProfileData';
import { useIsMobile } from '@/hooks/use-mobile';

export default function WrapUp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profileData } = useProfileData();
  const isMobile = useIsMobile();
  const matchedUser = location.state?.matchedUser as SampleUser | undefined;
  const [decision, setDecision] = useState<'connect' | 'skip' | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const calculateSimilarity = (user1: any, user2: SampleUser): number => {
    let score = 0;
    let maxScore = 0;

    // Interests (40% weight)
    if (user1.interests && user2.interests) {
      const commonInterests = user1.interests.filter((i: string) => 
        user2.interests.includes(i)
      ).length;
      const totalInterests = Math.max(user1.interests.length, user2.interests.length);
      score += (commonInterests / totalInterests) * 40;
    }
    maxScore += 40;

    // Location/Country (20% weight)
    if (user1.location && user2.location) {
      if (user1.location.toLowerCase().includes(user2.location.toLowerCase()) || 
          user2.location.toLowerCase().includes(user1.location.toLowerCase())) {
        score += 20;
      }
    }
    maxScore += 20;

    // Field of work/study (20% weight)
    if ((user1.studyField && user2.studyField && 
         user1.studyField.toLowerCase() === user2.studyField.toLowerCase()) ||
        (user1.industry && user2.industry && 
         user1.industry.toLowerCase() === user2.industry.toLowerCase())) {
      score += 20;
    }
    maxScore += 20;

    // Role (10% weight)
    if (user1.role && user2.role && user1.role.toLowerCase() === user2.role.toLowerCase()) {
      score += 10;
    }
    maxScore += 10;

    // Occupation (10% weight)
    if (user1.occupation && user2.occupation && 
        user1.occupation.toLowerCase() === user2.occupation.toLowerCase()) {
      score += 10;
    }
    maxScore += 10;

    return Math.round((score / maxScore) * 100);
  };

  const similarity = matchedUser ? calculateSimilarity(profileData, matchedUser) : 0;

  if (!matchedUser) {
    navigate('/');
    return null;
  }

  const handleConnect = () => {
    setDecision('connect');
    connectionsManager.addConnection(matchedUser);
  };

  const handleSkip = () => {
    setDecision('skip');
  };

  const handleNext = () => {
    const availableUsers = sampleUserManager.getAvailableUsers();
    let candidates = availableUsers;
    const filters = location.state || {};
    
    if (filters.role && filters.role !== 'random') {
      candidates = candidates.filter(u => u.role === filters.role);
    }
    
    const candidatesWithScores = candidates.map(user => ({
      user,
      similarityScore: calculateSimilarity(profileData, user)
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
    <>
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4 md:p-6">
        <div className="relative bg-white rounded-[2rem] shadow-[0_20px_70px_-15px_rgba(0,0,0,0.2)] overflow-hidden max-w-2xl w-full">
          <div className="relative p-4 md:p-8">
            {/* Header with Report Button */}
            <div className="mb-4 md:mb-6 relative">
              <h1 className="text-xl md:text-2xl font-bold text-center text-gray-900">Call Ended</h1>
              <Button
                size={isMobile ? "icon" : "sm"}
                variant="ghost"
                className="absolute right-0 top-0 text-destructive hover:bg-destructive/10"
                onClick={() => setShowReportModal(true)}
              >
                <AlertTriangle className="h-4 w-4" />
                {!isMobile && <span className="ml-2">Report</span>}
              </Button>
            </div>

            {/* Profile Content - Desktop: Split Layout, Mobile: Centered */}
            {isMobile ? (
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                  <AvatarImage src={matchedUser.profilePicture || ''} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-3xl font-bold">
                    {matchedUser.firstName[0]}{matchedUser.lastName[0]}
                  </AvatarFallback>
                </Avatar>

                <h2 className="text-2xl font-bold text-gray-900 text-center">
                  {matchedUser.firstName} {matchedUser.lastName}
                </h2>
                
                <AboutMeSection
                  role={matchedUser.role}
                  occupation={matchedUser.occupation}
                  industry={matchedUser.industry}
                  studyField={matchedUser.studyField}
                  university={matchedUser.university}
                  age={new Date().getFullYear() - new Date(matchedUser.dateOfBirth).getFullYear()}
                  gender={matchedUser.gender}
                  location={matchedUser.location}
                  className="text-gray-700 text-center justify-center text-sm"
                  compact
                />

                {/* Similarity - Compact on Mobile */}
                <div className="text-center py-2">
                  <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-primary rounded-full">
                    <p className="text-2xl font-bold text-white">
                      {similarity}%
                    </p>
                    <p className="text-sm font-semibold text-white/90 uppercase tracking-wider">
                      Similarity
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-stretch gap-0">
                {/* Left Section - Profile */}
                <div className="flex-1 flex flex-col items-center space-y-4 pr-8">
                  <Avatar className="h-40 w-40 border-4 border-white shadow-lg">
                    <AvatarImage src={matchedUser.profilePicture || ''} />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-4xl font-bold">
                      {matchedUser.firstName[0]}{matchedUser.lastName[0]}
                    </AvatarFallback>
                  </Avatar>

                  <h2 className="text-3xl font-bold text-gray-900 text-center">
                    {matchedUser.firstName} {matchedUser.lastName}
                  </h2>
                  
                  <AboutMeSection
                    role={matchedUser.role}
                    occupation={matchedUser.occupation}
                    industry={matchedUser.industry}
                    studyField={matchedUser.studyField}
                    university={matchedUser.university}
                    age={new Date().getFullYear() - new Date(matchedUser.dateOfBirth).getFullYear()}
                    gender={matchedUser.gender}
                    location={matchedUser.location}
                    className="text-gray-700 text-center justify-center text-sm"
                    compact
                  />
                </div>

                {/* Divider */}
                <div className="w-px bg-gradient-to-b from-transparent via-border to-transparent self-stretch" />

                {/* Right Section - Animated Similarity */}
                <div className="flex-1 flex items-center justify-center pl-8">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative w-48 h-48">
                      {/* Outer Ring */}
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="96"
                          cy="96"
                          r="88"
                          stroke="hsl(var(--border))"
                          strokeWidth="8"
                          fill="none"
                        />
                        <circle
                          cx="96"
                          cy="96"
                          r="88"
                          stroke="url(#gradient)"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 88}`}
                          strokeDashoffset={`${2 * Math.PI * 88 * (1 - similarity / 100)}`}
                          className="transition-all duration-2000 ease-out"
                          strokeLinecap="round"
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="hsl(217, 91%, 60%)" />
                            <stop offset="100%" stopColor="hsl(282, 77%, 61%)" />
                          </linearGradient>
                        </defs>
                      </svg>
                      
                      {/* Center Content */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-6xl font-black text-primary animate-scale-in">
                          {similarity}%
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-lg font-semibold text-primary uppercase tracking-wider">
                      Similarity
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              {decision === null ? (
                <>
                  <Button
                    size="lg"
                    className="flex-1 bg-success hover:bg-success/90 text-white relative overflow-hidden group"
                    onClick={handleConnect}
                  >
                    <span className="relative z-10">Connect</span>
                    <span className="absolute inset-0 bg-white/20 scale-0 group-active:scale-100 rounded-xl transition-transform duration-300 origin-center" />
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 bg-destructive hover:bg-destructive/90 text-white relative overflow-hidden group"
                    onClick={handleSkip}
                  >
                    <span className="relative z-10">Skip</span>
                    <span className="absolute inset-0 bg-white/20 scale-0 group-active:scale-100 rounded-xl transition-transform duration-300 origin-center" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate('/')}
                    className="relative overflow-hidden group"
                  >
                    <span className="relative z-10">Back to Circle</span>
                    <span className="absolute inset-0 bg-primary/10 scale-0 group-active:scale-100 rounded-xl transition-transform duration-300 origin-center" />
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 bg-gradient-primary hover:opacity-90 relative overflow-hidden group"
                    onClick={handleNext}
                  >
                    <span className="relative z-10">NEXT</span>
                    <span className="absolute inset-0 bg-white/20 scale-0 group-active:scale-100 rounded-xl transition-transform duration-300 origin-center" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <ReportModal
          open={showReportModal}
          onOpenChange={setShowReportModal}
          userName={`${matchedUser.firstName} ${matchedUser.lastName}`}
        />
      </div>

      {/* End Call Confirmation Dialog */}
      <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <DialogContent className="max-w-sm">
          <div className="text-center space-y-4 p-4">
            <h2 className="text-xl font-bold">End Call?</h2>
            <p className="text-muted-foreground">Are you sure you want to end this call?</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowEndConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  setShowEndConfirm(false);
                  navigate('/wrap-up', { 
                    state: { 
                      matchedUser,
                      ...location.state
                    },
                    replace: true 
                  });
                }}
              >
                END
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
