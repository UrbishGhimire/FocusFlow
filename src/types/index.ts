// Phase definitions matching the PRD v2.1
export type PhaseType = 
  | 'sensory_reset' 
  | 'visual_priming' 
  | 'sprint' 
  | 'micro_rest' 
  | 'deep_block' 
  | 'trough';

export type ProtocolMode = 'anchor' | 'dive';

export interface Phase {
  id: string;
  type: PhaseType;
  plannedDurationMs: number;
  actualDurationMs?: number;
  startedAt?: number; // Unix ms
  endedAt?: number;   // Unix ms
  completed: boolean;
  skipped: boolean;
  serverTimestampEnd?: number; // authoritative from Macro Orchestrator
}

export interface Session {
  id: string;
  protocol: ProtocolMode;
  startedAt: number;
  completedAt?: number;
  phaseStartedAt?: number;
  phaseEndAt?: number;
  pausedAt?: number | null;
  pauseRemainingMs?: number | null;
  isInForcedTrough?: boolean;
  pauseCountUsed?: number;
  phases: Phase[];
  totalDeepMinutes: number;
  interruptionCount: number;
  selfReportedFocus?: number; // 1-10
  microPausesDelivered: number;
  microPausesMissed: number;
  currentPhaseIndex: number;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'aborted';
}

// Timer engine state
export interface TimerState {
  // Macro orchestrator (server-master for hard boundaries)
  macro: {
    phaseIndex: number;
    phaseStartTime: number;
    phaseEndTime: number;
    isRunning: boolean;
    isPaused: boolean;
  };
  // Micro-pause engine (client-side for soft boundaries)
  micro: {
    isActive: boolean;        // only during Protocol B deep_block
    nextPauseAt: number;      // Unix ms
    pauseCountDelivered: number;
    pauseCountMissed: number;
    lastPauseEndTime: number;
    isInPause: boolean;
    pauseEndTime: number;
  };
  // Wake Lock
  wakeLock: {
    isHeld: boolean;
    type: 'screen' | null;
  };
}

// User profile for analytics
export interface UserProfile {
  id: string;
  age: number;
  lifeExpectancy: number;
  chronotype: 'lion' | 'bear' | 'wolf' | 'dolphin';
  baselineDws: number;
  baselineDailyMinutes: number;
  createdAt: string;
}

// Analytics snapshot
export interface AnalyticsSnapshot {
  userId: string;
  date: string; // YYYY-MM-DD
  dws: number;
  efficiencyRatio: number;
  vsBaselineMultiplier: number;
  dailyGrowthRate: number | null;
  lifetimeHoursBanked: number;
  productiveYearsSaved: number;
  wakingLifeSaved: number;
  troughCompliancePct: number;
  microPauseFidelityPct: number | null;
  sessionsCompleted: number;
  totalDeepMinutes: number;
}

// Micro-pause configuration
export interface MicroPauseConfig {
  enabled: boolean;
  minIntervalMs: number;  // default: 3 min
  maxIntervalMs: number;  // default: 8 min
  pauseDurationMs: number; // 10 seconds
}

// Protocol configuration
export interface ProtocolConfig {
  anchor: {
    sensoryResetMs: number;      // 2 min
    visualPrimingMs: number;     // 60 sec
    sprintMs: number;            // 25 min
    microRestMs: number;         // 5 min
    troughMs: number;            // 20 min
    sprintCount: number;         // 3
  };
  dive: {
    visualPrimingMs: number;     // 60 sec
    deepBlockMs: number;         // 90 min
    troughMs: number;            // 20 min
    microPause: MicroPauseConfig;
  };
}
