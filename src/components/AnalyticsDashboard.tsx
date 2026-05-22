import React, { useState, useMemo } from 'react';
import { useTimerStore } from '../stores/timerStore';
import { useAnalyticsStore } from '../stores/analyticsStore';
import { 
  TrendingUp, 
  Clock, 
  Calendar, 
  Flame, 
  Brain,
  Hourglass,
  Zap,
  ChevronDown,
  ChevronUp,
  Activity
} from 'lucide-react';

interface MetricCardProps {
  label: string
  value: string
  subtext?: string
  icon: React.ReactNode
  color: string
  trend?: 'up' | 'down' | 'neutral'
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, subtext, icon, color, trend }) => (
  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
    <div className="flex items-start justify-between mb-3">
      <div className={`p-2 rounded-lg ${color}`}>
        {icon}
      </div>
      {trend && (
        <span className={`text-xs font-medium ${
          trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-500'
        }`}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-slate-100">{value}</p>
    <p className="text-xs text-slate-500 mt-1">{label}</p>
    {subtext && <p className="text-xs text-slate-600 mt-1">{subtext}</p>}
  </div>
);

export const AnalyticsDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'all'>('week');
  const [showDetails, setShowDetails] = useState(false);

  const { session } = useTimerStore();
  const { todaySnapshot, snapshots: snapshots, profile: profile } = useAnalyticsStore();

  // Calculate real stats from current session + historical data
const stats = useMemo(() => {
  // If we have a completed session, use its data
  const currentSessionDeepMin = session?.totalDeepMinutes || 0;
  const currentSessionDWS = session ? calculateSessionDWS(session) : 0;

  // Use stored snapshot if available, otherwise show current session data
  if (todaySnapshot) {
    return {
      dws: todaySnapshot.dws,
      vsBaseline: todaySnapshot.vsBaselineMultiplier,
      dailyGrowth: todaySnapshot.dailyGrowthRate || 0,
      streakDays: calculateStreakDays(snapshots),
      totalDeepHours: todaySnapshot.totalDeepMinutes / 60,
      lifetimeHoursBanked: todaySnapshot.lifetimeHoursBanked,
      productiveYearsSaved: todaySnapshot.productiveYearsSaved,
      wakingLifeSaved: todaySnapshot.wakingLifeSaved,
      troughCompliance: todaySnapshot.troughCompliancePct / 100,
      microPauseFidelity: (todaySnapshot.microPauseFidelityPct || 0) / 100,
      sessionsThisPeriod: todaySnapshot.sessionsCompleted,
      avgSessionLength: todaySnapshot.sessionsCompleted > 0 
        ? Math.round(todaySnapshot.totalDeepMinutes / todaySnapshot.sessionsCompleted)
        : 0,
    };
  }

  // Fallback: show current session data only, with profile-based projections if available
  const fallbackLifetime = profile 
    ? calculateLifetimeMetrics(currentSessionDeepMin / 60, profile)
    : { lifetimeHoursBanked: 0, productiveYearsSaved: 0, wakingLifeSaved: 0 };

  return {
    dws: currentSessionDWS,
    vsBaseline: 1.0,
    dailyGrowth: 0,
    streakDays: 0,
    totalDeepHours: currentSessionDeepMin / 60,
    lifetimeHoursBanked: fallbackLifetime.lifetimeHoursBanked,
    productiveYearsSaved: fallbackLifetime.productiveYearsSaved,
    wakingLifeSaved: fallbackLifetime.wakingLifeSaved,
    troughCompliance: session ? calculateTroughCompliance([session]) : 0,
    microPauseFidelity: session ? calculateMicroPauseFidelity([session]) : null,
    sessionsThisPeriod: session?.status === 'completed' ? 1 : 0,
    avgSessionLength: currentSessionDeepMin,
  };
}, [session, todaySnapshot, snapshots, profile]);

  const ranges = [
    { key: 'day' as const, label: 'Today' },
    { key: 'week' as const, label: 'Week' },
    { key: 'month' as const, label: 'Month' },
    { key: 'all' as const, label: 'All Time' },
  ];

  // If no data at all, show empty state
  const hasData = session?.status === 'completed' || todaySnapshot !== null;

  if (!hasData) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Activity className="w-12 h-12 text-slate-700 mx-auto" />
          <h2 className="text-xl font-bold text-slate-300">No Data Yet</h2>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">
            Complete your first session to see analytics. Your productivity compound interest starts with the first cycle.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Analytics</h1>
            <p className="text-sm text-slate-500">Your productivity compound interest</p>
          </div>
          <div className="flex gap-1">
            {ranges.map(r => (
              <button
                key={r.key}
                onClick={() => setTimeRange(r.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  timeRange === r.key
                    ? 'bg-slate-800 text-slate-200'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Streak Banner */}
        {stats.streakDays > 0 && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
            <Flame className="w-6 h-6 text-amber-400" />
            <div>
              <p className="text-amber-200 font-medium">
                {stats.streakDays}-day growth streak
              </p>
              <p className="text-xs text-amber-500">
                You're getting {(stats.dailyGrowth * 100).toFixed(1)}% better each day
              </p>
            </div>
          </div>
        )}

        {/* Primary Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Deep Work Score"
            value={stats.dws.toFixed(1)}
            subtext="Weighted productive minutes"
            icon={<Brain className="w-4 h-4 text-blue-400" />}
            color="bg-blue-500/20"
            trend="up"
          />
          <MetricCard
            label="vs. Baseline"
            value={`${stats.vsBaseline.toFixed(1)}×`}
            subtext="Compared to when you started"
            icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
            color="bg-emerald-500/20"
            trend="up"
          />
          <MetricCard
            label="Deep Hours"
            value={stats.totalDeepHours.toFixed(1)}
            subtext="Total focused time"
            icon={<Clock className="w-4 h-4 text-violet-400" />}
            color="bg-violet-500/20"
          />
          <MetricCard
            label="Trough Compliance"
            value={`${(stats.troughCompliance * 100).toFixed(0)}%`}
            subtext="Recovery phases honored"
            icon={<Zap className="w-4 h-4 text-amber-400" />}
            color="bg-amber-500/20"
            trend={stats.troughCompliance > 0.9 ? 'up' : 'neutral'}
          />
        </div>

        {/* Lifetime Projection */}
        {stats.lifetimeHoursBanked > 0 && (
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <Hourglass className="w-5 h-5 text-slate-400" />
              <h3 className="text-lg font-bold text-slate-200">Lifetime Projection</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-slate-100">
                    {stats.productiveYearsSaved.toFixed(1)}
                  </p>
                  <p className="text-sm text-slate-500">Productive years saved by age 80</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-slate-100">
                    {stats.wakingLifeSaved.toFixed(1)}
                  </p>
                  <p className="text-sm text-slate-500">Years of conscious living reclaimed</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-800/50">
                <p className="text-sm text-slate-400">
                  At your current rate, you will have invested an extra{' '}
                  <span className="text-emerald-400 font-medium">{stats.lifetimeHoursBanked.toLocaleString()} hours</span>
                  {' '}of high-quality cognition into your craft.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Expandable Details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
        >
          <span className="text-sm font-medium text-slate-300">Detailed Metrics</span>
          {showDetails ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {showDetails && (
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Sessions"
              value={stats.sessionsThisPeriod.toString()}
              subtext="This period"
              icon={<Calendar className="w-4 h-4 text-slate-400" />}
              color="bg-slate-700/30"
            />
            <MetricCard
              label="Avg Length"
              value={`${stats.avgSessionLength}m`}
              subtext="Per session"
              icon={<Clock className="w-4 h-4 text-slate-400" />}
              color="bg-slate-700/30"
            />
            {stats.microPauseFidelity !== null && (
              <MetricCard
                label="Micro-Pause Fidelity"
                value={`${(stats.microPauseFidelity * 100).toFixed(0)}%`}
                subtext="Protocol B only"
                icon={<Zap className="w-4 h-4 text-slate-400" />}
                color="bg-slate-700/30"
              />
            )}
            <MetricCard
              label="Daily Growth"
              value={`+${(stats.dailyGrowth * 100).toFixed(1)}%`}
              subtext="Compound improvement"
              icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
              color="bg-emerald-500/10"
              trend="up"
            />
          </div>
        )}

        {/* Motivational Footer */}
        <div className="text-center py-6">
          <p className="text-sm text-slate-600">
            "The standard 8-hour workday is biologically unsustainable."
          </p>
          <p className="text-xs text-slate-700 mt-1">
            — FocusFlow, based on Kleitman BRAC research
          </p>
        </div>
      </div>
    </div>
  );
};

// Helper functions for real-time calculations
function calculateSessionDWS(session: any): number {
  const weights: Record<string, number> = {
    sensory_reset: 0.2,
    visual_priming: 0.2,
    sprint: 1.0,
    micro_rest: 0.3,
    deep_block: 1.0,
    trough: 0.5,
  };

  return session.phases.reduce((score: number, phase: any) => {
    const minutes = (phase.actualDurationMs || phase.plannedDurationMs) / 60000;
    return score + minutes * (weights[phase.type] || 0.5);
  }, 0);
}

function calculateTroughCompliance(sessions: any[]): number {
  const troughs = sessions.flatMap((s: any) => s.phases.filter((p: any) => p.type === 'trough'));
  if (troughs.length === 0) return 0;
  const completed = troughs.filter((p: any) => p.completed && !p.skipped).length;
  return completed / troughs.length;
}

function calculateMicroPauseFidelity(sessions: any[]): number | null {
  const diveSessions = sessions.filter((s: any) => s.protocol === 'dive');
  if (diveSessions.length === 0) return null;
  const totalDelivered = diveSessions.reduce((sum: number, s: any) => sum + s.microPausesDelivered, 0);
  const totalMissed = diveSessions.reduce((sum: number, s: any) => sum + s.microPausesMissed, 0);
  const total = totalDelivered + totalMissed;
  return total > 0 ? totalDelivered / total : null; }

function calculateStreakDays(snapshots: any[]): number {
  if (snapshots.length < 2) return 0;
  // Sort by date descending
  const sorted = [...snapshots].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].dws >= (sorted[i + 1]?.dws || 0) * 1.01) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function calculateLifetimeMetrics(totalDeepHours: number, profile: any): {
  lifetimeHoursBanked: number;
  productiveYearsSaved: number;
  wakingLifeSaved: number;
} {
  const yearsRemaining = (profile.lifeExpectancy || 80) - (profile.age || 21);
  const lifetimeHoursBanked = totalDeepHours * Math.max(0, yearsRemaining);
  return {
    lifetimeHoursBanked,
    productiveYearsSaved: lifetimeHoursBanked / (8 * 250),
    wakingLifeSaved: lifetimeHoursBanked / (16 * 365),
  };
}

