// src/utils/notificationUtils.js
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const isPushSupported = () => {
  if (Capacitor.isNativePlatform()) {
    return true; // Local notifications are always supported natively
  }
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

export const registerServiceWorker = async () => {
  if (Capacitor.isNativePlatform()) {
    return null; // Native does not need web Service Worker registration
  }
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
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await LocalNotifications.requestPermissions();
      return result.display; // 'granted', 'denied', or 'prompt'
    } catch (err) {
      console.error('[Notification] Error requesting native permission:', err);
      return 'denied';
    }
  }
  if (!('Notification' in window)) return 'unsupported';
  const permission = await Notification.requestPermission();
  return permission; // 'granted', 'denied', or 'default'
};

export const checkNotificationPermission = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await LocalNotifications.checkPermissions();
      return result.display; // 'granted', 'denied', or 'prompt'
    } catch (err) {
      console.error('[Notification] Error checking native permission:', err);
      return 'denied';
    }
  }
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

export const scheduleLocalNotification = async (title, options) => {
  if (Capacitor.isNativePlatform()) {
    try {
      const permission = await LocalNotifications.checkPermissions();
      if (permission.display !== 'granted') {
        console.warn('[Notification] Native notifications permission not granted');
        return;
      }
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body: options?.body || '',
            id: Math.floor(Math.random() * 100000), // Random unique ID
            schedule: { at: new Date(Date.now() + 1000) }, // 1s from now
            sound: options?.sound || null,
            extra: options?.extra || null,
          }
        ]
      });
      console.log('[Notification] Native notification scheduled successfully');
      return;
    } catch (err) {
      console.error('[Notification] Native scheduling failed:', err);
      return;
    }
  }

  // Web Browser fallback
  const currentPerm = !('Notification' in window) ? 'unsupported' : Notification.permission;
  if (currentPerm !== 'granted') return;

  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration) {
      registration.showNotification(title, {
        icon: '/favicon-96x96.png',
        badge: '/favicon-96x96.png',
        ...options
      });
    } else {
      new Notification(title, {
        icon: '/favicon-96x96.png',
        ...options
      });
    }
  } catch (err) {
    new Notification(title, {
      icon: '/favicon-96x96.png',
      ...options
    });
  }
};

export const scheduleTimerCompletionNotification = async (title, body, triggerAtEpochMs) => {
  if (Capacitor.isNativePlatform()) {
    try {
      const permission = await LocalNotifications.checkPermissions();
      if (permission.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }
      
      // Cancel any previous notification to prevent ghost alerts
      await LocalNotifications.cancel({ notifications: [{ id: 9999 }] });

      // Schedule for the future trigger timestamp
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: 9999, // Persistent unique identifier for the Focus Timer
            schedule: { at: new Date(triggerAtEpochMs) },
            sound: null, // Uses default system sound
            extra: { type: 'focus-timer-complete' },
            actionTypeId: '',
          }
        ]
      });
      console.log(`[Notification] Background alarm scheduled for: ${new Date(triggerAtEpochMs).toLocaleTimeString()}`);
    } catch (err) {
      console.error('[Notification] Error scheduling background native notification:', err);
    }
  } else {
    console.log('[Notification] Running in Web mode. Local background scheduler simulated via active tab context.');
  }
};

export const cancelTimerNotification = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.cancel({ notifications: [{ id: 9999 }] });
      console.log('[Notification] Background timer notification cancelled.');
    } catch (err) {
      console.error('[Notification] Failed to cancel native notification:', err);
    }
  }
};
