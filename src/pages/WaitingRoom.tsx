import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, Users, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdaptiveLayout } from "@/components/layouts/AdaptiveLayout";
import { useProfileData } from "@/hooks/useProfileData";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/lib/supabase";
import {
  MatchmakingFilters,
  attemptMatch,
  joinMatchmakingQueue,
  leaveMatchmakingQueue,
  sendReadySignal,
  subscribeToReadySignals,
} from "@/lib/api/matchmaking";

type Phase = "searching" | "connecting" | "connectionFailed";

interface MatchedUserInfo {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  role: string | null;
  location: string | null;
  occupation: string | null;
  bio: string | null;
  university: string | null;
  interests: string[];
  dateOfBirth: string | null;
  gender: string | null;
  studyField: string | null;
  industry: string | null;
  workPlace: string | null;
}

function profileToMatchedUser(p: any, circleRole?: string | null): MatchedUserInfo {
  return {
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    profilePicture: p.profile_picture_url,
    role: circleRole || p.role,
    location: p.location,
    occupation: p.occupation,
    bio: p.bio,
    university: p.university,
    interests: (p.user_interests || []).map((i: any) => i.interest_id),
    dateOfBirth: p.date_of_birth,
    gender: p.gender,
    studyField: p.study_field,
    industry: p.industry,
    workPlace: p.work_place,
  };
}

