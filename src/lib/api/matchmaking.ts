import { supabase } from '@/lib/supabase';
import { computeSimilarityScore, ProfileForSimilarity } from '@/lib/similarity';

export interface MatchmakingFilters {
  circleId?: string;
  preferredRoles?: string[];
  preferredTopics?: string[];
  filterSimilarInterests?: boolean;
  filterSimilarBackground?: boolean;
  similarityPreference?: number; // 0=Different, 50=Balanced, 100=Similar
}

export interface MatchmakingQueueEntry {
  id: string;
  user_id: string;
  circle_id: string | null;
  preferred_roles: string[] | null;
  preferred_topics: string[] | null;
  filter_similar_interests: boolean;
  filter_similar_background: boolean;
  similarity_preference: number | null;
  session_duration_minutes: number;
  status: 'waiting' | 'matched' | 'cancelled';
  joined_queue_at: string;
  matched_at: string | null;
}

export interface MatchAttemptResult {
  callId: string;
  matchedUserId: string;
}

export interface MatchmakingStats {
  waitingCount: number;
  chattingUsers: number;
}

/**
 * Join the matchmaking queue
 */
export async function joinMatchmakingQueue(filters: MatchmakingFilters, sessionDuration: number = 15) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  // Clean up ANY existing queue entries for this user (all statuses) before inserting a fresh one
  const { error: deleteError } = await supabase
    .from('matchmaking_queue')
    .delete()
    .eq('user_id', user.id);

  if (deleteError) {
    console.error('Error cleaning up old queue entries:', deleteError);
    // Continue anyway - try to insert
  }

  // Small delay to ensure delete is committed
  await new Promise(resolve => setTimeout(resolve, 150));

  const { data, error } = await supabase
    .from('matchmaking_queue')
    .insert({
      user_id: user.id,
      circle_id: filters.circleId || null,
      preferred_roles: filters.preferredRoles || null,
      preferred_topics: filters.preferredTopics || null,
      filter_similar_interests: filters.filterSimilarInterests || false,
      filter_similar_background: filters.filterSimilarBackground || false,
      similarity_preference: filters.similarityPreference ?? null,
      session_duration_minutes: sessionDuration,
      status: 'waiting',
    })
    .select()
    .single();

  if (error) {
    // 23505 = unique constraint violation — entry already exists (e.g. React Strict Mode double-fire)
    if (error.code === '23505') {
      console.warn('[joinMatchmakingQueue] Entry already exists, recovering');
      const { data: existing } = await supabase
        .from('matchmaking_queue')
        .select()
        .eq('user_id', user.id)
        .eq('status', 'waiting')
        .order('joined_queue_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) return existing;
    }
    console.error('Error joining queue:', error);
    throw error;
  }

  // Set user status to online
  await supabase
    .from('profiles')
    .update({ is_online: true })
    .eq('id', user.id);

  return data;
}

/**
 * Leave the matchmaking queue
 */
export async function leaveMatchmakingQueue() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('matchmaking_queue')
    .update({ status: 'cancelled' })
    .eq('user_id', user.id)
    .eq('status', 'waiting');

  if (error) throw error;

  // Clear online/in_call flags so the user doesn't appear as a ghost
  await supabase
    .from('profiles')
    .update({ is_online: false, in_call: false })
    .eq('id', user.id);
}

/**
 * Get current queue status
 */
export async function getQueueStatus() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('matchmaking_queue')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'waiting')
    .maybeSingle();

  if (error) {
    if (error.code !== 'PGRST116') {
      throw error;
    }
    return null;
  }

  return data;
}

/**
 * Find potential matches based on filters
 */
