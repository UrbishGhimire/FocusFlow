import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

const profileIdCache = new Map<string, string>()

export async function getUserProfileId(authUserId: string) {
  if (!authUserId) return null
  const cached = profileIdCache.get(authUserId)
  if (cached) return cached
  const { data, error } = await (supabase
    .from('user_profiles') as any)
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  if (error) {
    console.error('getUserProfileId error:', error)
    return null
  }
  if (data?.id) profileIdCache.set(authUserId, data.id)
  return data?.id ?? null
}

// ===== Session & Phase Helpers (with as any to bypass type errors) =====

export async function saveSession(
  session: any,
  userId: string,
  syncState?: {
    phaseIndex?: number
    phaseStartTime?: number
    phaseEndTime?: number
    pausedAt?: number | null
    pauseRemainingMs?: number | null
    isInForcedTrough?: boolean
    pauseCountUsed?: number
  },
  options?: {
    allowStatusChange?: boolean
  }
) {
  const {
    id,
    protocol,
    startedAt,
    completedAt,
    status,
    totalDeepMinutes,
    interruptionCount,
    microPausesDelivered,
    microPausesMissed,
  } = session

  const syncFields: any = {}
  if (syncState?.phaseIndex !== undefined) syncFields.current_phase_index = syncState.phaseIndex
  if (syncState?.phaseStartTime !== undefined) syncFields.phase_started_at = syncState.phaseStartTime ? new Date(syncState.phaseStartTime).toISOString() : null
  if (syncState?.phaseEndTime !== undefined) syncFields.phase_end_at = syncState.phaseEndTime ? new Date(syncState.phaseEndTime).toISOString() : null
  if (syncState?.pausedAt !== undefined) syncFields.paused_at = syncState.pausedAt ? new Date(syncState.pausedAt).toISOString() : null
  if (syncState?.pauseRemainingMs !== undefined) syncFields.pause_remaining_ms = syncState.pauseRemainingMs
  if (syncState?.isInForcedTrough !== undefined) syncFields.is_in_forced_trough = syncState.isInForcedTrough
  if (syncState?.pauseCountUsed !== undefined) syncFields.pause_count_used = syncState.pauseCountUsed

  const payload = {
    id,
    user_id: userId,
    protocol,
    started_at: new Date(startedAt).toISOString(),
    completed_at: completedAt ? new Date(completedAt).toISOString() : null,
    status,
    total_deep_minutes: totalDeepMinutes,
    interruption_count: interruptionCount,
    micro_pauses_delivered: microPausesDelivered,
    micro_pauses_missed: microPausesMissed,
    updated_at: new Date().toISOString(),
    ...syncFields,
  }

  const isTerminal = status === 'completed' || status === 'aborted'
  const allowStatusChange = options?.allowStatusChange !== false

  let data: any = null
  let error: any = null

  if (isTerminal) {
    const res = await (supabase
      .from('sessions') as any)
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single()
    data = res.data
    error = res.error
  } else {
    let query = (supabase
      .from('sessions') as any)
      .update(payload)
      .eq('id', id)
      .not('status', 'in', '("completed","aborted")')

    if (!allowStatusChange && status === 'running') {
      query = query.eq('status', 'running')
    }

    const updateRes = await query.select().maybeSingle()
    data = updateRes.data
    error = updateRes.error
    if (!error && !data) {
      const insertRes = await (supabase
        .from('sessions') as any)
        .upsert(payload, { onConflict: 'id', ignoreDuplicates: true })
        .select()
        .maybeSingle()
      data = insertRes.data
      error = insertRes.error
    }
  }

  if (error) console.error('saveSession error:', error)
  return { data, error }
}

export async function savePhases(phases: any[], sessionId: string) {
  const phaseRows = phases.map((p, idx) => ({
    session_id: sessionId,
    phase_index: idx,
    phase_type: p.type,
    planned_duration_ms: p.plannedDurationMs,
    actual_duration_ms: p.actualDurationMs || null,
    started_at: p.startedAt ? new Date(p.startedAt).toISOString() : null,
    ended_at: p.endedAt ? new Date(p.endedAt).toISOString() : null,
    completed: p.completed,
    skipped: p.skipped,
  }))

  const { error } = await (supabase
    .from('phases') as any)
    .upsert(phaseRows, { onConflict: 'session_id, phase_index' })

  if (error) console.error('savePhases error:', error)
  return { error }
}

