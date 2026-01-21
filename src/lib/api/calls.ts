import { supabase } from '@/lib/supabase';

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
  caller_custom_topics: string[] | null;
  caller_custom_questions: string[] | null;
  recipient_topic_preset: string | null;
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
    customTopics?: string[];
    customQuestions?: string[];
  }
) {
  const { error } = await supabase.rpc('update_recipient_preset', {
    p_call_id: callId,
    recipient_topic_preset: topicConfig.topicPreset || null,
    recipient_custom_topics: topicConfig.customTopics || null,
    recipient_custom_questions: topicConfig.customQuestions || null,
  });

  if (error) {
    console.error('Failed to update recipient preset:', error);
    throw error;
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
 * End a call
 */
export async function endCall(callId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  // Get call details
  const { data: call } = await supabase
    .from('call_history')
    .select('*')
    .eq('id', callId)
    .single();

  if (!call) throw new Error('Call not found');

  const endedAt = new Date().toISOString();
  const startedAt = new Date(call.started_at);
  const duration = Math.floor((new Date(endedAt).getTime() - startedAt.getTime()) / 1000);

  const { data, error } = await supabase
    .from('call_history')
    .update({
      ended_at: endedAt,
      duration: duration,
      status: 'completed',
    })
    .eq('id', callId)
    .select()
    .single();

  if (error) throw error;

  // Update both users' call status
  await supabase
    .from('profiles')
    .update({ in_call: false })
    .in('id', [call.caller_id, call.recipient_id]);

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

