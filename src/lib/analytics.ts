import { Session, UserProfile, AnalyticsSnapshot } from '../types'

/**
 * Calculate Deep Work Score (DWS) for a session
 * Weights: Priming=0.2x, Sprint/DeepBlock=1.0x, MicroRest=0.3x, Trough=0.5x
 */
export function calculateDWS(session: Session): number {
  const weights: Record<string, number> = {
    sensory_reset: 0.2,
    visual_priming: 0.2,
    sprint: 1.0,
    micro_rest: 0.3,
    deep_block: 1.0,
    trough: 0.5,
  }

  return session.phases.reduce((score, phase) => {
    const minutes = (phase.actualDurationMs || phase.plannedDurationMs) / 60000
    return score + minutes * (weights[phase.type] || 0.5)
  }, 0)
}

/**
 * Calculate efficiency ratio: DWS / total session time
 */
export function calculateEfficiency(session: Session): number {
  const dws = calculateDWS(session)
  const totalMinutes = session.phases.reduce(
    (sum, p) => sum + (p.actualDurationMs || p.plannedDurationMs) / 60000,
    0
  )
  return totalMinutes > 0 ? dws / totalMinutes : 0
}

/**
 * Calculate lifetime metrics based on user's age and accumulated deep work
 */
export function calculateLifetimeMetrics(
  totalDeepHours: number,
  profile: UserProfile
): {
  lifetimeHoursBanked: number
  productiveYearsSaved: number
  wakingLifeSaved: number
} {
  const yearsRemaining = profile.lifeExpectancy - profile.age
  const lifetimeHoursBanked = totalDeepHours * yearsRemaining

  // Productive years = deep hours / (8 hrs/day * 250 work days/year)
  const productiveYearsSaved = lifetimeHoursBanked / (8 * 250)

  // Waking life = deep hours / (16 hrs/day * 365 days)
  const wakingLifeSaved = lifetimeHoursBanked / (16 * 365)

  return {
    lifetimeHoursBanked,
    productiveYearsSaved,
    wakingLifeSaved,
  }
}

/**
 * Calculate daily growth rate vs previous day
 */
export function calculateDailyGrowth(currentDWS: number, previousDWS: number): number | null {
  if (previousDWS <= 0) return null
  return (currentDWS / previousDWS) - 1
}

/**
 * Calculate compound growth rate over months
 */
export function calculateCompoundGrowth(
  currentMonthDWS: number,
  firstMonthDWS: number,
  monthsActive: number
): number | null {
  if (firstMonthDWS <= 0 || monthsActive <= 0) return null
  return Math.pow(currentMonthDWS / firstMonthDWS, 1 / monthsActive) - 1
}

/**
 * Calculate trough compliance percentage
 */
export function calculateTroughCompliance(sessions: Session[]): number {
  const troughs = sessions.flatMap(s => s.phases.filter(p => p.type === 'trough'))
  if (troughs.length === 0) return 0

  const completed = troughs.filter(p => p.completed && !p.skipped).length
  return completed / troughs.length
}

/**
 * Calculate micro-pause fidelity for Protocol B sessions
 */
export function calculateMicroPauseFidelity(sessions: Session[]): number | null {
  const diveSessions = sessions.filter(s => s.protocol === 'dive')
  if (diveSessions.length === 0) return null

  const totalDelivered = diveSessions.reduce((sum, s) => sum + s.microPausesDelivered, 0)
  const totalMissed = diveSessions.reduce((sum, s) => sum + s.microPausesMissed, 0)
  const total = totalDelivered + totalMissed

  return total > 0 ? totalDelivered / total : null
}

/**
 * Generate daily analytics snapshot from sessions
 */
export function generateDailySnapshot(
  date: string,
  sessions: Session[],
  profile: UserProfile,
  previousSnapshot?: AnalyticsSnapshot
): AnalyticsSnapshot {
  const daySessions = sessions.filter(s => {
    const sessionDate = new Date(s.startedAt).toISOString().split('T')[0]
    return sessionDate === date && s.status === 'completed'
  })

  const totalDeepMinutes = daySessions.reduce((sum, s) => sum + s.totalDeepMinutes, 0)
  const dws = daySessions.reduce((sum, s) => sum + calculateDWS(s), 0)
  const efficiency = daySessions.length > 0
    ? daySessions.reduce((sum, s) => sum + calculateEfficiency(s), 0) / daySessions.length
    : 0

  const vsBaseline = profile.baselineDws > 0 ? dws / profile.baselineDws : 1.0

  const dailyGrowth = previousSnapshot
    ? calculateDailyGrowth(dws, previousSnapshot.dws)
    : null

  const totalDeepHours = sessions
    .filter(s => s.status === 'completed')
    .reduce((sum, s) => sum + s.totalDeepMinutes / 60, 0)

  const lifetime = calculateLifetimeMetrics(totalDeepHours, profile)

  const troughCompliance = calculateTroughCompliance(sessions)
  const microPauseFidelity = calculateMicroPauseFidelity(sessions)

  return {
    userId: profile.id,
    date,
    dws: Math.round(dws * 100) / 100,
    efficiencyRatio: Math.round(efficiency * 10000) / 10000,
    vsBaselineMultiplier: Math.round(vsBaseline * 100) / 100,
    dailyGrowthRate: dailyGrowth !== null ? Math.round(dailyGrowth * 10000) / 10000 : null,
    lifetimeHoursBanked: Math.round(lifetime.lifetimeHoursBanked * 100) / 100,
    productiveYearsSaved: Math.round(lifetime.productiveYearsSaved * 100) / 100,
    wakingLifeSaved: Math.round(lifetime.wakingLifeSaved * 100) / 100,
    troughCompliancePct: Math.round(troughCompliance * 10000) / 100,
    microPauseFidelityPct: microPauseFidelity !== null ? Math.round(microPauseFidelity * 10000) / 100 : null,
    sessionsCompleted: daySessions.length,
    totalDeepMinutes,
  }
}
