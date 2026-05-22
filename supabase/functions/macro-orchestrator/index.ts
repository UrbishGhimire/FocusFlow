import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

interface ScheduledBoundary {
  id: string
  session_id: string
  phase_id: string
  target_timestamp: number
  notification_sent: boolean
  fallback_triggered: boolean
}

serve(async (req) => {
  // This function is triggered by pg_cron every 15 seconds
  // It checks for pending phase boundaries and sends push notifications

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const now = Date.now()
  const windowStart = now - 15000 // 15 seconds ago
  const windowEnd = now + 30000   // 30 seconds from now

  // Fetch pending boundaries in the notification window
  const { data: boundaries, error } = await supabase
    .from('scheduled_boundaries')
    .select(`
      id,
      session_id,
      phase_id,
      target_timestamp,
      notification_sent,
      fallback_triggered,
      sessions!inner(user_id, protocol),
      phases!inner(phase_type, planned_duration_ms)
    `)
    .eq('notification_sent', false)
    .gte('target_timestamp', windowStart)
    .lte('target_timestamp', windowEnd)

  if (error) {
    console.error('[MacroOrchestrator] Fetch error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!boundaries || boundaries.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), { status: 200 })
  }

  const results = []

  for (const boundary of boundaries) {
    try {
      // Get user's push subscriptions
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', boundary.sessions.user_id)

      if (!subs || subs.length === 0) {
        console.log(`[MacroOrchestrator] No push subs for user ${boundary.sessions.user_id}`)
        continue
      }

      // Determine notification content based on phase type
      const phaseType = boundary.phases.phase_type
      const isTrough = phaseType === 'trough'

      const notification = {
        title: isTrough ? '⏰ Recovery Trough' : '⏰ Phase Complete',
        body: isTrough 
          ? 'Your 20-minute recovery starts now. Put your phone down.'
          : `Next: ${getPhaseDisplayName(phaseType)}`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: boundary.session_id,
        requireInteraction: isTrough, // Trough notifications must be dismissed
        data: {
          sessionId: boundary.session_id,
          phaseId: boundary.phase_id,
          boundaryId: boundary.id,
          phaseType,
          timestamp: boundary.target_timestamp,
        },
      }

      // Send push to all user devices
      for (const sub of subs) {
        await sendPushNotification(sub, notification)
      }

      // Mark as sent
      await supabase
        .from('scheduled_boundaries')
        .update({ 
          notification_sent: true, 
          notification_sent_at: new Date().toISOString() 
        })
        .eq('id', boundary.id)

      results.push({ boundaryId: boundary.id, status: 'sent' })

    } catch (err) {
      console.error(`[MacroOrchestrator] Failed for boundary ${boundary.id}:`, err)
      results.push({ boundaryId: boundary.id, status: 'error', error: err.message })
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), { status: 200 })
})

// Helper: Send Web Push notification
async function sendPushNotification(subscription: any, notification: any) {
  // In production, use web-push library or VAPID
  // This is a simplified placeholder
  console.log('[Push] Sending to:', subscription.endpoint)
  console.log('[Push] Payload:', JSON.stringify(notification))
}

// Helper: Get display name for phase type
function getPhaseDisplayName(type: string): string {
  const names: Record<string, string> = {
    sensory_reset: 'Sensory Reset',
    visual_priming: 'Visual Priming',
    sprint: 'Deep Sprint',
    micro_rest: 'Micro-Rest',
    deep_block: 'Deep Block',
    trough: 'Recovery Trough',
  }
  return names[type] || type
}
