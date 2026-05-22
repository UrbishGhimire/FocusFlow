import React, { useState, useEffect } from 'react';
import { useTimerStore } from '../stores/timerStore';

export const MicroPauseOverlay: React.FC = () => {
  const { showMicroPauseOverlay, timer } = useTimerStore();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!showMicroPauseOverlay) return;
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, [showMicroPauseOverlay]);

  if (!showMicroPauseOverlay || !timer.micro.isInPause) {
    return null;
  }

  const remainingMs = Math.max(0, timer.micro.pauseEndTime - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const progress = 1 - (remainingMs / 10000); // 10 seconds total

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm pointer-events-none">
      <div
        className="absolute inset-0 border-4 border-amber-400/30 transition-opacity"
        style={{ opacity: Math.sin(Date.now() / 200) * 0.5 + 0.5 }}
      />

      <div className="text-center space-y-4 animate-in fade-in duration-300">
        <div className="w-20 h-20 mx-auto rounded-full bg-slate-800/80 flex items-center justify-center border-2 border-amber-500/50">
          <div className="w-4 h-4 rounded-full bg-amber-400 animate-pulse" />
        </div>
        <div>
          <p className="text-xl font-medium text-slate-200">Do nothing. Relax your eyes.</p>
          <p className="text-sm text-slate-400">Anti-habituation blink</p>
        </div>
        <div className="relative w-32 h-1 mx-auto bg-slate-800 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-amber-500 transition-all duration-100"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="text-4xl font-mono font-bold text-slate-300 tabular-nums">
          {remainingSec}s
        </p>
      </div>
    </div>
  );
};