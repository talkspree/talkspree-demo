import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdaptiveLayout } from "@/components/layouts/AdaptiveLayout";
import { useProfileData } from "@/hooks/useProfileData";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/lib/supabase";
import {
  MatchmakingFilters,
  attemptMatch,
  joinMatchmakingQueue,
  leaveMatchmakingQueue,
  findMatches,
  createMatch,
  getMatchmakingStats,
} from "@/lib/api/matchmaking";

export default function WaitingRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profileData } = useProfileData();
  const isMobile = useIsMobile();

  const matchedRef = useRef(false);
  const mountedRef = useRef(true);
  const selfIdRef = useRef<string | null>(null);
  const matchingInProgressRef = useRef(false); // Prevent duplicate match attempts
  const incomingCheckRef = useRef(false);

  const [matchingUsers, setMatchingUsers] = useState(0);
  const [chattingUsers, setChattingUsers] = useState(0);
  const [estimatedWait, setEstimatedWait] = useState(45);
  const [noMatches, setNoMatches] = useState(false);

  // Normalize filters from navigation state
  const matchmakingFilters = useMemo<MatchmakingFilters>(() => {
    const nav = (location.state as any) || {};
    return {
      circleId: nav.circleId,
      preferredRoles: nav.role && nav.role !== "random" ? [nav.role] : undefined,
      preferredTopics: nav.topic && nav.topic !== "none" ? [nav.topic] : undefined,
      filterSimilarInterests: nav.similarity === 100,
      filterSimilarBackground: false,
    };
  }, [location.state]);

  // Extract session duration from navigation state (default to 15 minutes)
  const sessionDuration = useMemo(() => {
    const nav = (location.state as any) || {};
    return nav.duration || 15;
  }, [location.state]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Join queue on mount, leave on unmount
  useEffect(() => {
    const join = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        selfIdRef.current = user?.id || null;
        matchedRef.current = false; // Reset match state when rejoining
        matchingInProgressRef.current = false;

        // Hard cleanup of stale state for this user before joining
        if (selfIdRef.current) {
          // End any ongoing calls involving this user
          await supabase
            .from("call_history")
            .update({
              status: "cancelled",
              ended_at: new Date().toISOString(),
            })
            .or(`caller_id.eq.${selfIdRef.current},recipient_id.eq.${selfIdRef.current}`)
            .eq("status", "ongoing");

          // Reset profile in_call flag
          await supabase
            .from("profiles")
            .update({ in_call: false })
            .eq("id", selfIdRef.current);

          // Remove any existing queue entries (waiting/matched/cancelled) for this user
          await supabase
            .from("matchmaking_queue")
            .delete()
            .eq("user_id", selfIdRef.current);
        }

        await joinMatchmakingQueue(matchmakingFilters, sessionDuration);
        console.log(`[${user?.id}] Joined matchmaking queue with ${sessionDuration} minute duration`);
        
        // Wait a bit longer to ensure the insert is visible to other users via RLS
        // Also refresh counts first
        await refreshCounts();
        
        // Try matching after a short delay to ensure database consistency
        setTimeout(() => {
          tryMatchWithPeer();
        }, 1000);
      } catch (error) {
        console.error("Failed to join queue:", error);
      }
    };
    join();
    return () => {
      // Only leave queue if we haven't been matched
      // If matched, the queue entry should already be updated to "matched"
      if (!matchedRef.current) {
        console.log(`[${selfIdRef.current}] Leaving queue on unmount (not matched)`);
        leaveMatchmakingQueue().catch(console.error);
      } else {
        console.log(`[${selfIdRef.current}] Skipping leave queue - already matched`);
      }
    };
  }, [matchmakingFilters, sessionDuration]);

  // Refresh counts for waiting and active calls
  const refreshCounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
        const stats = await getMatchmakingStats();
        if (!mountedRef.current) return;
        setMatchingUsers(stats.waitingCount);
        setChattingUsers(stats.chattingUsers);
        setNoMatches(stats.waitingCount === 0);
      } catch (statsError) {
        console.error("Error fetching matchmaking stats:", statsError);
      }
    } catch (error) {
      console.error("Error refreshing counts:", error);
    }
  };

  // Fallback: check if there's an ongoing call where I'm the recipient
  const checkIncomingCall = async () => {
    if (matchedRef.current || incomingCheckRef.current) return;
    const { data: { user } } = await supabase.auth.getUser();
    const selfId = user?.id || profileData?.id;
    if (!selfId) return;
    incomingCheckRef.current = true;
    try {
      const { data: call } = await supabase
        .from("call_history")
        .select("*")
        .eq("recipient_id", selfId)
        .eq("status", "ongoing")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (call && !matchedRef.current) {
        matchedRef.current = true;
        matchingInProgressRef.current = false;

        const { data: callerProfile } = await supabase
          .from("profiles")
          .select("*, user_interests(interest_id)")
          .eq("id", call.caller_id)
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
            interests: (callerProfile.user_interests || []).map((i: any) => i.interest_id),
            dateOfBirth: callerProfile.date_of_birth,
            gender: callerProfile.gender,
            studyField: callerProfile.study_field,
            industry: callerProfile.industry,
            workPlace: callerProfile.work_place,
          };

          navigate("/countdown", {
            state: {
              matchedUser,
              callId: call.id,
              agreedDuration: call.agreed_duration_minutes,
              callStartTime: call.started_at,
              ...location.state,
            },
            replace: true,
          });
        }
      }
    } finally {
      incomingCheckRef.current = false;
    }
  };

  // Try to match with available peers
  const tryMatchWithPeer = async () => {
    if (matchedRef.current) return;
    if (matchingInProgressRef.current) {
      console.log("Match attempt already in progress, skipping...");
      return;
    }
    
    const selfId = selfIdRef.current;
    if (!selfId) {
      console.log("No self ID, skipping match attempt");
      return;
    }

    matchingInProgressRef.current = true;

    try {
      console.log(`[${selfId}] Attempting atomic match...`);
      let result: Awaited<ReturnType<typeof attemptMatch>> = null;

      // Extract topic configuration from navigation state
      const nav = (location.state as any) || {};
      const topicConfig = {
        topicPreset: nav.topic,
        customTopics: nav.customTopics,
        customQuestions: nav.customQuestions,
      };

      console.log('🎯 Creating match with topic config:', topicConfig, 'and duration:', sessionDuration);

      try {
        result = await attemptMatch(sessionDuration, topicConfig);
      } catch (rpcError: any) {
        console.warn(`[${selfId}] attempt_match RPC failed, falling back to client matching:`, rpcError);
        const matches = await findMatches(matchmakingFilters);
        if (matches && matches.length > 0) {
          const peer = matches[0];
          const call = await createMatch(peer.user_id, topicConfig);
          result = { callId: call.id, matchedUserId: peer.user_id };
        }
      }

      if (!result) {
        matchingInProgressRef.current = false;
        return;
      }

      matchedRef.current = true;
      matchingInProgressRef.current = false;
      console.log(`[${selfId}] Matched with ${result.matchedUserId}, call ${result.callId}`);

      // Fetch call details to get agreed duration and start time
      const { data: callData, error: callError } = await supabase
        .from("call_history")
        .select("agreed_duration_minutes, started_at")
        .eq("id", result.callId)
        .single();

      if (callError) {
        console.error(`[${selfId}] Failed to fetch call details:`, callError);
      }

      const { data: peerProfile, error: profileError } = await supabase
        .from("profiles")
        .select("*, user_interests(interest_id)")
        .eq("id", result.matchedUserId)
        .single();

      if (profileError || !peerProfile) {
        console.error(`[${selfId}] Failed to fetch matched user profile:`, profileError);
        return;
      }

      const matchedUser = {
        id: peerProfile.id,
        firstName: peerProfile.first_name,
        lastName: peerProfile.last_name,
        profilePicture: peerProfile.profile_picture_url,
        role: peerProfile.role,
        location: peerProfile.location,
        occupation: peerProfile.occupation,
        bio: peerProfile.bio,
        university: peerProfile.university,
        interests: (peerProfile.user_interests || []).map((i: any) => i.interest_id),
        dateOfBirth: peerProfile.date_of_birth,
        gender: peerProfile.gender,
        studyField: peerProfile.study_field,
        industry: peerProfile.industry,
        workPlace: peerProfile.work_place,
      };

      navigate("/countdown", {
        state: {
          matchedUser,
          callId: result.callId,
          agreedDuration: callData?.agreed_duration_minutes || sessionDuration,
          callStartTime: callData?.started_at,
          ...location.state,
        },
        replace: true,
      });
    } catch (err) {
      console.error(`[${selfId}] Failed to create match:`, err);
      matchingInProgressRef.current = false;
      // Don't set matchedRef to true on error, so we can retry
    }
  };

  // Subscribe to matchmaking_queue changes via postgres_changes
  // Set up subscription after user joins queue
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    
    // Wait a bit for user to join queue and get ID
    const timeoutId = setTimeout(() => {
      const selfId = selfIdRef.current;
      if (!selfId) {
        console.log("No user ID yet, skipping subscription setup");
        return;
      }

      const channelName = `matchmaking_queue_changes_${selfId}`;
      
      console.log(`[${selfId}] Setting up queue subscription...`);
      
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "matchmaking_queue",
            filter: "status=eq.waiting",
          },
          (payload) => {
            const currentSelfId = selfIdRef.current;
            console.log(`[${currentSelfId}] Queue changed:`, payload.eventType, payload);
            // Refresh counts and try matching when queue changes
            refreshCounts();
            // Small delay to ensure the change is fully propagated
            setTimeout(() => {
              if (!matchedRef.current && !matchingInProgressRef.current) {
                tryMatchWithPeer();
              }
            }, 300);
          }
        )
        .subscribe((status) => {
          const currentSelfId = selfIdRef.current;
          console.log(`[${currentSelfId}] Queue subscription status:`, status);
          if (status === 'SUBSCRIBED') {
            console.log(`[${currentSelfId}] âœ… Successfully subscribed to queue changes`);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.error(`[${currentSelfId}] âŒ Queue subscription failed:`, status);
          }
        });
    }, 1500); // Wait 1.5s after component mount to ensure user has joined queue

    return () => {
      clearTimeout(timeoutId);
      if (channel) {
        const currentSelfId = selfIdRef.current;
        console.log(`[${currentSelfId}] Unsubscribing from queue changes`);
        supabase.removeChannel(channel);
      }
    };
  }, [matchmakingFilters]);

  // Periodic refresh and matching attempt (every 2 seconds)
  // This ensures matching happens even if realtime events are missed
  useEffect(() => {
    // Initial refresh (matching will be triggered by join effect)
    refreshCounts();

    const interval = setInterval(() => {
      if (!matchedRef.current && !matchingInProgressRef.current) {
        refreshCounts();
        tryMatchWithPeer();
        checkIncomingCall();
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [matchmakingFilters]);

  // Subscribe to call inserts targeted to current user (auth user fallback)
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const selfId = user?.id || profileData?.id;
      if (!selfId) {
        console.log('No user ID available, skipping call_history subscription');
        return;
      }

      channel = supabase
        .channel(`call_matches_${selfId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'call_history',
            filter: `recipient_id=eq.${selfId}`,
          },
          async (payload: any) => {
            const call = payload.new;
            if (matchedRef.current) return;
            matchedRef.current = true;
            matchingInProgressRef.current = false;

            await supabase
              .from('matchmaking_queue')
              .update({ status: 'matched', matched_at: new Date().toISOString() })
              .eq('user_id', selfId)
              .eq('status', 'waiting');

            const { data: callerProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', call.caller_id)
              .single();

            if (!callerProfile || !active) return;

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
                agreedDuration: call.agreed_duration_minutes,
                callStartTime: call.started_at,
                ...location.state,
              },
              replace: true,
            });
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [profileData?.id, navigate, location.state]);

  return (
    <AdaptiveLayout>
      <div className={`h-screen flex items-center ${isMobile ? "justify-center" : "justify-center"} p-4 overflow-hidden`}>
        <div className={`max-w-4xl w-full ${isMobile ? "flex flex-col justify-center py-8" : "h-[95vh] flex flex-col"}`}>
          {/* Header */}
          <div className={`text-center ${isMobile ? "mb-6" : "mb-4"} flex-shrink-0`}>
            <div className="mx-auto w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-primary flex items-center justify-center mb-3 animate-pulse">
              <Loader2 className="h-8 w-8 md:h-10 md:w-10 text-white animate-spin" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Finding Your Match...</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              We're connecting you with someone who matches your preferences
            </p>
          </div>

          {/* Stats */}
          <div className={`grid grid-cols-3 gap-2 md:gap-4 ${isMobile ? "mb-6" : "mb-4"} flex-shrink-0`}>
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
          {noMatches && (
            <div className="text-center text-sm text-destructive mb-4">
              No one matches your filters right now. Leave this window open and weâ€™ll connect you as soon as someone arrives.
            </div>
          )}

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
                  style={{ border: "none" }}
                />
              </div>
              <p className="text-xs md:text-sm text-muted-foreground text-center mt-2 flex-shrink-0">
                Press Space or Tap to Jump. Collect matching interests!
              </p>
            </div>
          )}

          {/* Cancel Button */}
          <div className={`flex justify-center flex-shrink-0 ${isMobile ? "mt-6" : ""}`}>
            <Button
              variant="destructive"
              onClick={() => navigate("/")}
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
