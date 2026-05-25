/**
 * Agora API functions
 * Handles token generation and Agora-related API calls
 */

import { supabase } from '@/lib/supabase';
import { generateChannelName, generateAgoraUid } from '@/lib/agora/config';

export interface AgoraTokenResponse {
  token: string;
  channelName: string;
  uid: number;
}

/**
 * Get Agora token for a call
 * In production, this should call a backend function that generates tokens securely
 */
export async function getAgoraToken(callId: string): Promise<AgoraTokenResponse> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  // Generate channel name and UID
  const channelName = generateChannelName(callId);
  const uid = generateAgoraUid();

  try {
    // For development: If you don't have tokens enabled, return null token
    // For production: Call your edge function to generate a token
    const { data, error } = await supabase.functions.invoke('generate-agora-token', {
      body: {
        // Send the callId; the edge function derives the channel name and verifies
        // the caller is a participant of this call before issuing a token.
        callId,
        uid,
        role: 'publisher', // or 'subscriber'
      },
    });

    if (error) {
      console.warn('⚠️ Token generation failed, using null token (testing mode):', error);
      // In testing mode without token server, Agora allows null tokens if certificate is disabled
      return {
        token: '',
        channelName,
        uid,
      };
    }

    return {
      token: data.token,
      channelName,
      uid,
    };
  } catch (error) {
    console.warn('⚠️ Token generation error, using null token (testing mode):', error);
    // Fallback for development
    return {
      token: '',
      channelName,
      uid,
    };
  }
}

/**
 * Update call with Agora channel info
 */
export async function updateCallWithAgoraInfo(
  callId: string,
  channelName: string,
  uid: number
): Promise<void> {
  const { error } = await supabase
    .from('call_history')
    .update({
      agora_channel_name: channelName,
      agora_channel_uid: uid,
    })
    .eq('id', callId);

  if (error) {
    console.error('Failed to update call with Agora info:', error);
    throw error;
  }
}

/**
 * Send a call signal (for signaling connection state)
 */
export async function sendCallSignal(
  callId: string,
  signalType: 'agora_join' | 'agora_leave' | 'call_state',
  signalData?: any,
  callState?: 'ringing' | 'connecting' | 'connected' | 'ended'
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');


  const { data, error } = await supabase
    .from('call_signals')
    .insert({
      call_id: callId,
      user_id: user.id,
      signal_type: signalType,
      signal_data: signalData || null,
      call_state: callState || null,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to send call signal:', error);
    throw error;
  }
  
}

/**
 * Subscribe to call signals for real-time updates
 */
export function subscribeToCallSignals(
  callId: string,
  callback: (signal: any) => void
) {
  
  const channel = supabase
    .channel(`call_signals:${callId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'call_signals',
        filter: `call_id=eq.${callId}`,
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe((status) => {
    });

  return channel;
}

/**
 * Get call by ID with Agora info
 */
export async function getCallWithAgoraInfo(callId: string) {
  const { data, error } = await supabase
    .from('call_history')
    .select('*')
    .eq('id', callId)
    .single();

  if (error) throw error;

  return data;
}

