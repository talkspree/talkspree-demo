/**
 * Recovers call state from the database when React Router navigation state
 * is lost (e.g. after a page refresh). Returns the callId, matchedUser,
 * agreedDuration, and callStartTime so the call page can resume.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface RecoveredCallState {
  callId: string;
  matchedUser: {
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
  };
  agreedDuration: number;
  callStartTime: string;
}

export function useCallRecovery(
  navCallId: string | undefined,
  navMatchedUser: any | undefined
) {
  const [recovered, setRecovered] = useState<RecoveredCallState | null>(null);
  const [loading, setLoading] = useState(!navCallId || !navMatchedUser);

  useEffect(() => {
    // Navigation state is intact — no recovery needed
    if (navCallId && navMatchedUser) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const recover = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        // Find the user's most recent ongoing call (within 5 minutes to avoid zombie rows)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString();
        const { data: call } = await supabase
          .from('call_history')
          .select('*')
          .or(`caller_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .eq('status', 'ongoing')
          .gte('started_at', fiveMinutesAgo)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!call || cancelled) {
          setLoading(false);
          return;
        }

        const peerId = call.caller_id === user.id ? call.recipient_id : call.caller_id;

        const { data: peerProfile } = await supabase
          .from('profiles')
          .select('*, user_interests(interest_id)')
          .eq('id', peerId)
          .single();

        if (!peerProfile || cancelled) {
          setLoading(false);
          return;
        }

        setRecovered({
          callId: call.id,
          matchedUser: {
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
          },
          agreedDuration: call.agreed_duration_minutes || 15,
          callStartTime: call.started_at,
        });
      } catch (err) {
        console.error('Call recovery failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    recover();
    return () => { cancelled = true; };
  }, [navCallId, navMatchedUser]);

  return { recovered, loading };
}
