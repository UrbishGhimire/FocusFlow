import { useEffect, useCallback } from 'react';
import { useTimerStore } from '../stores/timerStore';

export function useWakeLock() {
  // Use optional chaining to safely access nested properties
  const isRunning = useTimerStore((state) => state?.timer?.macro?.isRunning ?? false);
  const isPaused = useTimerStore((state) => state?.timer?.macro?.isPaused ?? false);
  const isHeld = useTimerStore((state) => state?.timer?.wakeLock?.isHeld ?? false);
  const requestWakeLock = useTimerStore((state) => state.requestWakeLock);
  const releaseWakeLock = useTimerStore((state) => state.releaseWakeLock);

  const reacquire = useCallback(async () => {
    if (isRunning && !isPaused && !isHeld) {
      await requestWakeLock();
    }
  }, [isRunning, isPaused, isHeld, requestWakeLock]);

  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) {
        reacquire();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [reacquire]);

  useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  return {
    isHeld,
    request: requestWakeLock,
    release: releaseWakeLock,
  };
}