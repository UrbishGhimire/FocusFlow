import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

serve(async (req) => {
  // Triggered every 30 seconds
  // Checks for boundaries where notification was sent but no ack received after 10 seconds

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const tenSecondsAgo = Date.now() - 10000

  const { data: missed, error } = await supabase
    .from('scheduled_boundaries')
    .select(`
      id,
      session_id,
      target_timestamp,
      notification_sent_at,
      fallback_triggered,
      sessions(user_id)
    `)
    .eq('notification_sent', true)
    .eq('ack_received', false)
    .eq('fallback_triggered', false)
    .lt('target_timestamp', tenSecondsAgo)

  if (error || !missed || missed.length === 0) {
    return new Response(JSON.stringify({ fallbackCount: 0 }), { status: 200 })
  }

  for (const boundary of missed) {
    // Trigger fallback: SMS or email (placeholder)
    console.log(`[Fallback] Boundary ${boundary.id} missed. Triggering fallback for user ${boundary.sessions.user_id}`)

    // Mark fallback triggered
    await supabase
      .from('scheduled_boundaries')
      .update({ fallback_triggered: true })
      .eq('id', boundary.id)
  }

  return new Response(JSON.stringify({ fallbackCount: missed.length }), { status: 200 })
})