export async function findMatches(filters: MatchmakingFilters) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  // Best-effort cleanup of duplicate waiting entries (if function exists)
  try {
    await supabase.rpc('cleanup_duplicate_queue_entries');
  } catch (e) {
    // ignore if function is not available
  }

  // Get current user's queue entry to check circle_id
  // Handle case where user might have multiple entries (shouldn't happen, but be defensive)
  const { data: queueEntries, error: queueError } = await supabase
    .from('matchmaking_queue')
    .select('circle_id, id, joined_queue_at')
    .eq('user_id', user.id)
    .eq('status', 'waiting')
    .order('joined_queue_at', { ascending: false })
    .limit(1);

  if (queueError) {
    console.error('Error fetching current queue entry:', queueError);
  }

  // If user has multiple entries, log a warning (this shouldn't happen)
  const { count: duplicateCount } = await supabase
    .from('matchmaking_queue')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'waiting');

  if (duplicateCount && duplicateCount > 1) {
    console.warn(`[findMatches] User ${user.id} has ${duplicateCount} waiting queue entries! Cleaning up...`);
    // Clean up duplicates, keep only the most recent one
    const { data: allEntries } = await supabase
      .from('matchmaking_queue')
      .select('id, joined_queue_at')
      .eq('user_id', user.id)
      .eq('status', 'waiting')
      .order('joined_queue_at', { ascending: false });
    
    if (allEntries && allEntries.length > 1) {
      // Delete all except the first (most recent)
      const idsToDelete = allEntries.slice(1).map(e => e.id);
      await supabase
        .from('matchmaking_queue')
        .delete()
        .in('id', idsToDelete);
      console.log(`[findMatches] Cleaned up ${idsToDelete.length} duplicate entries for user ${user.id}`);
    }
  }

  const currentQueueEntry = queueEntries && queueEntries.length > 0 ? queueEntries[0] : null;

  // Fetch current user profile with interests for similarity scoring
  const { data: currentProfileData } = await supabase
    .from('profiles')
    .select('id, role, industry, study_field, university, location, occupation, user_interests(interest_id)')
    .eq('id', user.id)
    .single();

  const currentSimilarityProfile: ProfileForSimilarity = {
    id: user.id,
    role: currentProfileData?.role || null,
    industry: currentProfileData?.industry || null,
    studyField: currentProfileData?.study_field || null,
    university: currentProfileData?.university || null,
    location: currentProfileData?.location || null,
    occupation: currentProfileData?.occupation || null,
    interests: (currentProfileData?.user_interests || []).map((i: any) => i.interest_id),
  };

  // Build query
  let query = supabase
    .from('matchmaking_queue')
    .select('*, profiles(*, user_interests(interest_id))')
    .eq('status', 'waiting')
    .neq('user_id', user.id);

  // Filter by circle_id: users in the same circle, or both have null (global matching)
  if (currentQueueEntry?.circle_id) {
    query = query.eq('circle_id', currentQueueEntry.circle_id);
  } else {
    // If current user has no circle, only match with others who also have no circle
    query = query.is('circle_id', null);
  }

  const { data, error } = await query
    .order('joined_queue_at', { ascending: true })
    .limit(20);

  if (error) {
    console.error('Error finding matches:', error);
    throw error;
  }

  console.log(`[findMatches] User ${user.id} found ${data?.length || 0} potential matches (circle_id: ${currentQueueEntry?.circle_id || 'null'})`);

  const seen = new Set<string>();
  const unique = (data || []).filter((row) => {
    if (seen.has(row.user_id)) return false;
    seen.add(row.user_id);
    return true;
  });

  let matches = unique;
  
  // Filter by role preferences
  if (filters.preferredRoles && filters.preferredRoles.length > 0) {
    matches = matches.filter((m) => {
      const profile = m.profiles as any;
      return profile && filters.preferredRoles!.includes(profile.role);
    });
  }

  // Sort by similarity (highest first) using full profile + interests
  matches = matches
    .map((m) => {
      const profile = m.profiles as any;
      const similarityProfile: ProfileForSimilarity = {
        id: profile?.id,
        role: profile?.role,
        industry: profile?.industry,
        studyField: profile?.study_field,
        university: profile?.university,
        location: profile?.location,
        occupation: profile?.occupation,
        interests: (profile?.user_interests || []).map((i: any) => i.interest_id),
      };
      const similarity = computeSimilarityScore(currentSimilarityProfile, similarityProfile);
      return { match: m, similarity };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .map((entry) => entry.match);

  return matches;
}

/**
 * Get count of potential matches based on filters
 * Uses the same logic as findMatches but only returns the length.
 */
export async function getMatchCount(filters: MatchmakingFilters) {
  const matches = await findMatches(filters);
  return matches.length;
}

/**
 * Atomically attempt to match the current user with a waiting peer.
 * Uses the server-side attempt_match RPC to avoid race conditions.
 */
export async function attemptMatch(
  sessionDuration: number = 15,
  topicConfig?: {
    topicPreset?: string;
    presetType?: 'default' | 'circle' | 'user';
    customTopics?: string[];
    customQuestions?: string[];
  },
  skipUserIds?: string[]
): Promise<MatchAttemptResult | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('attempt_match', {
    current_user_id: user.id,
    caller_topic_preset: topicConfig?.topicPreset || null,
    caller_custom_topics: topicConfig?.customTopics || null,
    caller_custom_questions: topicConfig?.customQuestions || null,
    caller_session_duration: sessionDuration,
    skip_user_ids: skipUserIds && skipUserIds.length > 0 ? skipUserIds : null,
  });

  if (error) {
    console.error('Error running attempt_match RPC:', error);
    throw error;
  }

  const row = Array.isArray(data) ? data?.[0] : data;

  if (!row || !row.call_id) return null;

  if (topicConfig?.presetType) {
    await supabase
      .from('call_history')
      .update({ caller_preset_type: topicConfig.presetType })
      .eq('id', row.call_id);
  }

  return {
    callId: row.call_id as string,
    matchedUserId: row.matched_user_id as string,
  };
}

/**
 * Send a "ready" signal for connection verification in the WaitingRoom.
 * Both users must send this before proceeding to the countdown.
 */
export async function sendReadySignal(callId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('call_signals')
    .insert({
      call_id: callId,
      user_id: user.id,
      signal_type: 'ready',
    });

  if (error) {
    console.error('Failed to send ready signal:', error);
    throw error;
  }
}

