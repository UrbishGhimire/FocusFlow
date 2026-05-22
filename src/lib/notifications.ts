type TauriNotificationApi = {
  isPermissionGranted: () => Promise<boolean>;
  requestPermission: () => Promise<'granted' | 'denied' | 'default'>;
  sendNotification: (options: { title: string; body?: string }) => void;
};

async function getTauriNotificationApi(): Promise<TauriNotificationApi | null> {
  try {
    const core = await import('@tauri-apps/api/core');
    if (!core.isTauri()) return null;
    const notification = await import('@tauri-apps/plugin-notification');
    return notification;
  } catch {
    return null;
  }
}

export async function sendNativeNotification(title: string, body?: string) {
  const tauriNotification = await getTauriNotificationApi();
  if (tauriNotification) {
    const granted = await tauriNotification.isPermissionGranted();
    if (!granted) {
      const permission = await tauriNotification.requestPermission();
      if (permission !== 'granted') return;
    }
    tauriNotification.sendNotification({ title, body });
    return;
  }

  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  new Notification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    requireInteraction: true,
  });
}
