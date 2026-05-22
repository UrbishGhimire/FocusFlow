import React, { useEffect } from 'react';
import { useTimerStore } from '../stores/timerStore';
import { useAnalyticsStore } from '../stores/analyticsStore';
import { CheckCircle, TrendingUp, Clock, Zap, Activity } from 'lucide-react';

export const SessionComplete: React.FC = () => {
  const { session } = useTimerStore();
  const { calculateToday } = useAnalyticsStore();

  // Calculate analytics when session completes
  useEffect(() => {
    if (session?.status === 'completed') {
      // Convert session to format analytics expects
      const sessions = session ? [session] : [];
      calculateToday(sessions);
    }
  }, [session?.status, session, calculateToday]);

  if (!session || (session.status !== 'completed' && session.status !== 'aborted')) {
    return null;
  }

  const isCompleted = session.status === 'completed';
  const totalMinutes = Math.round(session.totalDeepMinutes);
  const troughSkipped = session.phases.some(
    p => p.type === 'trough' && p.skipped
  );

  // Calculate actual phases completed
  const phasesCompleted = session.phases.filter(p => p.completed).length;
  const totalPhases = session.phases.length;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
          isCompleted ? 'bg-emerald-500/20' : 'bg-amber-500/20'
        }`}>
          {isCompleted ? (
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          ) : (
            <Zap className="w-8 h-8 text-amber-400" />
          )}
        </div>

        <div>
          <h2 className={`text-2xl font-bold ${isCompleted ? 'text-emerald-100' : 'text-amber-100'}`}>
            {isCompleted ? 'Session Complete' : 'Session Ended'}
          </h2>
          <p className="text-slate-400 mt-1">
            {isCompleted 
              ? 'You honored your ultradian rhythm.' 
              : 'Progress saved. Resume when ready.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <Clock className="w-5 h-5 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-100">{totalMinutes}</p>
            <p className="text-xs text-slate-500">Deep Minutes</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <TrendingUp className="w-5 h-5 text-violet-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-100">
              {phasesCompleted}/{totalPhases}
            </p>
            <p className="text-xs text-slate-500">Phases Done</p>
          </div>
        </div>

        {troughSkipped && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400">
            ⚠️ You skipped the recovery trough. Your next peak may be weaker.
          </div>
        )}

        {session.microPausesDelivered > 0 && (
          <div className="text-sm text-slate-500">
            Micro-pauses: {session.microPausesDelivered} delivered
            {session.microPausesMissed > 0 && `, ${session.microPausesMissed} missed`}
          </div>
        )}

        {/* Analytics preview */}
        {isCompleted && (
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">Data saved to analytics</span>
            </div>
            <p className="text-xs text-slate-500">
              View your progress in the Analytics dashboard
            </p>
          </div>
        )}

        <button
          onClick={() => {
            localStorage.removeItem('focusflow_session');
            window.location.reload();
          }}
          className="w-full py-3 rounded-xl bg-slate-800 text-slate-200 font-medium hover:bg-slate-700 transition-colors"
        >
          Start New Session
        </button>
      </div>
    </div>
  );
};
