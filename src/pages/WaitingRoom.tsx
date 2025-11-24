import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Users, Clock } from 'lucide-react';
import { AdaptiveLayout } from '@/components/layouts/AdaptiveLayout';
import { useProfileData } from '@/hooks/useProfileData';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  joinMatchmakingQueue, 
  findMatches, 
  createMatch, 
  leaveMatchmakingQueue,
  getQueueStats,
  MatchmakingFilters 
} from '@/lib/api/matchmaking';

export default function WaitingRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profileData } = useProfileData();
  const isMobile = useIsMobile();
  const [matchingUsers, setMatchingUsers] = useState(0);
  const [chattingUsers, setChattingUsers] = useState(0);
  const [estimatedWait, setEstimatedWait] = useState(45);
  
  // Get filters from navigation state
  const navigationFilters = location.state as { 
    role?: string; 
    similarity?: number;
    topic?: string;
    duration?: number;
    circleId?: string;
  } || {};

  // Join matchmaking queue on mount
  useEffect(() => {
    const joinQueue = async () => {
      try {
        const matchmakingFilters: MatchmakingFilters = {
          circleId: navigationFilters.circleId,
          preferredRoles: navigationFilters.role && navigationFilters.role !== 'random' 
            ? [navigationFilters.role] 
            : undefined,
          filterSimilarInterests: navigationFilters.similarity === 100,
          filterSimilarBackground: false,
        };

        await joinMatchmakingQueue(matchmakingFilters);
        console.log('✅ Joined matchmaking queue');
      } catch (error) {
        console.error('Failed to join queue:', error);
      }
    };

    joinQueue();

    // Leave queue on unmount
    return () => {
      leaveMatchmakingQueue().catch(console.error);
    };
  }, []);

  // Check for available matches using real Supabase data
  const checkForMatch = async () => {
    try {
      // Get queue stats
      const stats = await getQueueStats(navigationFilters.circleId);
      setMatchingUsers(stats.waitingCount);
      
      // Try to find matches
      const matchmakingFilters: MatchmakingFilters = {
        circleId: navigationFilters.circleId,
        preferredRoles: navigationFilters.role && navigationFilters.role !== 'random' 
          ? [navigationFilters.role] 
          : undefined,
        filterSimilarInterests: navigationFilters.similarity === 100,
        filterSimilarBackground: false,
      };

      const matches = await findMatches(matchmakingFilters);
      
      if (matches && matches.length > 0) {
        // Found a match! Pick the first one
        const match = matches[0];
        const matchProfile = match.profiles as any;
        
        console.log('🎉 Match found:', matchProfile);
        
        // Create the match and call
        try {
          const call = await createMatch(match.user_id);
          
          // Convert to matchedUser format for the call interface
          const matchedUser = {
            id: matchProfile.id,
            firstName: matchProfile.first_name,
            lastName: matchProfile.last_name,
            profilePicture: matchProfile.profile_picture_url,
            role: matchProfile.role,
            location: matchProfile.location,
            occupation: matchProfile.occupation,
            bio: matchProfile.bio,
            university: matchProfile.university,
            interests: [], // Will be populated by interests query if needed
          };
          
          navigate('/countdown', {
            state: {
              matchedUser,
              callId: call.id,
              ...navigationFilters
            },
            replace: true
          });
        } catch (matchError: any) {
          // If match creation fails (e.g., already matched), it's okay
          // The other user created the match, and we'll be notified via subscription
          console.log('Match creation handled by other user:', matchError.message);
        }
      }
    } catch (error) {
      console.error('Error in matchmaking:', error);
    }
  };

  // Subscribe to call_history to detect when we've been matched by another user
  useEffect(() => {
    if (!profileData?.id) return;

    const channel = supabase
      .channel('call_matches')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_history',
          filter: `recipient_id=eq.${profileData.id}`,
        },
        async (payload: any) => {
          console.log('📞 New call received:', payload);
          
          // We've been matched! Update our queue status and navigate
          const call = payload.new;
          
          // Update own queue entry to matched
          await supabase
            .from('matchmaking_queue')
            .update({
              status: 'matched',
              matched_at: new Date().toISOString(),
            })
            .eq('user_id', profileData.id)
            .eq('status', 'waiting');
          
          // Update own profile to in_call
          await supabase
            .from('profiles')
            .update({ in_call: true })
            .eq('id', profileData.id);
          
          // Fetch the caller's profile
          const { data: callerProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', call.caller_id)
            .single();
          
          if (callerProfile) {
            const matchedUser = {
              id: callerProfile.id,
              firstName: callerProfile.first_name,
              lastName: callerProfile.last_name,
              profilePicture: callerProfile.profile_picture_url,
              role: callerProfile.role,
              location: callerProfile.location,
              occupation: callerProfile.occupation,
              bio: callerProfile.bio,
              university: callerProfile.university,
              interests: [],
            };
            
            navigate('/countdown', {
              state: {
                matchedUser,
                callId: call.id,
                ...navigationFilters
              },
              replace: true
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileData?.id]);

  useEffect(() => {
    // Check for matches every 3 seconds (more responsive for testing with 2 users)
    const interval = setInterval(checkForMatch, 3000);
    checkForMatch(); // Initial check

    return () => clearInterval(interval);
  }, [navigationFilters]);

  return (
    <AdaptiveLayout>
      <div className={`h-screen flex items-center ${isMobile ? 'justify-center' : 'justify-center'} p-4 overflow-hidden`}>
        <div className={`max-w-4xl w-full ${isMobile ? 'flex flex-col justify-center py-8' : 'h-[95vh] flex flex-col'}`}>
          {/* Header */}
          <div className={`text-center ${isMobile ? 'mb-6' : 'mb-4'} flex-shrink-0`}>
            <div className="mx-auto w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-primary flex items-center justify-center mb-3 animate-pulse">
              <Loader2 className="h-8 w-8 md:h-10 md:w-10 text-white animate-spin" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Finding Your Match...</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              We're connecting you with someone who matches your preferences
            </p>
          </div>

          {/* Stats */}
          <div className={`grid grid-cols-3 gap-2 md:gap-4 ${isMobile ? 'mb-6' : 'mb-4'} flex-shrink-0`}>
            <div className="bg-card/80 rounded-2xl p-2 md:p-4 text-center shadow-apple-md border-2 border-border">
              <Users className="h-4 w-4 md:h-6 md:w-6 mx-auto mb-1 md:mb-2 text-primary" />
              <div className="text-lg md:text-2xl font-bold">{matchingUsers}</div>
              <div className="text-xs md:text-sm text-muted-foreground">Available Now</div>
            </div>
            <div className="bg-card/80 rounded-2xl p-2 md:p-4 text-center shadow-apple-md border-2 border-border">
              <Users className="h-4 w-4 md:h-6 md:w-6 mx-auto mb-1 md:mb-2 text-warning" />
              <div className="text-lg md:text-2xl font-bold">{chattingUsers}</div>
              <div className="text-xs md:text-sm text-muted-foreground">Currently Chatting</div>
            </div>
            <div className="bg-card/80 rounded-2xl p-2 md:p-4 text-center shadow-apple-md border-2 border-border">
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
          <div className={`flex justify-center flex-shrink-0 ${isMobile ? 'mt-6' : ''}`}>
            <Button
              variant="destructive"
              onClick={() => navigate('/')}
              className="relative overflow-hidden group"
            >
              <span className="relative z-10">Cancel & Return Home</span>
              <span className="absolute inset-0 bg-white/20 scale-0 group-active:scale-100 rounded-xl transition-transform duration-300 origin-center" />
            </Button>
          </div>
        </div>
      </div>
    </AdaptiveLayout>
  );
}