export async function loadSession(sessionId: string) {
  const { data: session, error: sessionError } = await (supabase
    .from('sessions') as any)
    .select('*')
    .eq('id', sessionId)
    .single()

  if (sessionError) return null

  const { data: phases, error: phasesError } = await (supabase
    .from('phases') as any)
    .select('*')
    .eq('session_id', sessionId)
    .order('phase_index', { ascending: true })

  if (phasesError) return null

  return {
    ...session,
    currentPhaseIndex: session.current_phase_index ?? session.currentPhaseIndex ?? 0,
    phaseStartedAt: session.phase_started_at ? new Date(session.phase_started_at).getTime() : undefined,
    phaseEndAt: session.phase_end_at ? new Date(session.phase_end_at).getTime() : undefined,
    pausedAt: session.paused_at ? new Date(session.paused_at).getTime() : null,
    pauseRemainingMs: session.pause_remaining_ms ?? null,
    isInForcedTrough: session.is_in_forced_trough ?? false,
    pauseCountUsed: session.pause_count_used ?? 0,
    phases: phases.map((p: any) => ({
      id: `${sessionId}_phase_${p.phase_index}`,
      type: p.phase_type,
      plannedDurationMs: p.planned_duration_ms,
      actualDurationMs: p.actual_duration_ms,
      startedAt: p.started_at ? new Date(p.started_at).getTime() : undefined,
      endedAt: p.ended_at ? new Date(p.ended_at).getTime() : undefined,
      completed: p.completed,
      skipped: p.skipped,
    })),
  }
}

export async function loadUserSessions(userId: string) {
  const { data, error } = await (supabase
    .from('sessions') as any)
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })

  if (error) return []
  return data
}

export async function endOtherActiveSessions(userId: string, excludeSessionId: string) {
  const { data, error } = await (supabase
    .from('sessions') as any)
    .update({
      status: 'aborted',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .neq('id', excludeSessionId)
    .in('status', ['running', 'paused'])
    .select('id')

  if (error) console.error('endOtherActiveSessions error:', error)
  return { data, error }
}

export async function endAllActiveSessions(userId: string) {
  const { data, error } = await (supabase
    .from('sessions') as any)
    .update({
      status: 'aborted',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .in('status', ['running', 'paused'])
    .select('id')

  if (error) console.error('endAllActiveSessions error:', error)
  return { data, error }
}

export async function claimSessionLease(
  sessionId: string,
  userId: string,
  holderId: string,
  ttlSeconds = 30,
  force = false
) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()
  let query = (supabase
    .from('sessions') as any)
    .update({
      leader_id: holderId,
      leader_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('user_id', userId)

  if (!force) {
    query = query.or(`leader_id.eq.${holderId},leader_expires_at.is.null,leader_expires_at.lt.${new Date().toISOString()}`)
  }

  const { data, error } = await query.select('id').maybeSingle()
  if (error) console.error('claimSessionLease error:', error)
  return { data, error }
}

export async function refreshSessionLease(
  sessionId: string,
  userId: string,
  holderId: string,
  ttlSeconds = 30
) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()
  const { data, error } = await (supabase
    .from('sessions') as any)
    .update({
      leader_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .eq('leader_id', holderId)
    .select('id')
    .maybeSingle()

  if (error) console.error('refreshSessionLease error:', error)
  return { data, error }
}

export function subscribeToSessionChanges(
  userId: string,
  callback: (payload: any) => void,
  onStatus?: (status: string) => void
) {
  return supabase
    .channel(`user-sessions:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'sessions',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe((status) => {
      onStatus?.(status)
    })
}

export async function savePushSubscription(userId: string, subscription: PushSubscription) {
  const json = subscription.toJSON()
  const endpoint = subscription.endpoint
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth

  if (!endpoint || !p256dh || !auth) {
    const error = new Error('Invalid push subscription keys')
    console.error('savePushSubscription error:', error)
    return { data: null, error }
  }

  const { data: existing, error: selectError } = await (supabase
    .from('push_subscriptions') as any)
    .select('id')
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .maybeSingle()

  if (selectError) {
    console.error('savePushSubscription select error:', selectError)
    return { data: null, error: selectError }
  }

  if (existing?.id) {
    const { data, error } = await (supabase
      .from('push_subscriptions') as any)
      .update({ p256dh, auth })
      .eq('id', existing.id)
      .select('id')
      .maybeSingle()

    if (error) console.error('savePushSubscription update error:', error)
    return { data, error }
  }

  const { data, error } = await (supabase
    .from('push_subscriptions') as any)
    .insert({ user_id: userId, endpoint, p256dh, auth })
    .select('id')
    .maybeSingle()

  if (error) console.error('savePushSubscription insert error:', error)
  return { data, error }
}