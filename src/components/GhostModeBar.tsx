import React, { useState, useEffect } from 'react';
import { useTimerStore } from '../stores/timerStore';
import { getPhaseDisplayName, getPhaseColor } from '../lib/protocols';
import { Play, Pause, SkipForward, X, Eye, Lock } from 'lucide-react';

export const GhostModeBar: React.FC = () => {
  const { session, timer, pauseSession, resumeSession, skipPhase, abortSession } = useTimerStore();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!timer.macro.isRunning || timer.macro.isPaused) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [timer.macro.isRunning, timer.macro.isPaused]);

  if (!session || (session.status !== 'running' && session.status !== 'paused')) {
    return null;
  }

  const currentPhase = session.phases[timer.macro.phaseIndex];
  const remainingMs = Math.max(0, timer.macro.phaseEndTime - now);
  const remainingSec = Math.floor(remainingMs / 1000);   // FIX: use floor, not ceil
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  const progress = currentPhase.plannedDurationMs > 0
    ? 1 - (remainingMs / currentPhase.plannedDurationMs)
    : 0;
  const phaseColor = getPhaseColor(currentPhase.type);
  const phaseName = getPhaseDisplayName(currentPhase.type);

  const canPause = session.protocol === 'dive' && (currentPhase.type === 'sprint' || currentPhase.type === 'deep_block');
  const canSkip = currentPhase.type === 'micro_rest' || currentPhase.type === 'trough';

  return (
    <div className="fixed top-0 left-0 right-0 z-[60]">
      <div className="h-1.5 w-full bg-slate-800">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${phaseColor}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${phaseColor} ${timer.macro.isPaused ? '' : 'animate-pulse'}`} />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{phaseName}</span>
            <span className="text-lg font-mono font-bold text-slate-100 tabular-nums">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 uppercase">
            {session.protocol}
          </span>
          {timer.macro.isPaused && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 uppercase animate-pulse">
              PAUSED
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {timer.wakeLock.isHeld && <Lock className="w-3.5 h-3.5 text-emerald-500" />}
          {timer.micro.isActive && <Eye className="w-3.5 h-3.5 text-slate-500" />}

          {canPause && (
            timer.macro.isPaused ? (
              <button onClick={resumeSession} className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                <Play className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={pauseSession} className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors" title="Pause (max 3 min, 1 per block)">
                <Pause className="w-4 h-4" />
              </button>
            )
          )}

          {canSkip && (
            <button onClick={skipPhase} className="p-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 transition-colors" title="Skip phase">
              <SkipForward className="w-4 h-4" />
            </button>
          )}

          <button onClick={abortSession} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors" title="End session">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-slate-900/80 px-4 py-1 flex items-center gap-1.5 overflow-x-auto">
        {session.phases.map((phase, idx) => (
          <div
            key={phase.id}
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              idx < timer.macro.phaseIndex ? 'bg-slate-500' : idx === timer.macro.phaseIndex ? phaseColor : 'bg-slate-800'
            }`}
          />
        ))}
      </div>
    </div>
  );
};