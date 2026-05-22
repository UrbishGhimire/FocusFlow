import React, { useState, useEffect } from 'react';
import { useTimerStore } from '../stores/timerStore';
import { Moon, Volume2, VolumeX, Wind, Check } from 'lucide-react';

export const TroughRecovery: React.FC = () => {
  const { session, timer } = useTimerStore();
  const [selectedOption, setSelectedOption] = useState<'nsdr' | 'silent' | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!timer.macro.isRunning || timer.macro.isPaused) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [timer.macro.isRunning, timer.macro.isPaused]);

  if (!session || session.phases[timer.macro.phaseIndex]?.type !== 'trough') {
    return null;
  }

  const remainingMs = Math.max(0, timer.macro.phaseEndTime - now);
  const remainingMin = Math.floor(remainingMs / 60000);
  const remainingSec = Math.ceil((remainingMs % 60000) / 1000);

  const handleNSDRTap = () => {
    setSelectedOption('nsdr');
    setAudioPlaying(!audioPlaying);
  };

  const handleSilentTap = () => {
    setSelectedOption('silent');
    setAudioPlaying(false);
  };

  return (
    <div className="fixed inset-0 z-40 bg-violet-950 flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-8">
        <div className="space-y-2">
          <Moon className="w-12 h-12 text-violet-400 mx-auto" />
          <h2 className="text-2xl font-bold text-violet-100">Recovery Trough</h2>
          <p className="text-violet-300">
            Your brain is replenishing dopamine & acetylcholine.
          </p>
        </div>

        <div className="text-6xl font-mono font-bold text-violet-200 tabular-nums">
          {String(remainingMin).padStart(2, '0')}:
          {String(remainingSec).padStart(2, '0')}
        </div>

        <div className="space-y-3">
          <p className="text-sm text-violet-400 uppercase tracking-wider">Choose Recovery Mode</p>

          <button
            onClick={handleNSDRTap}
            className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-all ${
              selectedOption === 'nsdr'
                ? 'bg-violet-800/50 border-violet-500'
                : 'bg-violet-900/50 border-violet-700/50 hover:bg-violet-900/70'
            }`}
          >
            {selectedOption === 'nsdr' ? (
              <Check className="w-5 h-5 text-emerald-400" />
            ) : audioPlaying ? (
              <Volume2 className="w-5 h-5 text-violet-300" />
            ) : (
              <VolumeX className="w-5 h-5 text-violet-500" />
            )}
            <div className="text-left flex-1">
              <p className="text-violet-200 font-medium">NSDR / Yoga Nidra</p>
              <p className="text-xs text-violet-400">
                {selectedOption === 'nsdr' 
                  ? (audioPlaying ? '▶ Playing... (Phase 2: Add audio file)' : '⏸ Tap to play') 
                  : 'Guided body scan relaxation'}
              </p>
            </div>
          </button>

          <button
            onClick={handleSilentTap}
            className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-all ${
              selectedOption === 'silent'
                ? 'bg-violet-800/50 border-violet-500'
                : 'bg-violet-900/30 border-violet-800/50 hover:bg-violet-900/50'
            }`}
          >
            {selectedOption === 'silent' ? (
              <Check className="w-5 h-5 text-emerald-400" />
            ) : (
              <Wind className="w-5 h-5 text-violet-500" />
            )}
            <div className="text-left flex-1">
              <p className="text-violet-300 font-medium">Silent Rest</p>
              <p className="text-xs text-violet-500">Lie down, close eyes, breathe slowly</p>
            </div>
          </button>
        </div>

        <p className="text-xs text-violet-600">
          Do not check your phone. This trough is non-negotiable.
        </p>
      </div>
    </div>
  );
};