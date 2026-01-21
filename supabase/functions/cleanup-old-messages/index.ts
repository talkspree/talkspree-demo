// Supabase Edge Function to delete chat messages older than 48 hours
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

    console.log(`Deleting messages older than: ${cutoffTime.toISOString()}`);

    // Delete old messages
    const { data, error, count } = await supabaseClient
      .from('chat_messages')
      .delete({ count: 'exact' })
      .lt('created_at', cutoffTime.toISOString());

    if (error) {
      console.error('Error deleting old messages:', error);
      throw error;
    }

    console.log(`Successfully deleted ${count} old chat messages`);

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount: count,
        cutoffTime: cutoffTime.toISOString(),
        message: `Deleted ${count} messages older than 48 hours`
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



