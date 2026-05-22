import React, { useState, useEffect } from 'react';
import { useTimerStore } from '../stores/timerStore';
import { Droplets, Move, Eye, GlassWater } from 'lucide-react';

const ACTIVITIES = [
  { icon: <Move className="w-5 h-5" />, text: 'Stretch your neck and shoulders', color: 'text-emerald-400' },
  { icon: <GlassWater className="w-5 h-5" />, text: 'Drink a glass of water', color: 'text-blue-400' },
  { icon: <Eye className="w-5 h-5" />, text: 'Look out a window (optic flow)', color: 'text-amber-400' },
  { icon: <Droplets className="w-5 h-5" />, text: 'Splash water on your face', color: 'text-cyan-400' },
  { icon: <Move className="w-5 h-5" />, text: 'Walk to another room', color: 'text-violet-400' },
];

export const MicroRestPrompt: React.FC = () => {
  const { session, timer } = useTimerStore();
  const [activity, setActivity] = useState(ACTIVITIES[0]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!timer.macro.isRunning || timer.macro.isPaused) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.macro.isRunning, timer.macro.isPaused]);

  const currentPhase = session?.phases[timer.macro.phaseIndex];
  const isMicroRest = currentPhase?.type === 'micro_rest';

  useEffect(() => {
    if (isMicroRest) {
      const random = ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
      setActivity(random);
    }
  }, [isMicroRest, timer.macro.phaseIndex]);

  if (!isMicroRest) return null;

  const remainingMs = Math.max(0, timer.macro.phaseEndTime - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;

  return (
    <div className="fixed inset-0 z-40 bg-emerald-950/95 flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-8">
        <div className="space-y-2">
          <p className="text-emerald-400 text-sm uppercase tracking-widest">Micro-Rest</p>
          <h2 className="text-3xl font-bold text-emerald-100">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </h2>
          <p className="text-emerald-500 text-sm">No screens. No phone.</p>
        </div>

        <div className="p-6 rounded-2xl bg-emerald-900/50 border border-emerald-800/50">
          <div className={`mx-auto w-12 h-12 rounded-full bg-emerald-800/50 flex items-center justify-center mb-4 ${activity.color}`}>
            {activity.icon}
          </div>
          <p className="text-lg font-medium text-emerald-200">{activity.text}</p>
        </div>

        <div className="space-y-2">
          <div className="h-1.5 w-full bg-emerald-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-1000"
              style={{ width: `${(remainingSec / 300) * 100}%` }}
            />
          </div>
          <p className="text-xs text-emerald-600">
            Next sprint starts automatically
          </p>
        </div>
      </div>
    </div>
  );
};