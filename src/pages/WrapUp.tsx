import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SampleUser, sampleUserManager } from '@/data/sampleUsers';
import { interests } from '@/data/interests';
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

  // Find common interests
  const commonInterestIds = new Set(
    matchedUser.interests.filter(id => profileData.interests.includes(id))
  );

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
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4 md:p-6">
      <div className="relative bg-white rounded-[2rem] shadow-[0_20px_70px_-15px_rgba(0,0,0,0.2)] overflow-hidden max-w-4xl w-full mx-4 md:mx-8">
        <div className="relative p-4 md:p-8">
          {/* Header with Report Button */}
          <div className="mb-4 md:mb-6 relative">
            <h1 className="text-xl md:text-2xl font-bold text-center text-gray-900">Call Ended</h1>
            <Button
              size={isMobile ? "icon" : "sm"}
              variant="destructive"
              className="absolute right-0 top-0"
              onClick={() => setShowReportModal(true)}
            >
              <AlertTriangle className="h-4 w-4" />
              {!isMobile && <span className="ml-2">Report</span>}
            </Button>
          </div>

          {/* Profile Layout - Same as ProfileCard */}
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 md:gap-8">
            {/* Left Side - Avatar and Info */}
            <div className="flex flex-col items-center space-y-3">
              <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-white shadow-lg">
                <AvatarImage src="" />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-3xl md:text-4xl font-bold">
                  {matchedUser.firstName[0]}{matchedUser.lastName[0]}
                </AvatarFallback>
              </Avatar>

              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center">
                {matchedUser.firstName} {matchedUser.lastName}
              </h2>
              
              {/* About Me - compact centered */}
              <div className="w-full bg-gray-50 rounded-2xl p-3">
                <h3 className="text-sm font-semibold text-blue-600 mb-2">About Me</h3>
                <AboutMeSection
                  role={matchedUser.role}
                  occupation={matchedUser.occupation}
                  industry={matchedUser.industry}
                  studyField={matchedUser.studyField}
                  university={matchedUser.university}
                  age={calculateAge(matchedUser.dateOfBirth)}
                  gender={matchedUser.gender}
                  location={matchedUser.location}
                  className="text-gray-700 text-center justify-center text-sm"
                  compact
                />
              </div>

              {/* Bio */}
              {matchedUser.bio && (
                <div className="w-full bg-gray-50 rounded-2xl p-3">
                  <h3 className="font-semibold text-sm text-blue-600 mb-2">Bio</h3>
                  <p className="text-sm leading-relaxed text-gray-700">
                    {matchedUser.bio}
                  </p>
                </div>
              )}
            </div>

            {/* Right Side - Interests */}
            <div className="flex flex-col">
              <div className="space-y-3 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-blue-600">
                    Interests
                  </h3>
                  <span className="text-xs text-gray-500 font-medium">
                    {userInterests.length} selected
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-1.5">
                  {userInterests.map((interest) => {
                    const isCommon = commonInterestIds.has(interest!.id);
                    return (
                      <div
                        key={interest!.id}
                        className={`px-2 py-1 text-sm font-medium rounded-full border flex items-center gap-1 transition-all ${
                          isCommon 
                            ? 'bg-blue-100 border-blue-300 ring-2 ring-blue-400 ring-offset-1' 
                            : 'bg-gray-100 border-gray-200'
                        }`}
                      >
                        <span className="text-sm">{interest!.emoji}</span>
                        <span className="text-gray-700">{interest!.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

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
  );
}
