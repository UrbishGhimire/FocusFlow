import { ProtocolConfig, Phase, PhaseType } from '../types';

export const DEFAULT_CONFIG: ProtocolConfig = {
  anchor: {
    sensoryResetMs: 2 * 60 * 1000,      // 2 minutes
    visualPrimingMs: 60 * 1000,          // 60 seconds
    sprintMs: 25 * 60 * 1000,            // 25 minutes
    microRestMs: 5 * 60 * 1000,          // 5 minutes
    troughMs: 20 * 60 * 1000,            // 20 minutes
    sprintCount: 3,
  },
  dive: {
    visualPrimingMs: 60 * 1000,          // 60 seconds
    deepBlockMs: 90 * 60 * 1000,         // 90 minutes
    troughMs: 20 * 60 * 1000,            // 20 minutes
    microPause: {
      enabled: true,
      minIntervalMs: 3 * 60 * 1000,      // 3 minutes
      maxIntervalMs: 8 * 60 * 1000,      // 8 minutes
      pauseDurationMs: 10 * 1000,        // 10 seconds
    },
  },
};

// Generate a unique ID for phases
let phaseIdCounter = 0;
const genPhaseId = () => `phase_${++phaseIdCounter}_${Date.now().toString(36)}`;

/**
 * Build the complete phase sequence for Protocol A (The Anchor)
 * Total: ~107 minutes
 */
export function buildAnchorPhases(config = DEFAULT_CONFIG.anchor): Phase[] {
  const phases: Phase[] = [];

  // 1. Sensory Reset (2 min)
  phases.push({
    id: genPhaseId(),
    type: 'sensory_reset',
    plannedDurationMs: config.sensoryResetMs,
    completed: false,
    skipped: false,
  });

  // 2. Visual Priming (60 sec)
  phases.push({
    id: genPhaseId(),
    type: 'visual_priming',
    plannedDurationMs: config.visualPrimingMs,
    completed: false,
    skipped: false,
  });

  // 3. Sprint + Micro-Rest cycles (3x)
  for (let i = 0; i < config.sprintCount; i++) {
    phases.push({
      id: genPhaseId(),
      type: 'sprint',
      plannedDurationMs: config.sprintMs,
      completed: false,
      skipped: false,
    });

    // Micro-rest after each sprint except the last
    if (i < config.sprintCount - 1) {
      phases.push({
        id: genPhaseId(),
        type: 'micro_rest',
        plannedDurationMs: config.microRestMs,
        completed: false,
        skipped: false,
      });
    }
  }

  // 4. Ultradian Trough (20 min)
  phases.push({
    id: genPhaseId(),
    type: 'trough',
    plannedDurationMs: config.troughMs,
    completed: false,
    skipped: false,
  });

  return phases;
}

/**
 * Build the complete phase sequence for Protocol B (The Dive)
 * Total: ~111.5 minutes (with micro-pauses sprinkled during deep_block)
 */
export function buildDivePhases(config = DEFAULT_CONFIG.dive): Phase[] {
  const phases: Phase[] = [];

  // 1. Visual Priming (60 sec)
  phases.push({
    id: genPhaseId(),
    type: 'visual_priming',
    plannedDurationMs: config.visualPrimingMs,
    completed: false,
    skipped: false,
  });

  // 2. Deep Block (90 min) - micro-pauses handled by client-side engine
  phases.push({
    id: genPhaseId(),
    type: 'deep_block',
    plannedDurationMs: config.deepBlockMs,
    completed: false,
    skipped: false,
  });

  // 3. Ultradian Trough (20 min)
  phases.push({
    id: genPhaseId(),
    type: 'trough',
    plannedDurationMs: config.troughMs,
    completed: false,
    skipped: false,
  });

  return phases;
}

/**
 * Get total planned duration of a phase sequence
 */
export function getTotalDuration(phases: Phase[]): number {
  return phases.reduce((sum, p) => sum + p.plannedDurationMs, 0);
}

/**
 * Get display name for a phase type
 */
export function getPhaseDisplayName(type: PhaseType): string {
  const names: Record<PhaseType, string> = {
    sensory_reset: 'Sensory Reset',
    visual_priming: 'Visual Priming',
    sprint: 'Deep Sprint',
    micro_rest: 'Micro-Rest',
    deep_block: 'Deep Block',
    trough: 'Recovery Trough',
  };
  return names[type];
}

/**
 * Get color class for a phase type (Tailwind)
 */
export function getPhaseColor(type: PhaseType): string {
  const colors: Record<PhaseType, string> = {
    sensory_reset: 'bg-phase-priming',
    visual_priming: 'bg-phase-priming',
    sprint: 'bg-phase-work',
    micro_rest: 'bg-phase-rest',
    deep_block: 'bg-phase-work',
    trough: 'bg-phase-trough',
  };
  return colors[type];
}

/**
 * Check if a phase type supports micro-pauses
 * Only deep_block in Protocol B supports them
 */
export function supportsMicroPauses(type: PhaseType): boolean {
  return type === 'deep_block';
}

/**
 * Check if a phase is a "hard boundary" (managed by server-master clock)
 * All phases >= 5 minutes OR all non-deep_block phases
 */
export function isHardBoundary(phase: Phase): boolean {
  return phase.plannedDurationMs >= 5 * 60 * 1000 || phase.type !== 'deep_block';
}
