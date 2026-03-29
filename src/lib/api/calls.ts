import { supabase } from '@/lib/supabase';

export type PresetType = 'default' | 'circle' | 'user';

export interface CallHistory {
  id: string;
  caller_id: string;
  recipient_id: string;
  circle_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration: number | null;
  caller_rating: number | null;
  recipient_rating: number | null;
  caller_feedback: string | null;
  recipient_feedback: string | null;
  topics: string[] | null;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'missed';
  caller_topic_preset: string | null;
  caller_preset_type: PresetType | null;
  caller_custom_topics: string[] | null;
  caller_custom_questions: string[] | null;
  recipient_topic_preset: string | null;
  recipient_preset_type: PresetType | null;
  recipient_custom_topics: string[] | null;
  recipient_custom_questions: string[] | null;
}

/**
 * Update recipient's topic preset when joining a call
 */
export async function updateRecipientPreset(
  callId: string,
  topicConfig: {
    topicPreset?: string;
    presetType?: PresetType;
    customTopics?: string[];
    customQuestions?: string[];
  }
) {
  // Resolve current user so every write is scoped to recipient_id = current user.
  // This mirrors the guard that the update_recipient_preset RPC already applies,
  // preventing the caller from accidentally overwriting the recipient's preset_type.
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  // First try RPC, fall back to direct update if RPC doesn't support preset_type
  try {
    const { error } = await supabase.rpc('update_recipient_preset', {
      p_call_id: callId,
      recipient_topic_preset: topicConfig.topicPreset || null,
      recipient_custom_topics: topicConfig.customTopics || null,
      recipient_custom_questions: topicConfig.customQuestions || null,
    });

    if (error) {
      throw error;
    }

    // Update preset_type separately (RPC may not support it yet).
    // Guard with recipient_id so only the actual recipient can write this field.
    if (topicConfig.presetType && userId) {
      await supabase
        .from('call_history')
        .update({ recipient_preset_type: topicConfig.presetType })
        .eq('id', callId)
        .eq('recipient_id', userId);
    }
  } catch (error) {
    console.error('Failed to update recipient preset via RPC, trying direct update:', error);
    
    // Fallback to direct update — same recipient_id guard as the RPC.
    const { error: updateError } = await supabase
      .from('call_history')
      .update({
        recipient_topic_preset: topicConfig.topicPreset || null,
        recipient_preset_type: topicConfig.presetType || null,
        recipient_custom_topics: topicConfig.customTopics || null,
        recipient_custom_questions: topicConfig.customQuestions || null,
      })
      .eq('id', callId)
      .eq('recipient_id', userId);

    if (updateError) {
      console.error('Failed to update recipient preset:', updateError);
      throw updateError;
    }
  }
}

/**
 * Start a new call
 */
export async function startCall(recipientId: string, circleId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('call_history')
    .insert({
      caller_id: user.id,
      recipient_id: recipientId,
      circle_id: circleId || null,
      started_at: new Date().toISOString(),
      status: 'ongoing',
    })
    .select()
    .single();

  if (error) throw error;

  // Update both users' call status
  await supabase
    .from('profiles')
    .update({ in_call: true })
    .in('id', [user.id, recipientId]);

  return data;
}

/**
 * End a call (idempotent — safe to call multiple times).
 * Returns the call row or null if the call was already ended / not found.
 */