/**
 * Subscribe to ready signals for a specific call.
 * Returns the Supabase realtime channel (call .unsubscribe() to clean up).
 */
export function subscribeToReadySignals(
  callId: string,
  onReady: (userId: string) => void
) {
  const channel = supabase
    .channel(`ready_signals:${callId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'call_signals',
        filter: `call_id=eq.${callId}`,
      },
      (payload) => {
        const row = payload.new as any;
        if (row.signal_type === 'ready') {
          onReady(row.user_id);
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Get global matchmaking stats (waiting count excluding caller, chatting users)
 */
export async function getMatchmakingStats(): Promise<MatchmakingStats> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('get_matchmaking_stats', { current_user_id: user.id });

  if (error) {
    console.error('Error fetching matchmaking stats:', error);
    throw error;
  }

  const row = Array.isArray(data) ? data?.[0] : data;

  return {
    waitingCount: (row?.waiting_count as number) || 0,
    chattingUsers: (row?.chatting_users as number) || 0,
  };
}

/**
 * Create a match between two users
 */
export async function createMatch(
  matchedUserId: string,
  topicConfig?: {
    topicPreset?: string;
    presetType?: 'default' | 'circle' | 'user';
    customTopics?: string[];
    customQuestions?: string[];
  },
  callerDuration: number = 15
) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const now = new Date().toISOString();

  // Get circle_id and peer's duration from queue entries
  const [{ data: ownQueue }, { data: peerQueue }] = await Promise.all([
    supabase
      .from('matchmaking_queue')
      .select('circle_id, session_duration_minutes')
      .eq('user_id', user.id)
      .eq('status', 'waiting')
      .maybeSingle(),
    supabase
      .from('matchmaking_queue')
      .select('session_duration_minutes')
      .eq('user_id', matchedUserId)
      .eq('status', 'waiting')
      .maybeSingle(),
  ]);

  const peerDuration = peerQueue?.session_duration_minutes ?? 15;
  let agreedDuration: number;
  if (callerDuration === 0 && peerDuration === 0) {
    agreedDuration = 0;
  } else if (callerDuration === 0) {
    agreedDuration = peerDuration;
  } else if (peerDuration === 0) {
    agreedDuration = callerDuration;
  } else {
    agreedDuration = Math.min(callerDuration, peerDuration);
  }

  const { data: call, error: callError } = await supabase
    .from('call_history')
    .insert({
      caller_id: user.id,
      recipient_id: matchedUserId,
      circle_id: ownQueue?.circle_id || null,
      started_at: now,
      status: 'ongoing',
      caller_topic_preset: topicConfig?.topicPreset || null,
      caller_preset_type: topicConfig?.presetType || null,
      caller_custom_topics: topicConfig?.customTopics || null,
      caller_custom_questions: topicConfig?.customQuestions || null,
      agreed_duration_minutes: agreedDuration,
    })
    .select()
    .single();

  if (callError) throw callError;

  // Update current user's queue entry to matched
  const { error: updateError1 } = await supabase
    .from('matchmaking_queue')
    .update({
      status: 'matched',
      matched_at: now,
    })
    .eq('user_id', user.id)
    .eq('status', 'waiting');

  if (updateError1) {
    console.error('Failed to update own queue entry:', updateError1);
  }

  // Note: We don't update the matched user's queue entry here because:
  // 1. RLS prevents us from updating other users' entries
  // 2. The matched user will update their own entry when they receive the call_history INSERT notification
  // This is handled in WaitingRoom.tsx call_history subscription
  console.log(`[createMatch] Created call ${call.id} for user ${matchedUserId}. They will receive notification via call_history subscription.`);

  // Mark matched user as in_call so their UI reflects it immediately
  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({ in_call: true })
    .eq('id', matchedUserId);

  if (profileUpdateError) {
    console.warn('Failed to set matched user in_call:', profileUpdateError);
  }

  // Update current user's profile to in_call
  await supabase
    .from('profiles')
    .update({ in_call: true })
    .eq('id', user.id);

  // Note: The matched user will update their own queue entry when they receive
  // the real-time notification via the subscription in WaitingRoom

  return call;
}

/**
 * Get queue statistics (excluding current user)
 */
export async function getQueueStats(circleId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  let query = supabase
    .from('matchmaking_queue')
    .select('*', { count: 'exact' })
    .eq('status', 'waiting')
    .neq('user_id', user.id); // Exclude current user

  if (circleId) {
    query = query.eq('circle_id', circleId);
  }

  const { count, error } = await query;

  if (error) throw error;

  return {
    waitingCount: count || 0,
  };
}

/**
 * Subscribe to queue changes
 */
export function subscribeToQueue(
  circleId: string | null,
  callback: (payload: any) => void
) {
  const channel = supabase
    .channel('matchmaking_queue_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'matchmaking_queue',
        filter: circleId ? `circle_id=eq.${circleId}` : undefined,
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
