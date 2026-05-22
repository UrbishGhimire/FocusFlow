import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Session, ProtocolMode, TimerState, MicroPauseConfig } from '../types';
import { buildAnchorPhases, buildDivePhases, supportsMicroPauses, DEFAULT_CONFIG, getPhaseDisplayName } from '../lib/protocols';
import { sendNativeNotification } from '../lib/notifications';
import { supabase, saveSession, savePhases, loadSession, getUserProfileId, subscribeToSessionChanges, endOtherActiveSessions, endAllActiveSessions, claimSessionLease, refreshSessionLease } from '../lib/supabase';

const genSessionId = () => {
  const cryptoApi = typeof globalThis !== 'undefined'
    ? (globalThis as { crypto?: Crypto }).crypto
    : undefined;
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
};

function playSound(type: 'phase' | 'micro' | 'complete' | 'micro_pre_alert' | 'micro_end' = 'phase') {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    if (type === 'micro_pre_alert') {
      const notes = [523, 659, 784];
      const noteDuration = 0.15;
      let time = ctx.currentTime;
      for (const freq of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.value = 0.08;
        osc.start(time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + noteDuration);
        osc.stop(time + noteDuration);
        time += noteDuration;
      }
      return;
    }
    if (type === 'micro_end') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.stop(ctx.currentTime + 0.2);
      return;
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'micro') {
      osc.frequency.value = 800;
      gain.gain.value = 0.1;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'complete') {
      osc.frequency.value = 523;
      gain.gain.value = 0.15;
      osc.start();
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.stop(ctx.currentTime + 0.6);
    } else {
      osc.frequency.value = 440;
      gain.gain.value = 0.12;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch (e) { /* ignore */ }
}

const STORAGE_KEY = 'focusflow_state_v8';
const LAST_ABORT_AT_KEY = 'focusflow_last_abort_at';
const TAB_ID_KEY = 'focusflow_tab_id';

interface PersistedState {
  session: Session;
  phaseIndex: number;
  phaseStartTime: number;
  phaseEndTime: number;
  savedAt: number;
  pauseCount?: number;
  isInForcedTrough?: boolean;
  pausedRemainingMs?: number;
  pausedAt?: number | null;
}

