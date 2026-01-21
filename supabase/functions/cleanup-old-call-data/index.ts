// Supabase Edge Function to delete call history and signals older than 48 hours
// This can be scheduled using Supabase's cron feature in the dashboard
// Schedule: 0 * * * * (every hour)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Calculate the cutoff time (48 hours ago)
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 48);

    console.log(`Deleting call data older than: ${cutoffTime.toISOString()}`);

    // Delete old call_signals first
    const { count: signalsCount, error: signalsError } = await supabaseClient
      .from('call_signals')
      .delete({ count: 'exact' })
      .lt('created_at', cutoffTime.toISOString());

    if (signalsError) {
      console.error('Error deleting old call signals:', signalsError);
    } else {
      console.log(`Deleted ${signalsCount} old call signals`);
    }

    // Delete old call_history (this will cascade delete related records)
    const { count: callsCount, error: callsError } = await supabaseClient
      .from('call_history')
      .delete({ count: 'exact' })
      .lt('started_at', cutoffTime.toISOString());

    if (callsError) {
      console.error('Error deleting old call history:', callsError);
      throw callsError;
    }

    console.log(`Successfully deleted ${callsCount} old call history records`);

    return new Response(
      JSON.stringify({
        success: true,
        deletedCalls: callsCount,
        deletedSignals: signalsCount,
        cutoffTime: cutoffTime.toISOString(),
        message: `Deleted ${callsCount} calls and ${signalsCount} signals older than 48 hours`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});