export default function WaitingRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profileData } = useProfileData();
  const isMobile = useIsMobile();

  // ── Phase ──────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("searching");
  const phaseRef = useRef<Phase>("searching");
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Lifecycle refs ─────────────────────────────────────────────────────
  const unmountedRef = useRef(false);
  const matchedRef = useRef(false);
  const selfIdRef = useRef<string | null>(null);
  const matchingInProgressRef = useRef(false);

  // ── Timer refs (all cleared on unmount) ────────────────────────────────
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failedResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialMatchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Ready-signal channel ───────────────────────────────────────────────
  const readyChannelRef = useRef<any>(null);
  const partnerReadyRef = useRef(false);

  // ── Connecting-phase data ──────────────────────────────────────────────
  const [connectingUser, setConnectingUser] = useState<MatchedUserInfo | null>(null);
  const connectingCallIdRef = useRef<string | null>(null);

  // ── Chat-session tracking ──────────────────────────────────────────────
  const chatSessionUsers = useMemo<string[]>(
    () => ((location.state as any)?.chatSessionUsers as string[]) || [],
    [location.state],
  );
  const declinedRef = useRef<Set<string>>(new Set());

  // ── Session confirm prompt ─────────────────────────────────────────────
  const [sessionConfirm, setSessionConfirm] = useState<{
    id: string; name: string; picture: string | null;
  } | null>(null);
  const sessionConfirmRef = useRef<typeof sessionConfirm>(null);
  useEffect(() => { sessionConfirmRef.current = sessionConfirm; }, [sessionConfirm]);

  // ── Rematch consent flow ────────────────────────────────────────────
  const [rematchPending, setRematchPending] = useState(false);
  const rematchPendingRef = useRef(false);
  const rematchTargetRef = useRef<string | null>(null);
  const [rematchRequestedBy, setRematchRequestedBy] = useState<string | null>(null);
  const rematchBroadcastRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rematchChannelRef = useRef<any>(null);
  const proceedWithRematchRef = useRef<(pid: string) => Promise<void>>(async () => {});
  useEffect(() => { rematchPendingRef.current = rematchPending; }, [rematchPending]);

  // ── Stats & game ──────────────────────────────────────────────────────
  const [stats, setStats] = useState({ matchingUsers: 0, chattingUsers: 0 });
  const [estimatedWait, setEstimatedWait] = useState(45);
  const [gameStarted, setGameStarted] = useState(false);
  const [dinoHs, setDinoHs] = useState(0);
  const dinoIframeRef = useRef<HTMLIFrameElement>(null);

  // ── Derived filters / config ───────────────────────────────────────────
  const matchmakingFilters = useMemo<MatchmakingFilters>(() => {
    const nav = (location.state as any) || {};
    return {
      circleId: nav.circleId,
      preferredRoles: nav.role && nav.role !== "random" ? [nav.role] : undefined,
      preferredTopics: nav.topic && nav.topic !== "none" ? [nav.topic] : undefined,
      filterSimilarInterests: false,
      filterSimilarBackground: false,
      similarityPreference: nav.similarity != null ? nav.similarity : undefined,
    };
  }, [location.state]);

  const sessionDuration = useMemo(
    () => ((location.state as any) || {}).duration || 15,
    [location.state],
  );

  const topicConfig = useMemo(() => {
    const nav = (location.state as any) || {};
    return {
      topicPreset: nav.topic,
      presetType: nav.presetType as "default" | "circle" | "user" | undefined,
      customTopics: nav.customTopics,
      customQuestions: nav.customQuestions,
    };
  }, [location.state]);

  // =====================================================================
  //  Helpers
  // =====================================================================

  function clearAllTimers() {
    if (connectionTimeoutRef.current) { clearTimeout(connectionTimeoutRef.current); connectionTimeoutRef.current = null; }
    if (failedResetRef.current) { clearTimeout(failedResetRef.current); failedResetRef.current = null; }
    if (initialMatchRef.current) { clearTimeout(initialMatchRef.current); initialMatchRef.current = null; }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (rematchBroadcastRef.current) { clearInterval(rematchBroadcastRef.current); rematchBroadcastRef.current = null; }
  }

  function cleanupReadyChannel() {
    if (readyChannelRef.current) {
      supabase.removeChannel(readyChannelRef.current);
      readyChannelRef.current = null;
    }
  }

  function cleanupRematchChannel() {
    if (rematchChannelRef.current) {
      supabase.removeChannel(rematchChannelRef.current);
      rematchChannelRef.current = null;
    }
  }

  function clearRematchPending() {
    setRematchPending(false);
    rematchPendingRef.current = false;
    rematchTargetRef.current = null;
    if (rematchBroadcastRef.current) { clearInterval(rematchBroadcastRef.current); rematchBroadcastRef.current = null; }
  }

  async function refreshCounts() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || unmountedRef.current) return;

      const { data, error } = await supabase.rpc("get_waiting_room_stats", { p_user_id: user.id });
      if (error || unmountedRef.current) return;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row || typeof row !== "object") return;

      const waiting = Number(row.waiting_count ?? (row as any).waitingCount ?? 0) || 0;
      const chatting = Number(row.chatting_count ?? (row as any).chattingCount ?? 0) || 0;

      setStats({ matchingUsers: waiting, chattingUsers: chatting });

      if (waiting > 0) {
        setEstimatedWait(Math.max(5, Math.floor(10 / (waiting + 1))));
      } else if (chatting > 0) {
        setEstimatedWait(Math.min(180, Math.max(30, Math.floor((15 * 60) / (chatting + 1)))));
      } else {
        setEstimatedWait(240);
      }
    } catch {
      /* ignore */
    }
  }

  // =====================================================================
  //  Navigation → Countdown
  // =====================================================================

  function goToCountdown(user: MatchedUserInfo, callId: string, agreedDuration: number, callStartTime: string) {
    if (unmountedRef.current) return;
    cleanupReadyChannel();
    clearAllTimers();
    navigate("/countdown", {
      state: {
        ...location.state,
        matchedUser: user,
        callId,
        agreedDuration,
        callStartTime,
        chatSessionUsers,
      },
      replace: true,
    });
  }

  // =====================================================================
  //  Cancel an in-progress connection attempt
  // =====================================================================

  async function cancelConnection() {
    const callId = connectingCallIdRef.current;
    const selfId = selfIdRef.current;

    cleanupReadyChannel();
    if (connectionTimeoutRef.current) { clearTimeout(connectionTimeoutRef.current); connectionTimeoutRef.current = null; }

    if (callId) {
      await supabase
        .from("call_history")
        .update({ status: "cancelled", ended_at: new Date().toISOString() })
        .eq("id", callId);
    }
    if (selfId) {
      await supabase
        .from("profiles")
        .update({ in_call: false })
        .eq("id", selfId);
    }

    matchedRef.current = false;
    matchingInProgressRef.current = false;
    connectingCallIdRef.current = null;
    partnerReadyRef.current = false;
  }

  // =====================================================================
  //  Enter connecting phase — mutual ready-signal handshake
  // =====================================================================

  async function enterConnecting(user: MatchedUserInfo, callId: string, agreedDuration: number, callStartTime: string) {
    if (unmountedRef.current) return;

    setConnectingUser(user);
    connectingCallIdRef.current = callId;
    partnerReadyRef.current = false;
    setPhase("connecting");

    const selfId = selfIdRef.current!;

    const onPartnerReady = (userId: string) => {
      if (userId === selfId || partnerReadyRef.current || unmountedRef.current) return;
      partnerReadyRef.current = true;
      console.log("[WaitingRoom] Partner ready → countdown");
      goToCountdown(user, callId, agreedDuration, callStartTime);
    };

    // 1. Subscribe FIRST so we don't miss the partner's signal
    cleanupReadyChannel();
    readyChannelRef.current = subscribeToReadySignals(callId, onPartnerReady);

    // 2. Send our own ready signal
    try { await sendReadySignal(callId); } catch (e) { console.error("[WaitingRoom] ready signal failed:", e); }

    // 3. Check if partner already sent theirs (before we subscribed)
    if (!partnerReadyRef.current) {
      try {
        const { data: existing } = await supabase
          .from("call_signals")
          .select("user_id")
          .eq("call_id", callId)
          .eq("signal_type", "ready")
          .neq("user_id", selfId);
        if (existing && existing.length > 0) {
          onPartnerReady(existing[0].user_id);
          return;
        }
      } catch { /* ignore */ }
    }

    // 4. 12-second timeout
    if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    connectionTimeoutRef.current = setTimeout(async () => {
      if (unmountedRef.current || partnerReadyRef.current || phaseRef.current !== "connecting") return;
      console.log("[WaitingRoom] 12 s connection timeout");
      await cancelConnection();
      if (!unmountedRef.current) {
        setPhase("connectionFailed");
        setConnectingUser(null);
      }
    }, 12_000);
  }

  // =====================================================================
  //  Proceed with mutual rematch after both users consent
  // =====================================================================

  async function proceedWithRematch(partnerId: string) {
    if (matchedRef.current || unmountedRef.current) return;

    clearRematchPending();
    setRematchRequestedBy(null);
    setSessionConfirm(null);
    matchingInProgressRef.current = true;

    const selfId = selfIdRef.current;
    if (!selfId) { matchingInProgressRef.current = false; return; }

    console.log("[WaitingRoom] Mutual rematch consent — attempting match with", partnerId);

    try {
      const reducedSkip = chatSessionUsers.filter(id => id !== partnerId);
      const result = await attemptMatch(sessionDuration, topicConfig, reducedSkip.length > 0 ? reducedSkip : undefined);

      if (unmountedRef.current) return;

      if (!result) {
        // The other user's attemptMatch likely succeeded first — handleIncoming will pick up the call
        console.log("[WaitingRoom] attemptMatch returned null — waiting for incoming call");
        matchingInProgressRef.current = false;
        return;
      }

      const [{ data: callData }, { data: prof }] = await Promise.all([
        supabase.from("call_history").select("agreed_duration_minutes, started_at, circle_id").eq("id", result.callId).single(),
        supabase.from("profiles").select("*, user_interests(interest_id)").eq("id", result.matchedUserId).single(),
      ]);
      if (!prof || unmountedRef.current) { matchingInProgressRef.current = false; return; }

      let circleRole: string | null = null;
      if (callData?.circle_id) {
        const { data: cm } = await supabase.from("circle_members").select("role").eq("user_id", result.matchedUserId).eq("circle_id", callData.circle_id).maybeSingle();
        circleRole = cm?.role || null;
      }

      matchedRef.current = true;
      matchingInProgressRef.current = false;
      await enterConnecting(profileToMatchedUser(prof, circleRole), result.callId, callData?.agreed_duration_minutes || sessionDuration, callData?.started_at || new Date().toISOString());
    } catch (err) {
      console.error("[WaitingRoom] rematch error:", err);
      matchingInProgressRef.current = false;
    }
  }

  // Keep ref updated every render so broadcast handlers always call the latest version
  proceedWithRematchRef.current = proceedWithRematch;

  // =====================================================================
  //  Try to atomically match with a peer
  // =====================================================================

  async function tryMatch() {
    if (matchedRef.current || matchingInProgressRef.current) return;
    if (phaseRef.current !== "searching") return;
    if (sessionConfirmRef.current) return;
    if (rematchPendingRef.current) return;

    const selfId = selfIdRef.current;
    if (!selfId) return;

    matchingInProgressRef.current = true;

    try {
      const skipIds = chatSessionUsers.length > 0 ? [...chatSessionUsers] : undefined;

      const result = await attemptMatch(sessionDuration, topicConfig, skipIds).catch((err) => {
        console.error("[WaitingRoom] attemptMatch error:", err);
        return null;
      });

      if (unmountedRef.current) return;

      // ── No match and we were skipping session users — check if only session users remain ──
      if (!result && skipIds && skipIds.length > 0) {
        const nav = (location.state as any) || {};
        let q = supabase
          .from("matchmaking_queue")
          .select("user_id")
          .eq("status", "waiting")
          .neq("user_id", selfId);
        if (nav.circleId) q = q.eq("circle_id", nav.circleId);
        else q = q.is("circle_id", null);

        const { data: waitingUsers } = await q.limit(10);

        if (waitingUsers && waitingUsers.length > 0) {
          const allSessionUsers = waitingUsers.every((u) => chatSessionUsers.includes(u.user_id));
          if (allSessionUsers) {
            const candidate = waitingUsers.find((u) => !declinedRef.current.has(u.user_id));
            if (candidate) {
              const { data: prof } = await supabase
                .from("profiles")
                .select("id, first_name, last_name, profile_picture_url")
                .eq("id", candidate.user_id)
                .single();
              if (prof && !unmountedRef.current && !matchedRef.current) {
                setSessionConfirm({
                  id: prof.id,
                  name: `${prof.first_name} ${prof.last_name}`.trim(),
                  picture: prof.profile_picture_url,
                });
              }
            }
          }
        }
        matchingInProgressRef.current = false;
        return;
      }

      if (!result) { matchingInProgressRef.current = false; return; }

      // ── Match found — fetch profile BEFORE setting matchedRef ──
      const [{ data: callData }, { data: peerProfile, error: profErr }] = await Promise.all([
        supabase.from("call_history").select("agreed_duration_minutes, started_at, circle_id").eq("id", result.callId).single(),
        supabase.from("profiles").select("*, user_interests(interest_id)").eq("id", result.matchedUserId).single(),
      ]);

      if (profErr || !peerProfile || unmountedRef.current) {
        console.error("[WaitingRoom] profile fetch failed:", profErr);
        matchingInProgressRef.current = false;
        return;
      }

      let peerCircleRole: string | null = null;
      if (callData?.circle_id) {
        const { data: cm } = await supabase.from("circle_members").select("role").eq("user_id", result.matchedUserId).eq("circle_id", callData.circle_id).maybeSingle();
        peerCircleRole = cm?.role || null;
      }

      matchedRef.current = true;
      matchingInProgressRef.current = false;

      await enterConnecting(
        profileToMatchedUser(peerProfile, peerCircleRole),
        result.callId,
        callData?.agreed_duration_minutes || sessionDuration,
        callData?.started_at || new Date().toISOString(),
      );
    } catch (err) {
      console.error("[WaitingRoom] tryMatch error:", err);
      matchingInProgressRef.current = false;
    }
  }

  // =====================================================================
  //  Handle incoming call (recipient side)
  // =====================================================================

  async function handleIncoming(call: any) {
    if (matchedRef.current || unmountedRef.current) return;

    const selfId = selfIdRef.current;
    if (!selfId) return;

    await supabase
      .from("matchmaking_queue")
      .update({ status: "matched", matched_at: new Date().toISOString() })
      .eq("user_id", selfId)
      .eq("status", "waiting");

    const { data: callerProfile, error } = await supabase
      .from("profiles")
      .select("*, user_interests(interest_id)")
      .eq("id", call.caller_id)
      .single();

    if (error || !callerProfile || unmountedRef.current) return;

    let callerCircleRole: string | null = null;
    if (call.circle_id) {
      const { data: cm } = await supabase.from("circle_members").select("role").eq("user_id", call.caller_id).eq("circle_id", call.circle_id).maybeSingle();
      callerCircleRole = cm?.role || null;
    }

    matchedRef.current = true;
    matchingInProgressRef.current = false;

    await enterConnecting(
      profileToMatchedUser(callerProfile, callerCircleRole),
      call.id,
      call.agreed_duration_minutes || sessionDuration,
      call.started_at || new Date().toISOString(),
    );
  }

  // Fallback poll for incoming calls (in case realtime subscription misses it)
  async function checkIncomingFallback() {
    if (matchedRef.current || phaseRef.current !== "searching") return;
    const selfId = selfIdRef.current;
    if (!selfId) return;
    try {
      const cutoff = new Date(Date.now() - 60_000).toISOString();
      const { data: call } = await supabase
        .from("call_history")
        .select("*")
        .eq("recipient_id", selfId)
        .eq("status", "ongoing")
        .gte("started_at", cutoff)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (call && !matchedRef.current) handleIncoming(call);
    } catch { /* ignore */ }
  }

  // =====================================================================
  //  Session-confirm accept / decline
  // =====================================================================

  async function handleConfirmAccept() {
    if (!sessionConfirm) return;
    const targetId = sessionConfirm.id;
    const selfId = selfIdRef.current;
    if (!selfId) return;

    // If they already requested us → mutual consent, accept immediately
    if (rematchRequestedBy === targetId) {
      rematchChannelRef.current?.send({ type: 'broadcast', event: 'rematch_accept', payload: { from: selfId, to: targetId } });
      await proceedWithRematch(targetId);
      return;
    }

    // Otherwise, broadcast our request and wait for their response
    setRematchPending(true);
    rematchPendingRef.current = true;
    rematchTargetRef.current = targetId;

    const broadcastRequest = () => {
      rematchChannelRef.current?.send({
        type: 'broadcast',
        event: 'rematch_request',
        payload: {
          from: selfId,
          to: targetId,
          name: profileData ? `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim() : 'User',
          picture: profileData?.profilePicture || null,
        },
      });
    };

    broadcastRequest();

    // Re-broadcast every 3s as heartbeat + verify target is still in queue
    if (rematchBroadcastRef.current) clearInterval(rematchBroadcastRef.current);
    rematchBroadcastRef.current = setInterval(() => {
      if (!rematchPendingRef.current || unmountedRef.current) {
        if (rematchBroadcastRef.current) { clearInterval(rematchBroadcastRef.current); rematchBroadcastRef.current = null; }
        return;
      }
      broadcastRequest();
      const tid = rematchTargetRef.current;
      if (tid) {
        supabase.from("matchmaking_queue").select("user_id").eq("user_id", tid).eq("status", "waiting").maybeSingle().then(({ data }) => {
          if (!data && rematchPendingRef.current && rematchTargetRef.current === tid && !unmountedRef.current) {
            clearRematchPending();
          }
        });
      }
    }, 3000);
  }

  function handleConfirmDecline() {
    if (!sessionConfirm) return;
    const targetId = sessionConfirm.id;
    const selfId = selfIdRef.current;

    // If they had requested us, tell them we declined
    if (rematchRequestedBy === targetId && selfId) {
      rematchChannelRef.current?.send({ type: 'broadcast', event: 'rematch_decline', payload: { from: selfId, to: targetId } });
    }

    declinedRef.current.add(targetId);
    setSessionConfirm(null);
    setRematchRequestedBy(null);
  }

  function cancelRematchPending() {
    const selfId = selfIdRef.current;
    const targetId = rematchTargetRef.current;
    if (selfId && targetId) {
      rematchChannelRef.current?.send({ type: 'broadcast', event: 'rematch_cancel', payload: { from: selfId, to: targetId } });
    }
    clearRematchPending();
  }

  // =====================================================================
  //  Cancel connecting & go home
  // =====================================================================

  async function handleCancelConnecting() {
    await cancelConnection();
    if (!unmountedRef.current) { setPhase("connectionFailed"); setConnectingUser(null); }
  }

  async function handleGoHome() {
    if (phaseRef.current === "connecting") await cancelConnection();
    if (rematchPendingRef.current) {
      const selfId = selfIdRef.current;
      const targetId = rematchTargetRef.current;
      if (selfId && targetId) {
        rematchChannelRef.current?.send({ type: 'broadcast', event: 'rematch_cancel', payload: { from: selfId, to: targetId } });
      }
      clearRematchPending();
    }
    matchedRef.current = false;
    cleanupReadyChannel();
    cleanupRematchChannel();
    clearAllTimers();
    navigate("/");
  }

  // =====================================================================
  //  Effects
  // =====================================================================

  // Unmount cleanup
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      clearAllTimers();
      cleanupReadyChannel();
      cleanupRematchChannel();
    };
  }, []);

  // Join queue on mount, leave on unmount
  useEffect(() => {
    let cancelled = false;

    const join = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;

        selfIdRef.current = user?.id || null;
        matchedRef.current = false;
        matchingInProgressRef.current = false;

        const selfId = selfIdRef.current;
        if (selfId) {
          await supabase
            .from("call_history")
            .update({ status: "cancelled", ended_at: new Date().toISOString() })
            .or(`caller_id.eq.${selfId},recipient_id.eq.${selfId}`)
            .eq("status", "ongoing");
          await supabase.from("profiles").update({ in_call: false }).eq("id", selfId);
          await supabase.from("matchmaking_queue").delete().eq("user_id", selfId);
        }

        if (cancelled) return;

        await joinMatchmakingQueue(matchmakingFilters, sessionDuration);
        console.log("[WaitingRoom] Joined queue");

        if (cancelled) return;

        await refreshCounts();
        initialMatchRef.current = setTimeout(() => { if (!unmountedRef.current) tryMatch(); }, 1000);
      } catch (err) {
        if (!cancelled) console.error("[WaitingRoom] join error:", err);
      }
    };
    join();

    return () => {
      cancelled = true;
      if (!matchedRef.current) leaveMatchmakingQueue().catch(console.error);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchmakingFilters, sessionDuration]);

  // Queue subscription
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const tid = setTimeout(() => {
      const selfId = selfIdRef.current;
      if (!selfId || unmountedRef.current) return;

      channel = supabase
        .channel(`queue_${selfId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "matchmaking_queue", filter: "status=eq.waiting" }, (payload) => {
          if (unmountedRef.current) return;
          refreshCounts();

          const uid = (payload.new as any)?.user_id || (payload.old as any)?.user_id;

          // New non-session user joined → dismiss session confirm + cancel pending rematch
          if (payload.eventType === "INSERT" && uid && uid !== selfIdRef.current && !chatSessionUsers.includes(uid)) {
            if (rematchPendingRef.current) {
              const sId = selfIdRef.current;
              const tId = rematchTargetRef.current;
              if (sId && tId) {
                rematchChannelRef.current?.send({ type: 'broadcast', event: 'rematch_cancel', payload: { from: sId, to: tId } });
              }
              clearRematchPending();
            }
            setSessionConfirm(null);
            setRematchRequestedBy(null);
          }

          if (phaseRef.current === "searching" && !matchedRef.current && !matchingInProgressRef.current) {
            tryMatch();
          }
        })
        .subscribe();
    }, 1000);

    return () => { clearTimeout(tid); if (channel) supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchmakingFilters, chatSessionUsers]);

  // Call-history INSERT subscription (recipient detection)
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const selfId = user?.id || profileData?.id;
      if (!selfId) return;

      channel = supabase
        .channel(`calls_${selfId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_history", filter: `recipient_id=eq.${selfId}` }, (payload: any) => {
          if (!active || unmountedRef.current) return;
          handleIncoming(payload.new);
        })
        .subscribe();
    })();

    return () => { active = false; if (channel) supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData?.id]);

  // Rematch consent broadcast channel
  useEffect(() => {
    const selfId = profileData?.id;
    if (!selfId) return;

    const circleId = matchmakingFilters.circleId || 'global';
    const channel = supabase.channel(`rematch:${circleId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'rematch_request' }, ({ payload }) => {
        if (unmountedRef.current || payload.to !== selfId) return;
        setRematchRequestedBy(payload.from);

        // Show/update session confirm prompt for the requester
        if (!sessionConfirmRef.current || sessionConfirmRef.current.id !== payload.from) {
          setSessionConfirm({
            id: payload.from,
            name: payload.name || 'User',
            picture: payload.picture || null,
          });
        }

        // If we already clicked Talk Again for them → mutual consent!
        if (rematchPendingRef.current && rematchTargetRef.current === payload.from) {
          rematchChannelRef.current?.send({ type: 'broadcast', event: 'rematch_accept', payload: { from: selfId, to: payload.from } });
          proceedWithRematchRef.current(payload.from);
        }
      })
      .on('broadcast', { event: 'rematch_accept' }, ({ payload }) => {
        if (unmountedRef.current || payload.to !== selfId) return;
        proceedWithRematchRef.current(payload.from);
      })
      .on('broadcast', { event: 'rematch_decline' }, ({ payload }) => {
        if (unmountedRef.current || payload.to !== selfId) return;
        declinedRef.current.add(payload.from);
        clearRematchPending();
        setSessionConfirm(null);
        setRematchRequestedBy(null);
      })
      .on('broadcast', { event: 'rematch_cancel' }, ({ payload }) => {
        if (unmountedRef.current || payload.to !== selfId) return;
        setRematchRequestedBy((prev) => prev === payload.from ? null : prev);
        // If we were showing a prompt for them and they cancelled, dismiss it
        if (sessionConfirmRef.current?.id === payload.from) {
          setSessionConfirm(null);
        }
      })
      .subscribe();

    rematchChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      rematchChannelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData?.id, matchmakingFilters.circleId]);

  // Polling (every 2 s)
  useEffect(() => {
    const t = setTimeout(() => { if (!unmountedRef.current) refreshCounts(); }, 500);
    pollRef.current = setInterval(() => {
      if (unmountedRef.current) return;
      if (matchedRef.current) { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } return; }
      refreshCounts();
      if (phaseRef.current === "searching" && !matchingInProgressRef.current) { tryMatch(); checkIncomingFallback(); }
    }, 2000);
    return () => { clearTimeout(t); if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // connectionFailed → re-join queue → searching after 3 s
  useEffect(() => {
    if (phase !== "connectionFailed") return;
    failedResetRef.current = setTimeout(async () => {
      if (unmountedRef.current) return;
      try { await joinMatchmakingQueue(matchmakingFilters, sessionDuration); } catch { /* ignore */ }
      if (unmountedRef.current) return;
      matchedRef.current = false;
      matchingInProgressRef.current = false;
      setPhase("searching");
      setConnectingUser(null);
    }, 3000);
    return () => { if (failedResetRef.current) { clearTimeout(failedResetRef.current); failedResetRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Dino high score
  useEffect(() => {
    if (!profileData?.id) return;
    supabase.from("profiles").select("dino_high_score").eq("id", profileData.id).single().then(({ data }) => {
      if (data?.dino_high_score) setDinoHs(data.dino_high_score);
    });
  }, [profileData?.id]);

  // Dino game messages
  useEffect(() => {
    const h = (e: MessageEvent) => {
      if (e.data?.type === "dinoGameStarted") setGameStarted(true);
      if (e.data?.type === "dinoHighScore" && profileData?.id) {
        const s = e.data.score as number;
        setDinoHs(s);
        supabase.from("profiles").update({ dino_high_score: s }).eq("id", profileData.id).then();
      }
    };
    window.addEventListener("message", h);
    return () => window.removeEventListener("message", h);
  }, [profileData?.id]);

  // Forward Space to dino iframe
  useEffect(() => {
    if (isMobile) return;
    const h = (e: KeyboardEvent) => {
      if (e.key !== " " && e.code !== "Space") return;
      const t = e.target as HTMLElement;
      const tag = t?.tagName?.toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable) return;
      const iframe = dinoIframeRef.current;
      if (!iframe?.contentWindow) return;
      e.preventDefault();
      iframe.contentWindow.postMessage({ type: "dinoForwardKey", keyCode: 32 }, "*");
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [isMobile]);

  // =====================================================================
  //  Render
  // =====================================================================

  return (
    <AdaptiveLayout>
      <div className="h-screen flex items-center justify-center p-4 overflow-hidden">
        <div className={`max-w-4xl w-full flex flex-col gap-4 ${isMobile ? "py-8" : ""}`}>

          {/* ── connectionFailed ────────────────────────────────────── */}
          {phase === "connectionFailed" && (
            <div className="text-center flex-shrink-0">
              <div className="mx-auto w-16 h-16 md:w-20 md:h-20 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
                <X className="h-8 w-8 md:h-10 md:w-10 text-destructive" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Connection Unsuccessful</h1>
              <p className="text-sm md:text-base text-muted-foreground mb-4">
                Couldn't establish a connection. Continuing search…
              </p>
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
            </div>
          )}

          {/* ── connecting ─────────────────────────────────────────── */}
          {phase === "connecting" && connectingUser && (
            <div className="text-center flex-shrink-0">
              <div className="mx-auto mb-4">
                <Avatar className="h-20 w-20 mx-auto border-4 border-white shadow-lg animate-pulse">
                  <AvatarImage src={connectingUser.profilePicture || ""} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl font-bold">
                    {`${connectingUser.firstName?.[0] || ""}${connectingUser.lastName?.[0] || ""}`}
                  </AvatarFallback>
                </Avatar>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                Connecting to {connectingUser.firstName}…
              </h1>
              <p className="text-sm md:text-base text-muted-foreground mb-6">
                Verifying connection with your match
              </p>
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-4" />
              <Button variant="ghost" onClick={handleCancelConnecting} className="text-muted-foreground">
                Cancel
              </Button>
            </div>
          )}

          {/* ── searching ──────────────────────────────────────────── */}
          {phase === "searching" && (
            <>
              {rematchPending && sessionConfirm ? (
                /* Waiting for partner's response after clicking Talk Again */
                <div className="text-center flex-shrink-0">
                  <div className="mx-auto mb-4">
                    <Avatar className="h-20 w-20 mx-auto border-4 border-white shadow-lg animate-pulse">
                      <AvatarImage src={sessionConfirm.picture || ""} />
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl font-bold">
                        {sessionConfirm.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold mb-2">
                    Connecting with {sessionConfirm.name.split(" ")[0]}…
                  </h1>
                  <p className="text-sm md:text-base text-muted-foreground mb-6">
                    Waiting for them to accept your request to talk again
                  </p>
                  <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-4" />
                  <Button variant="ghost" onClick={cancelRematchPending} className="text-muted-foreground">
                    Cancel
                  </Button>
                </div>
              ) : sessionConfirm ? (
                /* Session confirm prompt — optionally with incoming request indicator */
                <div className="text-center flex-shrink-0">
                  <div className="mx-auto mb-4">
                    <Avatar className="h-20 w-20 mx-auto border-4 border-white shadow-lg">
                      <AvatarImage src={sessionConfirm.picture || ""} />
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl font-bold">
                        {sessionConfirm.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <h1 className="text-xl md:text-2xl font-bold mb-2">
                    Only {sessionConfirm.name.split(" ")[0]} is available
                  </h1>
                  {rematchRequestedBy === sessionConfirm.id ? (
                    <p className="text-sm md:text-base text-primary font-medium mb-6">
                      {sessionConfirm.name.split(" ")[0]} wants to talk again!
                    </p>
                  ) : (
                    <p className="text-sm md:text-base text-muted-foreground mb-6">
                      You've already chatted during this session. Want to talk again?
                    </p>
                  )}
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={handleConfirmDecline} className="px-6">
                      Keep Waiting
                    </Button>
                    <Button onClick={handleConfirmAccept} className="px-6 bg-gradient-primary hover:opacity-90">
                      Talk Again
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center flex-shrink-0">
                  <div className="mx-auto w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-primary flex items-center justify-center mb-4 animate-pulse">
                    <Loader2 className="h-8 w-8 md:h-10 md:w-10 text-white animate-spin" />
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold mb-4">Finding Your Match…</h1>
                  <p className="text-sm md:text-base text-muted-foreground mb-2">
                    We're connecting you with someone who matches your preferences
                  </p>
                </div>
              )}
            </>
          )}

          {/* Stats (visible in searching + connecting) */}
          {phase !== "connectionFailed" && (
            <div className="grid grid-cols-3 mx-2 md:mx-20 mb-4 md:mb-0 gap-2 md:gap-6 flex-shrink-0">
              <div className="bg-card/80 rounded-2xl p-2 md:p-4 text-center shadow-apple-md border-2 border-border">
                <Users className="h-4 w-4 md:h-6 md:w-6 mx-auto mb-1 md:mb-2 text-primary" />
                <div className="text-lg md:text-2xl font-bold">{stats.matchingUsers}</div>
                <div className="text-xs md:text-sm text-muted-foreground">Available Now</div>
              </div>
              <div className="bg-card/80 rounded-2xl p-2 md:p-4 text-center shadow-apple-md border-2 border-border">
                <Users className="h-4 w-4 md:h-6 md:w-6 mx-auto mb-1 md:mb-2 text-warning" />
                <div className="text-lg md:text-2xl font-bold">{stats.chattingUsers}</div>
                <div className="text-xs md:text-sm text-muted-foreground">Currently Chatting</div>
              </div>
              <div className="bg-card/80 rounded-2xl p-2 md:p-4 text-center shadow-apple-md border-2 border-border">
                <Clock className="h-4 w-4 md:h-6 md:w-6 mx-auto mb-1 md:mb-2 text-primary" />
                <div className="text-lg md:text-2xl font-bold">~{estimatedWait}s</div>
                <div className="text-xs md:text-sm text-muted-foreground">Estimated Wait</div>
              </div>
            </div>
          )}

          {/* Dino game — searching phase, desktop only */}
          {phase === "searching" && !isMobile && !sessionConfirm && (
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="relative rounded-xl overflow-hidden bg-transparent" style={{ width: "100%", maxWidth: 620 }}>
                <iframe
                  ref={dinoIframeRef}
                  src={`/dino-game.html?uid=${profileData?.id || "guest"}&hs=${dinoHs}`}
                  title="Dino game"
                  style={{ border: "none", background: "transparent", width: "100%", height: 160, display: "block" }}
                />
                <div
                  className="absolute inset-0 flex flex-col items-center top-10 gap-4 pointer-events-none select-none transition-opacity duration-500"
                  style={{ opacity: gameStarted ? 0 : 1, fontFamily: "'Press Start 2P', cursive" }}
                >
                  <span className="text-[10px] md:text-sm text-center leading-relaxed">Play while you wait!</span>
                  <span className="text-[8px] md:text-[10px] text-muted-foreground" style={{ animation: "dino-hint-bounce 1.5s ease-in-out infinite" }}>
                    Press space to start
                  </span>
                </div>
              </div>
              <p className="text-xs md:text-[10px] text-muted-foreground text-center flex-shrink-0" style={{ opacity: gameStarted ? 1 : 0, fontFamily: "'Press Start 2P', cursive" }}>
                Space / Click to Jump
              </p>
            </div>
          )}

          {/* Cancel & Return Home */}
          <div className="flex justify-center flex-shrink-0">
            <Button variant="destructive" onClick={handleGoHome} className="relative overflow-hidden group">
              <span className="relative z-10">Cancel & Return Home</span>
              <span className="absolute inset-0 bg-white/20 scale-0 group-active:scale-100 rounded-xl transition-transform duration-300 origin-center" />
            </Button>
          </div>
        </div>
      </div>
    </AdaptiveLayout>
  );
}