function saveStateLocally(state: PersistedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadStateLocally(): PersistedState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function clearStateLocally() {
  localStorage.removeItem(STORAGE_KEY);
}

function setLastAbortAt(timestamp: number) {
  localStorage.setItem(LAST_ABORT_AT_KEY, String(timestamp));
}

function getLastAbortAt(): number | null {
  const raw = localStorage.getItem(LAST_ABORT_AT_KEY);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function getTabId() {
  const existing = localStorage.getItem(TAB_ID_KEY);
  if (existing) return existing;
  const cryptoApi = typeof globalThis !== 'undefined'
    ? (globalThis as { crypto?: Crypto }).crypto
    : undefined;
  const id = cryptoApi?.randomUUID ? cryptoApi.randomUUID() : `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  localStorage.setItem(TAB_ID_KEY, id);
  return id;
}

interface TimerStore {
  session: Session | null;
  timer: TimerState;
  showMicroPauseOverlay: boolean;
  pauseCountUsed: number;
  isInForcedTrough: boolean;
  pausedAt: number | null;
  lastPauseClick: number;
  isHydrated: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  saveMessage: string | null;
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error', message?: string | null) => void;
  realtimeStatus: 'idle' | 'connecting' | 'subscribed' | 'error' | 'timed_out' | 'closed';
  realtimeLastEventAt: number | null;
  startRealtimeSync: () => void;
  stopRealtimeSync: () => void;
  startSession: (protocol: ProtocolMode) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  skipPhase: () => void;
  abortSession: () => void;
  completePhase: () => void;
  startMicroPauseEngine: () => void;
  stopMicroPauseEngine: () => void;
  setShowMicroPauseOverlay: (show: boolean) => void;
  requestWakeLock: () => Promise<void>;
  releaseWakeLock: () => void;
  tick: () => void;
  restoreSession: () => void;
  triggerForcedTrough: () => void;
}

let microPauseWorker: Worker | null = null;
let macroInterval: number | null = null;
let wakeLockSentinel: WakeLockSentinel | null = null;
let sessionRealtimeChannel: any = null;
let realtimeProfileId: string | null = null;

function buildSyncState(
  timer: TimerState,
  pausedAt: number | null,
  pauseCountUsed: number,
  isInForcedTrough: boolean,
  pauseRemainingMs?: number | null
) {
  return {
    phaseIndex: timer.macro.phaseIndex,
    phaseStartTime: timer.macro.phaseStartTime,
    phaseEndTime: timer.macro.phaseEndTime,
    pausedAt,
    pauseRemainingMs: pauseRemainingMs ?? null,
    isInForcedTrough,
    pauseCountUsed,
  };
}

export const useTimerStore = create<TimerStore>()(
  immer((set, get) => ({
    session: null,
    timer: {
      macro: { phaseIndex: 0, phaseStartTime: 0, phaseEndTime: 0, isRunning: false, isPaused: false },
      micro: { isActive: false, nextPauseAt: 0, pauseCountDelivered: 0, pauseCountMissed: 0, lastPauseEndTime: 0, isInPause: false, pauseEndTime: 0 },
      wakeLock: { isHeld: false, type: null },
    },
    showMicroPauseOverlay: false,
    pauseCountUsed: 0,
    isInForcedTrough: false,
    pausedAt: null,
    lastPauseClick: 0,
    isHydrated: false,
    saveStatus: 'idle',
    saveMessage: null,
    setSaveStatus: (status, message = null) => {
      set((state) => {
        state.saveStatus = status;
        state.saveMessage = message;
      });
    },
    realtimeStatus: 'idle',
    realtimeLastEventAt: null,
    startRealtimeSync: () => {
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const profileId = await getUserProfileId(user.id);
        if (!profileId) return;
        if (sessionRealtimeChannel && realtimeProfileId === profileId) return;
        if (sessionRealtimeChannel) {
          await sessionRealtimeChannel.unsubscribe();
          sessionRealtimeChannel = null;
        }
        realtimeProfileId = profileId;
        set((state) => {
          state.realtimeStatus = 'connecting';
        });
        sessionRealtimeChannel = subscribeToSessionChanges(profileId, async (payload: any) => {
          set((state) => {
            state.realtimeLastEventAt = Date.now();
          });
          const updated = payload?.new;
          if (!updated) return;

          const currentSession = get().session;
          const currentStatus = currentSession?.status;

          if (updated.status === 'completed' || updated.status === 'aborted') {
            if (currentSession?.id === updated.id && currentStatus !== updated.status) {
              if (macroInterval) { clearInterval(macroInterval); macroInterval = null; }
              get().stopMicroPauseEngine();
              get().releaseWakeLock();
              clearStateLocally();
              set((state) => {
                if (state.session) {
                  state.session.status = updated.status;
                  if (updated.completed_at) {
                    state.session.completedAt = new Date(updated.completed_at).getTime();
                  }
                }
                state.timer.macro.isRunning = false;
                state.timer.macro.isPaused = false;
                state.isInForcedTrough = false;
                state.pausedAt = null;
                state.pauseCountUsed = 0;
              });
            }
            return;
          }

          if (!currentSession || (currentStatus !== 'running' && currentStatus !== 'paused')) {
            if (updated.status === 'running' || updated.status === 'paused') {
              await get().restoreSession();
            }
            return;
          }

          if (
            currentSession.id === updated.id &&
            (currentSession.status === 'aborted' || currentSession.status === 'completed') &&
            (updated.status === 'running' || updated.status === 'paused')
          ) {
            return;
          }

          if (currentSession.id === updated.id && (updated.status === 'paused' || updated.status === 'running')) {
            const phaseIndex = typeof updated.current_phase_index === 'number'
              ? updated.current_phase_index
              : currentSession.currentPhaseIndex;
            const phaseStart = updated.phase_started_at
              ? new Date(updated.phase_started_at).getTime()
              : currentSession.phases[phaseIndex]?.startedAt
              ?? currentSession.startedAt;
            const phaseEnd = updated.phase_end_at
              ? new Date(updated.phase_end_at).getTime()
              : phaseStart + (currentSession.phases[phaseIndex]?.plannedDurationMs ?? 0);
            const pauseRemainingMs = updated.pause_remaining_ms ?? null;
            const pausedAt = updated.paused_at ? new Date(updated.paused_at).getTime() : null;
            const isPaused = updated.status === 'paused';
            const now = Date.now();
            const phaseStartTime = isPaused ? now : phaseStart;
            const phaseEndTime = isPaused && pauseRemainingMs !== null ? now + pauseRemainingMs : phaseEnd;

            set((state) => {
              if (state.session) {
                state.session.status = updated.status;
                state.session.currentPhaseIndex = phaseIndex;
              }
              state.timer.macro.phaseIndex = phaseIndex;
              state.timer.macro.phaseStartTime = phaseStartTime;
              state.timer.macro.phaseEndTime = phaseEndTime;
              state.timer.macro.isRunning = updated.status === 'running';
              state.timer.macro.isPaused = updated.status === 'paused';
              state.pauseCountUsed = updated.pause_count_used ?? state.pauseCountUsed;
              state.isInForcedTrough = updated.is_in_forced_trough ?? state.isInForcedTrough;
              state.pausedAt = pausedAt;
              if (state.session?.phases[phaseIndex]) {
                state.session.phases[phaseIndex].startedAt = phaseStartTime;
              }
            });

            if (macroInterval) { clearInterval(macroInterval); macroInterval = null; }
            if (updated.status === 'running') {
              macroInterval = window.setInterval(() => get().tick(), 1000);
              const currentPhase = currentSession.phases[phaseIndex];
              if (supportsMicroPauses(currentPhase.type)) get().startMicroPauseEngine();
              get().requestWakeLock();
            } else {
              get().stopMicroPauseEngine();
              get().releaseWakeLock();
            }
            return;
          }

          if (currentSession.id === updated.id && currentStatus !== updated.status) {
            await get().restoreSession();
          }
        }, (status) => {
          if (status === 'SUBSCRIBED') {
            set((state) => { state.realtimeStatus = 'subscribed'; });
          } else if (status === 'CHANNEL_ERROR') {
            set((state) => { state.realtimeStatus = 'error'; });
          } else if (status === 'TIMED_OUT') {
            set((state) => { state.realtimeStatus = 'timed_out'; });
          } else if (status === 'CLOSED') {
            set((state) => { state.realtimeStatus = 'closed'; });
          }
          console.log('[Realtime] status:', status);
        });
      })();
    },
    stopRealtimeSync: () => {
      (async () => {
        if (sessionRealtimeChannel) {
          await sessionRealtimeChannel.unsubscribe();
          sessionRealtimeChannel = null;
        }
        realtimeProfileId = null;
        set((state) => {
          state.realtimeStatus = 'idle';
        });
      })();
    },

    restoreSession: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const profileId = await getUserProfileId(user.id);
        if (profileId) {
          const { data: activeSessions } = await (supabase
            .from('sessions') as any)
            .select('id, started_at')
            .eq('user_id', profileId)
            .in('status', ['running', 'paused'])
            .order('started_at', { ascending: false })
            .limit(1);
          if (activeSessions && activeSessions.length > 0) {
            const lastAbortAt = getLastAbortAt();
            const candidate = activeSessions[0];
            const candidateStartedAt = candidate.started_at ? new Date(candidate.started_at).getTime() : null;
            if (lastAbortAt && candidateStartedAt && candidateStartedAt < lastAbortAt) {
              set((state) => { state.isHydrated = true; });
              return;
            }
            const fullSession = await loadSession(candidate.id);
            if (fullSession) {
              const phaseIndex = typeof fullSession.currentPhaseIndex === 'number'
                ? fullSession.currentPhaseIndex
                : 0;
              const plannedDuration = fullSession.phases[phaseIndex]?.plannedDurationMs ?? 0;
              const baseStart = fullSession.phaseStartedAt
                ?? fullSession.phases[phaseIndex]?.startedAt
                ?? fullSession.startedAt;
              const computedEnd = baseStart ? baseStart + plannedDuration : Date.now();
              const phaseStartTime = baseStart ?? Date.now();
              const phaseEndTime = fullSession.phaseEndAt ?? computedEnd;
              const pauseRemainingMs = fullSession.pauseRemainingMs ?? null;
              const isPaused = fullSession.status === 'paused';

              const saved: PersistedState = {
                session: fullSession,
                phaseIndex,
                phaseStartTime,
                phaseEndTime: isPaused && pauseRemainingMs !== null ? Date.now() + pauseRemainingMs : phaseEndTime,
                savedAt: Date.now(),
                pauseCount: fullSession.pauseCountUsed ?? fullSession.interruptionCount,
                isInForcedTrough: fullSession.isInForcedTrough ?? false,
                pausedRemainingMs: pauseRemainingMs ?? undefined,
                pausedAt: fullSession.pausedAt ?? null,
              };
              const now = Date.now();
              const timeSinceSave = now - saved.savedAt;
              const oldRemaining = Math.max(0, saved.phaseEndTime - saved.savedAt);
              const newRemaining = Math.max(0, oldRemaining - timeSinceSave);
              if (newRemaining > 0) {
                const newPhaseStartTime = now;
                const newPhaseEndTime = now + newRemaining;
                set((state) => {
                  state.session = saved.session;
                  state.session.status = saved.session.status;
                  state.session.currentPhaseIndex = saved.phaseIndex;
                  state.timer.macro.phaseIndex = saved.phaseIndex;
                  state.timer.macro.phaseStartTime = newPhaseStartTime;
                  state.timer.macro.phaseEndTime = newPhaseEndTime;
                  state.timer.macro.isRunning = saved.session.status !== 'paused';
                  state.timer.macro.isPaused = saved.session.status === 'paused';
                  state.pauseCountUsed = saved.pauseCount || 0;
                  state.isInForcedTrough = saved.isInForcedTrough || false;
                  state.pausedAt = saved.pausedAt ?? null;
                  state.isHydrated = true;
                  if (state.session?.phases[saved.phaseIndex]) {
                    state.session.phases[saved.phaseIndex].startedAt = newPhaseStartTime;
                  }
                });
                if (macroInterval) clearInterval(macroInterval);
                if (saved.session.status !== 'paused') {
                  macroInterval = window.setInterval(() => get().tick(), 1000);
                }
                const currentPhase = saved.session.phases[saved.phaseIndex];
                if (supportsMicroPauses(currentPhase.type) && !get().timer.macro.isPaused) get().startMicroPauseEngine();
                if (!get().timer.macro.isPaused) get().requestWakeLock();
                return;
              }
            }
          }
        }
      }
      const saved = loadStateLocally();
      if (!saved) {
        set((state) => { state.isHydrated = true; });
        return;
      }
      if (saved.session.status !== 'running' && saved.session.status !== 'paused') {
        clearStateLocally();
        set((state) => { state.isHydrated = true; });
        return;
      }
      const now = Date.now();
      const timeSinceSave = now - saved.savedAt;
      const oldRemaining = Math.max(0, saved.phaseEndTime - saved.savedAt);
      const newRemaining = Math.max(0, oldRemaining - timeSinceSave);
      if (newRemaining <= 0) {
        clearStateLocally();
        set((state) => { state.isHydrated = true; });
        return;
      }
      const newPhaseStartTime = now;
      const newPhaseEndTime = now + newRemaining;
      set((state) => {
        state.session = saved.session;
        state.session.status = saved.session.status === 'paused' ? 'paused' : 'running';
        state.timer.macro.phaseIndex = saved.phaseIndex;
        state.timer.macro.phaseStartTime = newPhaseStartTime;
        state.timer.macro.phaseEndTime = newPhaseEndTime;
        state.timer.macro.isRunning = saved.session.status !== 'paused';
        state.timer.macro.isPaused = saved.session.status === 'paused';
        state.pauseCountUsed = saved.pauseCount || 0;
        state.isInForcedTrough = saved.isInForcedTrough || false;
        state.pausedAt = saved.pausedAt ?? null;
        state.isHydrated = true;
      });
      if (macroInterval) clearInterval(macroInterval);
      macroInterval = window.setInterval(() => get().tick(), 1000);
      const currentPhase = saved.session.phases[saved.phaseIndex];
      if (supportsMicroPauses(currentPhase.type) && !get().timer.macro.isPaused) get().startMicroPauseEngine();
      if (!get().timer.macro.isPaused) get().requestWakeLock();
    },

    startSession: async (protocol: ProtocolMode) => {
      clearStateLocally();
      const phases = protocol === 'anchor' ? buildAnchorPhases() : buildDivePhases();
      const now = Date.now();
      const plannedDuration = phases[0].plannedDurationMs;
      const session: Session = {
        id: genSessionId(),
        protocol,
        startedAt: now,
        phases,
        totalDeepMinutes: 0,
        interruptionCount: 0,
        microPausesDelivered: 0,
        microPausesMissed: 0,
        currentPhaseIndex: 0,
        status: 'running',
      };
      session.phases[0].startedAt = now;
      const phaseStartTime = now;
      const phaseEndTime = now + plannedDuration;
      set((state) => {
        state.session = session;
        state.timer.macro = { phaseIndex: 0, phaseStartTime, phaseEndTime, isRunning: true, isPaused: false };
        state.timer.micro = { isActive: false, nextPauseAt: 0, pauseCountDelivered: 0, pauseCountMissed: 0, lastPauseEndTime: 0, isInPause: false, pauseEndTime: 0 };
        state.pauseCountUsed = 0;
        state.isInForcedTrough = false;
        state.pausedAt = null;
        state.lastPauseClick = 0;
      });
      const { data: { user } } = await supabase.auth.getUser();
      const profileId = user ? await getUserProfileId(user.id) : null;
      if (profileId) {
        get().setSaveStatus('saving', 'Saving session...');
        await endOtherActiveSessions(profileId, session.id);
        const { error } = await saveSession(
          session,
          profileId,
          buildSyncState(get().timer, get().pausedAt, get().pauseCountUsed, get().isInForcedTrough)
        );
        if (error) {
          console.error('saveSession error:', error);
          get().setSaveStatus('error', 'Failed to save session');
        }
        const { error: phaseError } = await savePhases(phases, session.id);
        if (phaseError) {
          console.error('savePhases error:', phaseError);
          get().setSaveStatus('error', 'Failed to save phases');
        }
        if (!error && !phaseError) {
          get().setSaveStatus('saved', 'Session saved');
        }
      } else {
        console.warn('No profile found, session not saved to Supabase');
        get().setSaveStatus('error', 'No profile found');
      }
      saveStateLocally({ session, phaseIndex: 0, phaseStartTime, phaseEndTime, savedAt: now, pauseCount: 0, isInForcedTrough: false, pausedAt: null });
      macroInterval = window.setInterval(() => get().tick(), 1000);
      get().requestWakeLock();
      if (protocol === 'dive' && supportsMicroPauses(phases[0].type)) get().startMicroPauseEngine();
      playSound('phase');
    },

    pauseSession: () => {
      const { session, timer, pauseCountUsed, lastPauseClick } = get();
      const now = Date.now();
      if (now - lastPauseClick < 500) {
        console.log('[Pause] Debounced, ignoring');
        return;
      }
      set((state) => { state.lastPauseClick = now; });

      if (!session) return;
      if (session.protocol === 'anchor') {
        console.log('[Pause] Blocked: Protocol A does not allow pauses');
        return;
      }
      if (session.protocol === 'dive' && pauseCountUsed >= 1) {
        console.log('[Pause] Blocked: Pause limit reached for this block');
        return;
      }
      if (timer.macro.isPaused) {
        console.log('[Pause] Already paused, ignoring');
        return;
      }

      const remainingMs = Math.max(0, timer.macro.phaseEndTime - now);
      get().stopMicroPauseEngine();
      set((state) => {
        state.timer.macro.isPaused = true;
        state.timer.macro.isRunning = false;
        state.session!.status = 'paused';
        state.pauseCountUsed += 1;
        state.pausedAt = now;
      });
      get().releaseWakeLock();
      const stateToSave = {
        session: session!,
        phaseIndex: timer.macro.phaseIndex,
        phaseStartTime: now,
        phaseEndTime: now + remainingMs,
        savedAt: now,
        pauseCount: pauseCountUsed + 1,
        isInForcedTrough: false,
        pausedRemainingMs: remainingMs,
        pausedAt: now,
      };
      saveStateLocally(stateToSave);
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const profileId = user ? await getUserProfileId(user.id) : null;
        if (profileId) {
          await claimSessionLease(session!.id, profileId, getTabId(), 45, true);
          const updatedSession = session ? { ...session, status: 'paused' } : session;
          await saveSession(
            updatedSession!,
            profileId,
            buildSyncState(get().timer, get().pausedAt, get().pauseCountUsed, get().isInForcedTrough, remainingMs)
          );
        }
      })();
    },

    triggerForcedTrough: () => {
      const { session, timer } = get();
      if (!session) return;
      if (get().isInForcedTrough) return;
      const now = Date.now();
      const currentPhase = session.phases[timer.macro.phaseIndex];
      set((state) => {
        state.session!.phases[state.timer.macro.phaseIndex].actualDurationMs = now - state.timer.macro.phaseStartTime;
        state.session!.phases[state.timer.macro.phaseIndex].endedAt = now;
      });
      if (currentPhase.type === 'sprint' || currentPhase.type === 'deep_block') {
        set((state) => {
          state.session!.totalDeepMinutes += Math.round((now - state.timer.macro.phaseStartTime) / 60000);
        });
      }
      const troughIndex = session.phases.findIndex(p => p.type === 'trough');
      if (troughIndex === -1) {
        get().abortSession();
        return;
      }
      const troughPhase = session.phases[troughIndex];
      const troughStartTime = now;
      const troughEndTime = now + troughPhase.plannedDurationMs;
      set((state) => {
        state.timer.macro.phaseIndex = troughIndex;
        state.timer.macro.phaseStartTime = troughStartTime;
        state.timer.macro.phaseEndTime = troughEndTime;
        state.timer.macro.isPaused = false;
        state.timer.macro.isRunning = true;
        state.session!.currentPhaseIndex = troughIndex;
        state.session!.status = 'running';
        state.isInForcedTrough = true;
        state.pausedAt = null;
        state.pauseCountUsed = 0;
        state.session!.phases[troughIndex].startedAt = troughStartTime;
      });
      get().stopMicroPauseEngine();
      get().startMicroPauseEngine();
      if (!macroInterval) macroInterval = window.setInterval(() => get().tick(), 1000);
      get().requestWakeLock();
      playSound('phase');
      void sendNativeNotification('Recovery Trough', 'Time to recover and reset.');
      const stateToSave = {
        session: get().session!,
        phaseIndex: troughIndex,
        phaseStartTime: troughStartTime,
        phaseEndTime: troughEndTime,
        savedAt: now,
        pauseCount: 0,
        isInForcedTrough: true,
        pausedAt: null,
      };
      saveStateLocally(stateToSave);
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const profileId = user ? await getUserProfileId(user.id) : null;
        if (profileId) {
          await saveSession(
            get().session!,
            profileId,
            buildSyncState(get().timer, get().pausedAt, get().pauseCountUsed, get().isInForcedTrough)
          );
          await savePhases(get().session!.phases, get().session!.id);
        }
      })();
    },

    resumeSession: () => {
      const { session, timer } = get();
      if (!session) return;
      if (!timer.macro.isPaused) {
        console.log('[Resume] Session is not paused, ignoring');
        return;
      }
      const now = Date.now();
      const saved = loadStateLocally();
      let remainingMs = 0;
      if (saved && saved.pausedRemainingMs !== undefined) {
        remainingMs = saved.pausedRemainingMs;
      } else {
        remainingMs = Math.max(0, timer.macro.phaseEndTime - timer.macro.phaseStartTime);
      }
      const newPhaseStartTime = now;
      const newPhaseEndTime = now + remainingMs;
      set((state) => {
        state.timer.macro.isPaused = false;
        state.timer.macro.isRunning = true;
        state.timer.macro.phaseStartTime = newPhaseStartTime;
        state.timer.macro.phaseEndTime = newPhaseEndTime;
        state.session!.status = 'running';
        state.pausedAt = null;
      });
      if (!macroInterval) macroInterval = window.setInterval(() => get().tick(), 1000);
      get().requestWakeLock();
      const currentPhase = session.phases[timer.macro.phaseIndex];
      if (supportsMicroPauses(currentPhase.type)) get().startMicroPauseEngine();
      const stateToSave = {
        session,
        phaseIndex: timer.macro.phaseIndex,
        phaseStartTime: newPhaseStartTime,
        phaseEndTime: newPhaseEndTime,
        savedAt: now,
        pauseCount: get().pauseCountUsed,
        isInForcedTrough: get().isInForcedTrough,
        pausedAt: null,
      };
      saveStateLocally(stateToSave);
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const profileId = user ? await getUserProfileId(user.id) : null;
        if (profileId) {
          await claimSessionLease(session.id, profileId, getTabId(), 45, true);
          const updatedSession = { ...session, status: 'running' };
          await saveSession(
            updatedSession,
            profileId,
            buildSyncState(get().timer, get().pausedAt, get().pauseCountUsed, get().isInForcedTrough)
          );
        }
      })();
    },

    skipPhase: () => {
      const { session, timer } = get();
      if (!session || !timer.macro.isRunning) return;
      set((state) => { state.session!.phases[state.timer.macro.phaseIndex].skipped = true; });
      get().completePhase();
    },

    abortSession: () => {
      if (macroInterval) { clearInterval(macroInterval); macroInterval = null; }
      get().stopMicroPauseEngine();
      get().releaseWakeLock();
      clearStateLocally();
      const currentSession = get().session;
      const abortedAt = Date.now();
      setLastAbortAt(abortedAt);
      set((state) => {
        if (state.session) {
          state.session.status = 'aborted';
          state.session.completedAt = abortedAt;
        }
        state.timer.macro.isRunning = false;
        state.timer.macro.isPaused = false;
        state.isInForcedTrough = false;
        state.pausedAt = null;
        state.pauseCountUsed = 0;
      });
      playSound('complete');
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const profileId = user ? await getUserProfileId(user.id) : null;
        if (profileId && currentSession) {
          await claimSessionLease(currentSession.id, profileId, getTabId(), 45, true);
          await endAllActiveSessions(profileId);
          const abortedSession = {
            ...currentSession,
            status: 'aborted',
            completedAt: abortedAt,
          };
          await saveSession(
            abortedSession,
            profileId,
            buildSyncState(get().timer, null, 0, false, null)
          );
        }
      })();
    },

    completePhase: () => {
      const { session, timer } = get();
      if (!session) return;
      const now = Date.now();
      const currentPhase = session.phases[timer.macro.phaseIndex];
      set((state) => {
        state.session!.phases[state.timer.macro.phaseIndex].completed = true;
        state.session!.phases[state.timer.macro.phaseIndex].actualDurationMs = now - state.timer.macro.phaseStartTime;
        state.session!.phases[state.timer.macro.phaseIndex].endedAt = now;
      });
      if (currentPhase.type === 'sprint' || currentPhase.type === 'deep_block') {
        set((state) => {
          state.session!.totalDeepMinutes += Math.round(currentPhase.actualDurationMs! / 60000);
        });
      }
      const nextIndex = timer.macro.phaseIndex + 1;
      if (nextIndex >= session.phases.length) {
        if (macroInterval) { clearInterval(macroInterval); macroInterval = null; }
        get().stopMicroPauseEngine();
        get().releaseWakeLock();
        clearStateLocally();
        set((state) => {
          state.session!.status = 'completed';
          state.session!.completedAt = now;
          state.timer.macro.isRunning = false;
          state.timer.macro.isPaused = false;
          state.isInForcedTrough = false;
          state.pausedAt = null;
          state.pauseCountUsed = 0;
        });
        playSound('complete');
        void sendNativeNotification('Session Complete', 'Great work. Session finished.');
        (async () => {
          const { data: { user } } = await supabase.auth.getUser();
          const profileId = user ? await getUserProfileId(user.id) : null;
          if (profileId) {
            get().setSaveStatus('saving', 'Saving session...');
            const { error } = await saveSession(
              get().session!,
              profileId,
              buildSyncState(get().timer, get().pausedAt, get().pauseCountUsed, get().isInForcedTrough)
            );
            if (error) {
              console.error('saveSession error on complete:', error);
              get().setSaveStatus('error', 'Failed to save session');
            }
            const { error: phaseError } = await savePhases(get().session!.phases, get().session!.id);
            if (phaseError) {
              console.error('savePhases error on complete:', phaseError);
              get().setSaveStatus('error', 'Failed to save phases');
            }
            if (!error && !phaseError) {
              get().setSaveStatus('saved', 'Session saved');
            }
          } else {
            console.warn('No user on session completion');
            get().setSaveStatus('error', 'No profile found');
          }
        })();
        return;
      }
      const nextPhase = session.phases[nextIndex];
      const nextStartTime = now;
      const nextEndTime = now + nextPhase.plannedDurationMs;
      set((state) => {
        state.timer.macro.phaseIndex = nextIndex;
        state.timer.macro.phaseStartTime = nextStartTime;
        state.timer.macro.phaseEndTime = nextEndTime;
        state.session!.currentPhaseIndex = nextIndex;
        state.session!.phases[nextIndex].startedAt = nextStartTime;
        if (nextPhase.type === 'trough') state.pauseCountUsed = 0;
      });
      if (supportsMicroPauses(nextPhase.type)) get().startMicroPauseEngine();
      else get().stopMicroPauseEngine();
      playSound('phase');
      void sendNativeNotification('Phase Started', `${getPhaseDisplayName(nextPhase.type)} begins now.`);
      const stateToSave = {
        session: get().session!,
        phaseIndex: nextIndex,
        phaseStartTime: nextStartTime,
        phaseEndTime: nextEndTime,
        savedAt: now,
        pauseCount: get().pauseCountUsed,
        isInForcedTrough: get().isInForcedTrough,
        pausedAt: null,
      };
      saveStateLocally(stateToSave);
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
          const profileId = user ? await getUserProfileId(user.id) : null;
          if (profileId) {
              await saveSession(
                get().session!,
                profileId,
                buildSyncState(get().timer, get().pausedAt, get().pauseCountUsed, get().isInForcedTrough)
              );
          await savePhases(get().session!.phases, get().session!.id);
        }
      })();
    },

    startMicroPauseEngine: () => {
      const { session, timer } = get();
      if (!session || timer.micro.isActive) return;
      const currentPhase = session.phases[timer.macro.phaseIndex];
      if (!supportsMicroPauses(currentPhase.type)) return;
      if (!microPauseWorker) {
        microPauseWorker = new Worker(new URL('../workers/microPauseWorker.ts', import.meta.url), { type: 'module' });
        microPauseWorker.onmessage = (event) => {
          const { type, payload } = event.data;
          switch (type) {
            case 'PRE_ALERT':
              playSound('micro_pre_alert');
              break;
            case 'PAUSE_STARTED':
              set((state) => {
                state.timer.micro.isInPause = true;
                state.timer.micro.pauseEndTime = payload.pauseEndTime;
                state.showMicroPauseOverlay = true;
              });
              playSound('micro');
              break;
            case 'PAUSE_ENDED':
              set((state) => {
                state.timer.micro.isInPause = false;
                state.timer.micro.pauseEndTime = 0;
                state.timer.micro.pauseCountDelivered = payload.pauseCountDelivered;
                state.showMicroPauseOverlay = false;
              });
              playSound('micro_end');
              break;
            case 'ENGINE_STOPPED':
              set((state) => {
                state.timer.micro.isActive = false;
                state.timer.micro.pauseCountDelivered = payload.pauseCountDelivered;
                state.timer.micro.pauseCountMissed = payload.pauseCountMissed;
              });
              break;
          }
        };
      }
      const remainingTime = timer.macro.phaseEndTime - Date.now();
      const config: MicroPauseConfig = DEFAULT_CONFIG.dive.microPause;
      microPauseWorker.postMessage({ type: 'START', payload: { config, deepBlockDurationMs: remainingTime } });
      set((state) => { state.timer.micro.isActive = true; });
    },

    stopMicroPauseEngine: () => {
      if (microPauseWorker) microPauseWorker.postMessage({ type: 'STOP' });
      set((state) => {
        state.timer.micro.isActive = false;
        state.timer.micro.isInPause = false;
        state.showMicroPauseOverlay = false;
      });
    },

    setShowMicroPauseOverlay: (show: boolean) => {
      set((state) => { state.showMicroPauseOverlay = show; });
    },

    requestWakeLock: async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockSentinel = await navigator.wakeLock.request('screen');
          wakeLockSentinel.addEventListener('release', () => {
            set((state) => { state.timer.wakeLock.isHeld = false; state.timer.wakeLock.type = null; });
          });
          set((state) => { state.timer.wakeLock.isHeld = true; state.timer.wakeLock.type = 'screen'; });
        }
      } catch (err) { console.warn('[WakeLock] Failed:', err); }
    },

    releaseWakeLock: () => {
      if (wakeLockSentinel) { wakeLockSentinel.release(); wakeLockSentinel = null; }
      set((state) => { state.timer.wakeLock.isHeld = false; state.timer.wakeLock.type = null; });
    },

    tick: () => {
      const { session, timer, isInForcedTrough, pausedAt } = get();
      if (!session) return;

      if (timer.macro.isPaused && !isInForcedTrough && pausedAt !== null) {
        const now = Date.now();
        const pausedDuration = now - pausedAt;
        if (pausedDuration >= 3 * 60 * 1000) {
          console.log('[AutoTrough] Pause exceeded 3 min, triggering forced trough');
          get().triggerForcedTrough();
          return;
        }
      }

      if (timer.macro.isPaused) return;

      const now = Date.now();
      if (Math.floor(now / 1000) % 10 === 0) {
        saveStateLocally({
          session,
          phaseIndex: timer.macro.phaseIndex,
          phaseStartTime: timer.macro.phaseStartTime,
          phaseEndTime: timer.macro.phaseEndTime,
          savedAt: now,
          pauseCount: get().pauseCountUsed,
          isInForcedTrough: get().isInForcedTrough,
          pausedAt: get().pausedAt,
        });
        if (typeof document !== 'undefined' && document.hidden) {
          return;
        }
        (async () => {
          const { data: { user } } = await supabase.auth.getUser();
          const profileId = user ? await getUserProfileId(user.id) : null;
          if (profileId) {
            const lease = await refreshSessionLease(session.id, profileId, getTabId(), 45);
            if (!lease.data) return;
            await saveSession(
              session,
              profileId,
              buildSyncState(get().timer, get().pausedAt, get().pauseCountUsed, get().isInForcedTrough),
              { allowStatusChange: false }
            );
          }
        })();
      }
      if (now >= timer.macro.phaseEndTime) {
        get().completePhase();
      }
    },
  }))
);

window.addEventListener('beforeunload', () => {
  const store = useTimerStore.getState();
  const { session, timer } = store;
  if (session && (session.status === 'running' || session.status === 'paused')) {
    saveStateLocally({
      session,
      phaseIndex: timer.macro.phaseIndex,
      phaseStartTime: timer.macro.phaseStartTime,
      phaseEndTime: timer.macro.phaseEndTime,
      savedAt: Date.now(),
      pauseCount: store.pauseCountUsed,
      isInForcedTrough: store.isInForcedTrough,
      pausedAt: store.pausedAt,
    });
  }
});

useTimerStore.getState().restoreSession();