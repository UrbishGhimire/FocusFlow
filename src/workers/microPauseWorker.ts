// Micro-Pause Web Worker with 3-second pre-alert and end chime signal
interface MicroPauseConfig {
  enabled: boolean;
  minIntervalMs: number;
  maxIntervalMs: number;
  pauseDurationMs: number;
}

interface WorkerState {
  isRunning: boolean;
  nextPauseAt: number;
  pauseCountDelivered: number;
  pauseCountMissed: number;
  isInPause: boolean;
  pauseEndTime: number;
  deepBlockEndTime: number;
  config: MicroPauseConfig;
  preAlertSent: boolean;
}

let state: WorkerState = {
  isRunning: false,
  nextPauseAt: 0,
  pauseCountDelivered: 0,
  pauseCountMissed: 0,
  isInPause: false,
  pauseEndTime: 0,
  deepBlockEndTime: 0,
  config: {
    enabled: true,
    minIntervalMs: 3 * 60 * 1000,
    maxIntervalMs: 8 * 60 * 1000,
    pauseDurationMs: 10 * 1000,
  },
  preAlertSent: false,
};

let checkInterval: number | null = null;

function getRandomInterval(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function scheduleNextPause() {
  if (!state.config.enabled || !state.isRunning) return;

  const now = Date.now();
  const interval = getRandomInterval(state.config.minIntervalMs, state.config.maxIntervalMs);
  state.nextPauseAt = now + interval;
  state.preAlertSent = false;

  // Safety: don't schedule past deep block end (allow 3s pre‑alert + 10s pause)
  if (state.nextPauseAt + state.config.pauseDurationMs + 3000 > state.deepBlockEndTime) {
    state.nextPauseAt = 0;
    return;
  }

  postMessage({
    type: 'PAUSE_SCHEDULED',
    payload: {
      nextPauseAt: state.nextPauseAt,
      intervalMs: interval,
    },
  });
}

function sendPreAlert() {
  if (state.preAlertSent) return;
  state.preAlertSent = true;
  postMessage({
    type: 'PRE_ALERT',
    payload: {
      pauseStartsAt: state.nextPauseAt,
    },
  });
}

function startPause() {
  const now = Date.now();
  state.isInPause = true;
  state.pauseEndTime = now + state.config.pauseDurationMs;
  state.pauseCountDelivered++;
  state.preAlertSent = false;

  postMessage({
    type: 'PAUSE_STARTED',
    payload: {
      pauseEndTime: state.pauseEndTime,
      durationMs: state.config.pauseDurationMs,
      pauseNumber: state.pauseCountDelivered,
    },
  });

  setTimeout(() => {
    if (state.isInPause) {
      endPause();
    }
  }, state.config.pauseDurationMs);
}

function endPause() {
  state.isInPause = false;
  state.pauseEndTime = 0;

  postMessage({
    type: 'PAUSE_ENDED',
    payload: {
      pauseCountDelivered: state.pauseCountDelivered,
      pauseCountMissed: state.pauseCountMissed,
    },
  });

  scheduleNextPause();
}

function checkLoop() {
  if (!state.isRunning) return;

  const now = Date.now();

  if (now >= state.deepBlockEndTime) {
    stopEngine();
    return;
  }

  // Send pre-alert 3 seconds before pause
  if (!state.isInPause && state.nextPauseAt > 0 && !state.preAlertSent && now >= state.nextPauseAt - 3000) {
    sendPreAlert();
  }

  if (!state.isInPause && state.nextPauseAt > 0 && now >= state.nextPauseAt) {
    startPause();
  }
}

function startEngine(config: MicroPauseConfig, deepBlockDurationMs: number) {
  state.config = config;
  state.isRunning = true;
  state.deepBlockEndTime = Date.now() + deepBlockDurationMs;
  state.pauseCountDelivered = 0;
  state.pauseCountMissed = 0;
  state.isInPause = false;
  state.preAlertSent = false;

  postMessage({
    type: 'ENGINE_STARTED',
    payload: {
      deepBlockEndTime: state.deepBlockEndTime,
      config,
    },
  });

  scheduleNextPause();

  checkInterval = self.setInterval(checkLoop, 100);
}

function stopEngine() {
  state.isRunning = false;
  state.nextPauseAt = 0;
  state.isInPause = false;
  state.preAlertSent = false;

  if (checkInterval !== null) {
    clearInterval(checkInterval);
    checkInterval = null;
  }

  postMessage({
    type: 'ENGINE_STOPPED',
    payload: {
      pauseCountDelivered: state.pauseCountDelivered,
      pauseCountMissed: state.pauseCountMissed,
    },
  });
}

function reportMissedPauses(count: number) {
  state.pauseCountMissed += count;
}

self.onmessage = (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'START':
      startEngine(payload.config, payload.deepBlockDurationMs);
      break;
    case 'STOP':
      stopEngine();
      break;
    case 'REPORT_MISSED':
      reportMissedPauses(payload.count);
      break;
    case 'GET_STATE':
      postMessage({
        type: 'STATE_UPDATE',
        payload: {
          isRunning: state.isRunning,
          isInPause: state.isInPause,
          nextPauseAt: state.nextPauseAt,
          pauseCountDelivered: state.pauseCountDelivered,
          pauseCountMissed: state.pauseCountMissed,
        },
      });
      break;
  }
};