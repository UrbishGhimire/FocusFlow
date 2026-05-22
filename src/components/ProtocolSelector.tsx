import React from 'react';
import { ProtocolMode } from '../types';
import { useTimerStore } from '../stores/timerStore';
import { Anchor, Waves } from 'lucide-react';

interface ProtocolCardProps {
  mode: ProtocolMode;
  title: string;
  subtitle: string;
  features: string[];
  icon: React.ReactNode;
  duration: string;
  color: string;
}

const ProtocolCard: React.FC<ProtocolCardProps> = ({
  mode,
  title,
  subtitle,
  features,
  icon,
  duration,
  color,
}) => {
  const { startSession } = useTimerStore();

  return (
    <button
      onClick={() => startSession(mode)}
      className={`group relative w-full text-left p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
        mode === 'anchor'
          ? 'border-blue-500/30 bg-blue-500/5 hover:border-blue-500/60 hover:bg-blue-500/10'
          : 'border-violet-500/30 bg-violet-500/5 hover:border-violet-500/60 hover:bg-violet-500/10'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${color}`}>
          {icon}
        </div>
        <span className="text-xs font-mono text-slate-500 bg-slate-800/80 px-2 py-1 rounded">
          {duration}
        </span>
      </div>

      <h3 className="text-xl font-bold text-slate-100 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 mb-4">{subtitle}</p>

      <ul className="space-y-2">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
            <div className={`w-1 h-1 rounded-full ${color.replace('bg-', 'bg-').replace('/20', '')}`} />
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-4 text-sm font-medium text-slate-400 group-hover:text-slate-200 transition-colors">
        Tap to start →
      </div>
    </button>
  );
};

export const ProtocolSelector: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-100">FocusFlow</h1>
          <p className="text-slate-400">Deep work orchestrated by biology</p>
        </div>

        <div className="space-y-4">
          <ProtocolCard
            mode="anchor"
            title="The Anchor"
            subtitle="For resistance, admin work, and task paralysis"
            icon={<Anchor className="w-6 h-6 text-blue-400" />}
            duration="~107 min"
            color="bg-blue-500/20"
            features={[
              '2-min sensory reset + visual priming',
              '3 × 25-min sprints with 5-min micro-rests',
              '20-min ultradian trough recovery',
              'Best for: email, routine tasks, studying',
            ]}
          />

          <ProtocolCard
            mode="dive"
            title="The Dive"
            subtitle="For complex cognition and memory consolidation"
            icon={<Waves className="w-6 h-6 text-violet-400" />}
            duration="~111 min"
            color="bg-violet-500/20"
            features={[
              '60-sec DAN priming (visual fixation)',
              '90-min continuous deep block',
              'Random 10-sec anti-habituation blinks',
              '20-min NSDR trough for consolidation',
              'Best for: coding, writing, deep reading',
            ]}
          />
        </div>

        <div className="text-center text-xs text-slate-600">
          <p>Based on ultradian rhythm research (Kleitman BRAC)</p>
          <p className="mt-1">v0.1.0 • Hybrid Timer Architecture</p>
        </div>
      </div>
    </div>
  );
};