export async function endCall(callId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  const { data: call } = await supabase
    .from('call_history')
    .select('*')
    .eq('id', callId)
    .single();

  // Already ended, deleted, or never existed — treat as success
  if (!call) return null;
  if (call.status !== 'ongoing') return call;

  const endedAt = new Date().toISOString();
  const startedAt = new Date(call.started_at);
  const duration = Math.floor((new Date(endedAt).getTime() - startedAt.getTime()) / 1000);

  const { data, error } = await supabase
    .from('call_history')
    .update({
      ended_at: endedAt,
      duration,
      status: 'completed',
    })
    .eq('id', callId)
    .eq('status', 'ongoing')
    .select()
    .single();

  if (error) {
    // Race: another caller already ended it — not a real error
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  await supabase
    .from('profiles')
    .update({ in_call: false })
    .in('id', [call.caller_id, call.recipient_id]);

  // Clean up any lingering matchmaking_queue entries for both participants
  // so neither user appears as "waiting" after the call ends.
  await supabase
    .from('matchmaking_queue')
    .delete()
    .in('user_id', [call.caller_id, call.recipient_id])
    .in('status', ['waiting', 'matched']);

  return data;
}

/**
 * Rate a call
 */
export async function rateCall(
  callId: string,
  rating: number,
  feedback?: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  // Get call details to determine if user is caller or recipient
  const { data: call } = await supabase
    .from('call_history')
    .select('*')
    .eq('id', callId)
    .single();

  if (!call) throw new Error('Call not found');

  const isCaller = call.caller_id === user.id;
  const isRecipient = call.recipient_id === user.id;

  if (!isCaller && !isRecipient) {
    throw new Error('You are not a participant in this call');
  }

  const updates: any = {};
  if (isCaller) {
    updates.caller_rating = rating;
    if (feedback) updates.caller_feedback = feedback;
  } else {
    updates.recipient_rating = rating;
    if (feedback) updates.recipient_feedback = feedback;
  }

  const { data, error } = await supabase
    .from('call_history')
    .update(updates)
    .eq('id', callId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Get call history for current user
 */
export async function getCallHistory(limit = 20) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('call_history')
    .select(`
      *,
      caller:profiles!caller_id (*),
      recipient:profiles!recipient_id (*)
    `)
    .or(`caller_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return data;
}

/**
 * Get call details by ID
 */
export async function getCallById(callId: string) {
  const { data, error } = await supabase
    .from('call_history')
    .select(`
      *,
      caller:profiles!caller_id (*),
      recipient:profiles!recipient_id (*)
    `)
    .eq('id', callId)
    .single();

  if (error) throw error;

  return data;
}

/**
 * Get ongoing call for current user
 */
export async function getCurrentCall() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('call_history')
    .select(`
      *,
      caller:profiles!caller_id (*),
      recipient:profiles!recipient_id (*)
    `)
    .or(`caller_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .eq('status', 'ongoing')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - no ongoing call
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * Report a user after a call
 */
export async function reportUser(
  reportedUserId: string,
  callId: string,
  reason: string,
  description?: string,
  evidenceUrls?: string[]
) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: user.id,
      reported_id: reportedUserId,
      call_id: callId,
      reason,
      description: description || null,
      evidence_urls: evidenceUrls || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Block a user
 */
export async function blockUser(userId: string, reason?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('blocked_users')
    .insert({
      blocker_id: user.id,
      blocked_id: userId,
      reason: reason || null,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Get blocked users
 */
export async function getBlockedUsers() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('blocked_users')
    .select(`
      *,
      blocked_profile:profiles!blocked_id (*)
    `)
    .eq('blocker_id', user.id);

  if (error) throw error;

  return data;
}

/**
 * Unblock a user
 */
export async function unblockUser(userId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', userId);

  if (error) throw error;
}

/**
 * Save wrap-up decision (connect or skip) after a call
 * Returns the result: 'pending' (waiting for other user), 'connected' (both connected), or 'skipped'
 */
export async function saveWrapupDecision(
  callId: string,
  decision: 'connect' | 'skip'
): Promise<{ status: 'pending' | 'connected' | 'skipped'; your_decision: string; other_decision: string | null }> {
  const { data, error } = await supabase.rpc('save_wrapup_decision', {
    p_call_id: callId,
    p_decision: decision,
  });

  if (error) {
    console.error('Error saving wrap-up decision:', error);
    throw error;
  }

  return data;
}

/**
 * Get the wrap-up status for a call
 */
export async function getWrapupStatus(callId: string): Promise<{
  status: 'awaiting_your_decision' | 'pending' | 'connected' | 'skipped';
  your_decision: string | null;
  other_decision: string | null;
}> {
  const { data, error } = await supabase.rpc('get_wrapup_status', {
    p_call_id: callId,
  });

  if (error) {
    console.error('Error getting wrap-up status:', error);
    throw error;
  }

  return data;
}

/**
 * Get call statistics
 */
export async function getCallStats() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('call_history')
    .select('*')
    .or(`caller_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .eq('status', 'completed');

  if (error) throw error;

  const totalCalls = data.length;
  const totalDuration = data.reduce((sum, call) => sum + (call.duration || 0), 0);
  const averageDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

  // Calculate average rating received
  const ratingsReceived = data
    .filter(call => {
      const rating = call.caller_id === user.id ? call.recipient_rating : call.caller_rating;
      return rating !== null;
    })
    .map(call => call.caller_id === user.id ? call.recipient_rating : call.caller_rating);

  const averageRating = ratingsReceived.length > 0
    ? ratingsReceived.reduce((sum: number, rating: number) => sum + rating, 0) / ratingsReceived.length
    : 0;

  return {
    totalCalls,
    totalDuration,
    averageDuration,
    averageRating,
    ratingsCount: ratingsReceived.length,
  };
}

