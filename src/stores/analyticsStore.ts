import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { AnalyticsSnapshot, UserProfile } from '../types';
import { generateDailySnapshot } from '../lib/analytics';

interface AnalyticsStore {
  // Data
  profile: UserProfile | null;
  snapshots: AnalyticsSnapshot[];
  todaySnapshot: AnalyticsSnapshot | null;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  setProfile: (profile: UserProfile) => void;
  addSnapshot: (snapshot: AnalyticsSnapshot) => void;
  calculateToday: (sessions: any[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAnalyticsStore = create<AnalyticsStore>()(
  immer((set) => ({
    profile: null,
    snapshots: [],
    todaySnapshot: null,
    isLoading: false,
    error: null,

    setProfile: (profile) => {
      set((state) => {
        state.profile = profile;
      });
    },

    addSnapshot: (snapshot) => {
      set((state) => {
        const existingIndex = state.snapshots.findIndex(
          (s: AnalyticsSnapshot) => s.date === snapshot.date
        );
        if (existingIndex >= 0) {
          state.snapshots[existingIndex] = snapshot;
        } else {
          state.snapshots.push(snapshot);
        }
        state.snapshots.sort((a: AnalyticsSnapshot, b: AnalyticsSnapshot) => a.date.localeCompare(b.date));
      });
    },

    calculateToday: (sessions) => {
      set((state) => {
        if (!state.profile) return;

        const today = new Date().toISOString().split('T')[0];
        const previousSnapshot = state.snapshots.find((s: AnalyticsSnapshot) => s.date < today);

        const snapshot = generateDailySnapshot(
          today,
          sessions,
          state.profile,
          previousSnapshot
        );

        state.todaySnapshot = snapshot;

        const existingIndex = state.snapshots.findIndex((s: AnalyticsSnapshot) => s.date === today);
        if (existingIndex >= 0) {
          state.snapshots[existingIndex] = snapshot;
        } else {
          state.snapshots.push(snapshot);
        }
      });
    },

    setLoading: (loading) => {
      set((state) => {
        state.isLoading = loading;
      });
    },

    setError: (error) => {
      set((state) => {
        state.error = error;
      });
    },
  }))
);
