import { supabase } from '@/lib/supabase';

export interface MatchmakingFilters {
  circleId?: string;
  preferredRoles?: ('mentor' | 'mentee' | 'alumni')[];
  preferredTopics?: string[];
  filterSimilarInterests?: boolean;
  filterSimilarBackground?: boolean;
}

export interface MatchmakingQueueEntry {
  id: string;
  user_id: string;
  circle_id: string | null;
  preferred_roles: string[] | null;
  preferred_topics: string[] | null;
  filter_similar_interests: boolean;
  filter_similar_background: boolean;
  status: 'waiting' | 'matched' | 'cancelled';
  joined_queue_at: string;
  matched_at: string | null;
}

/**
 * Join the matchmaking queue
 */
export async function joinMatchmakingQueue(filters: MatchmakingFilters) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  // Check if user is already in queue
  const { data: existingEntry } = await supabase
    .from('matchmaking_queue')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'waiting')
    .single();

  if (existingEntry) {
    throw new Error('You are already in the queue');
  }

  const { data, error } = await supabase
    .from('matchmaking_queue')
    .insert({
      user_id: user.id,
      circle_id: filters.circleId || null,
      preferred_roles: filters.preferredRoles || null,
      preferred_topics: filters.preferredTopics || null,
      filter_similar_interests: filters.filterSimilarInterests || false,
      filter_similar_background: filters.filterSimilarBackground || false,
      status: 'waiting',
    })
    .select()
    .single();

  if (error) throw error;

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
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - not in queue
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * Find potential matches based on filters
 */
export async function findMatches(filters: MatchmakingFilters) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  // Get current user's profile
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!currentProfile) throw new Error('Profile not found');

  // Get current user's interests if filtering by interests
  let currentUserInterests: string[] = [];
  if (filters.filterSimilarInterests) {
    const { data: interests } = await supabase
      .from('user_interests')
      .select('interest_id')
      .eq('user_id', user.id);
    
    currentUserInterests = interests?.map(i => i.interest_id) || [];
  }

  // Build base query
  let query = supabase
    .from('matchmaking_queue')
    .select(`
      *,
      profiles (*)
    `)
    .eq('status', 'waiting')
    .neq('user_id', user.id);

  // Apply circle filter
  if (filters.circleId) {
    query = query.eq('circle_id', filters.circleId);
  }

  const { data: potentialMatches, error } = await query;

  if (error) throw error;

  // Filter matches based on criteria
  let matches = potentialMatches || [];

  // Filter by role preferences
  if (filters.preferredRoles && filters.preferredRoles.length > 0) {
    matches = matches.filter(match => {
      const profile = match.profiles as any;
      return profile && filters.preferredRoles!.includes(profile.role);
    });
  }

  // Filter by similar interests
  if (filters.filterSimilarInterests && currentUserInterests.length > 0) {
    const matchesWithInterests = await Promise.all(
      matches.map(async (match) => {
        const { data: matchInterests } = await supabase
          .from('user_interests')
          .select('interest_id')
          .eq('user_id', match.user_id);
        
        const matchInterestIds = matchInterests?.map(i => i.interest_id) || [];
        const commonInterests = currentUserInterests.filter(id =>
          matchInterestIds.includes(id)
        );
        
        return {
          ...match,
          commonInterestsCount: commonInterests.length,
        };
      })
    );

    // Filter matches with at least one common interest and sort by most common
    matches = matchesWithInterests
      .filter(m => m.commonInterestsCount > 0)
      .sort((a, b) => b.commonInterestsCount - a.commonInterestsCount);
  }

  // Filter by similar background
  if (filters.filterSimilarBackground) {
    matches = matches.filter(match => {
      const profile = match.profiles as any;
      return (
        profile &&
        (profile.university === currentProfile.university ||
          profile.industry === currentProfile.industry)
      );
    });
  }

  return matches;
}

/**
 * Create a match between two users
 */
export async function createMatch(matchedUserId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  const now = new Date().toISOString();

  // Get circle_id from current user's queue entry
  const { data: queueEntry } = await supabase
    .from('matchmaking_queue')
    .select('circle_id')
    .eq('user_id', user.id)
    .eq('status', 'waiting')
    .single();

  // Create a call history entry FIRST
  const { data: call, error: callError } = await supabase
    .from('call_history')
    .insert({
      caller_id: user.id,
      recipient_id: matchedUserId,
      circle_id: queueEntry?.circle_id || null,
      started_at: now,
      status: 'ongoing',
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

