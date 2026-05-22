import React, { useState, useEffect } from 'react';
import { useTimerStore } from '../stores/timerStore';

export const PrimingScreen: React.FC = () => {
  const { session, timer } = useTimerStore();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!timer.macro.isRunning || timer.macro.isPaused) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [timer.macro.isRunning, timer.macro.isPaused]);

  if (!session) return null;

  const currentPhase = session.phases[timer.macro.phaseIndex];
  const isPriming = currentPhase?.type === 'visual_priming' || currentPhase?.type === 'sensory_reset';

  if (!isPriming) return null;

  const remainingMs = Math.max(0, timer.macro.phaseEndTime - now);
  const remainingSec = Math.ceil(remainingMs / 1000);

  return (
    <div className="fixed inset-0 z-40 bg-slate-950 flex flex-col items-center justify-center">
      {currentPhase.type === 'sensory_reset' ? (
        <div className="text-center space-y-8">
          <div className="w-32 h-32 mx-auto rounded-full bg-amber-500/10 animate-breathe flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-amber-500/20" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-amber-100">Sensory Reset</h2>
            <p className="text-amber-400 mt-2">Clear your desk. No inputs. Just breathe.</p>
          </div>
          <p className="text-4xl font-mono font-bold text-amber-200 tabular-nums">
            {remainingSec}s
          </p>
        </div>
      ) : (
        <div className="text-center space-y-8">
          {/* Fixed centering: flex column, items-center */}
          <div className="flex flex-col items-center">
            <div className="w-4 h-4 rounded-full bg-amber-400 animate-pulse-slow" />
            <p className="mt-8 text-xs text-amber-500 uppercase tracking-wider">
              Fix your gaze here
            </p>
          </div>
          <div>
            <h2 className="text-xl font-bold text-amber-100">Visual Priming</h2>
            <p className="text-amber-400 mt-1 text-sm">
              Activating dorsal attention network...
            </p>
          </div>
          <p className="text-3xl font-mono font-bold text-amber-200 tabular-nums">
            {remainingSec}s
          </p>
        </div>
      )}
    </div>
  );
};