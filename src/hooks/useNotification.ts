import { useEffect, useCallback, useState } from 'react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useNotifications() {
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);
  const [isTauriEnv, setIsTauriEnv] = useState(false);

  const getTauriNotificationApi = useCallback(async () => {
    try {
      const core = await import('@tauri-apps/api/core');
      if (!core.isTauri()) return null;
      const notification = await import('@tauri-apps/plugin-notification');
      return notification;
    } catch {
      return null;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    const tauriNotification = await getTauriNotificationApi();
    if (tauriNotification) {
      const alreadyGranted = await tauriNotification.isPermissionGranted();
      if (alreadyGranted) return true;
      const permission = await tauriNotification.requestPermission();
      return permission === 'granted';
    }

    if (!('Notification' in window)) {
      console.warn('[Notifications] Not supported on this browser');
      return false;
    }
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }, [getTauriNotificationApi]);

  const ensurePushSubscription = useCallback(async () => {
    if (isTauriEnv) {
      return null;
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[Push] Not supported in this browser');
      return null;
    }

    const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
    if (!publicKey) {
      console.warn('[Push] Missing VITE_VAPID_PUBLIC_KEY');
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      setPushSubscription(existing);
      return existing;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    setPushSubscription(subscription);
    return subscription;
  }, [isTauriEnv]);

  const sendLocalNotification = useCallback(async (title: string, options?: NotificationOptions) => {
    const tauriNotification = await getTauriNotificationApi();
    if (tauriNotification) {
      tauriNotification.sendNotification({
        title,
        body: options?.body,
      });
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        requireInteraction: true,
        ...options,
      });
    }
  }, [getTauriNotificationApi]);

  useEffect(() => {
    getTauriNotificationApi().then((api) => {
      setIsTauriEnv(Boolean(api));
    });
  }, [getTauriNotificationApi]);

  useEffect(() => {
    requestPermission().then((granted) => {
      if (granted) {
        ensurePushSubscription().catch((error) => {
          console.warn('[Push] Subscription failed', error);
        });
      }
    });
  }, [requestPermission, ensurePushSubscription]);

  return {
    requestPermission,
    ensurePushSubscription,
    pushSubscription,
    sendLocalNotification,
    isSupported: isTauriEnv || 'Notification' in window,
    isPushSupported: !isTauriEnv && 'serviceWorker' in navigator && 'PushManager' in window,
  };
}