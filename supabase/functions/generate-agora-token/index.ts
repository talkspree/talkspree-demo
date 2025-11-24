import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Use Agora's official RTC token builder
import { RtcTokenBuilder, RtcRole } from 'npm:agora-access-token@2.0.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Get request body
    const { channelName, uid, role = 'publisher' } = await req.json()

    if (!channelName || !uid) {
      throw new Error('Missing required parameters: channelName, uid')
    }

    // Get Agora credentials from database
    const { data: configData, error: configError } = await supabaseClient
      .rpc('get_agora_config')

    if (configError) {
      console.error('Config error:', configError)
      throw new Error('Failed to get Agora configuration')
    }

    // The RPC returns a single row with app_id and app_certificate columns
    const config = Array.isArray(configData) ? configData[0] : configData
    
    const appId = config?.app_id
    const appCertificate = config?.app_certificate

    if (!appId || !appCertificate) {
      console.error('Missing credentials:', { hasAppId: !!appId, hasCert: !!appCertificate })
      throw new Error('Agora credentials not configured')
    }

    // Set token expiration (24 hours)
    const expirationTimeInSeconds = 86400
    const currentTimestamp = Math.floor(Date.now() / 1000)
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds

    // Determine role: PUBLISHER can publish and subscribe, SUBSCRIBER can only subscribe
    const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER

    // Generate token using Agora's official token builder
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      agoraRole,
      privilegeExpiredTs,
      privilegeExpiredTs
    )

    console.log('Token generated successfully for user:', user.id)

    return new Response(
      JSON.stringify({
        token,
        channelName,
        uid,
        expiresAt: privilegeExpiredTs,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error generating token:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

