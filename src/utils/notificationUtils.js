// src/utils/notificationUtils.js
export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

export const registerServiceWorker = async () => {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('[SW] Service Worker registered successfully', registration);
    return registration;
  } catch (error) {
    console.error('[SW] Service Worker registration failed:', error);
    return null;
  }
};

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return 'unsupported';
  const permission = await Notification.requestPermission();
  return permission; // 'granted', 'denied', or 'default'
};

export const checkNotificationPermission = () => {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

export const scheduleLocalNotification = async (title, options) => {
  if (checkNotificationPermission() !== 'granted') return;
  const registration = await navigator.serviceWorker.ready;
  if (registration) {
    registration.showNotification(title, {
      icon: '/favicon-96x96.png',
      badge: '/favicon-96x96.png',
      ...options
    });
  } else {
    // Fallback if SW is not ready but permission is granted
    new Notification(title, {
      icon: '/favicon-96x96.png',
      ...options
    });
  }
};
