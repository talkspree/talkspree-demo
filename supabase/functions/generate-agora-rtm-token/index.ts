import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Use npm: specifier for better Deno compatibility
import { RtmTokenBuilder, RtmRole } from 'npm:agora-access-token@2.0.4'

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

    // Caller-scoped client (runs under the caller's JWT)
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

    // SECURITY: mint an RTM token only for the authenticated caller's own id.
    // The previous version trusted a client-supplied `userId`, letting any user
    // mint a token impersonating any other RTM user.
    const userId = user.id

    // Get Agora credentials with the SERVICE ROLE. get_agora_config() is no longer
    // exposed to anon/authenticated (see migration 083).
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const { data: configData, error: configError } = await adminClient
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

    // Set token expiration (1 hour)
    const expirationTimeInSeconds = 3600
    const currentTimestamp = Math.floor(Date.now() / 1000)
    const expireTimestamp = currentTimestamp + expirationTimeInSeconds

    // Generate RTM token using RtmTokenBuilder (RTM 1.x format)
    const token = RtmTokenBuilder.buildToken(
      appId,
      appCertificate,
      userId,
      RtmRole.Rtm_User,
      expireTimestamp
    )

    console.log('RTM Token generated successfully for user:', user.id)

    return new Response(
      JSON.stringify({
        token,
        userId,
        expiresAt: expireTimestamp,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error generating RTM token:', error)
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
