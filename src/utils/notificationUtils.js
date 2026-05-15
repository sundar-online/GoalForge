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
      console.error('[Notification] Error cancelling background native notification:', err);
    }
  }
};

export const getNotificationId = (id) => {
  if (typeof id === 'number') return id;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; 
  }
  return Math.abs(hash % 1000000);
};

export const scheduleReminder = async (id, title, body, timeStr, scheduleDays = []) => {
  if (!Capacitor.isNativePlatform()) {
    console.log(`[Notification] Reminder simulation: "${title}" at ${timeStr} (Days: ${scheduleDays.length ? scheduleDays.join(',') : 'Everyday'})`);
    return;
  }

  try {
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') {
      const result = await LocalNotifications.requestPermissions();
      if (result.display !== 'granted') return;
    }

    const [hour, minute] = timeStr.split(':').map(Number);
    const mainId = getNotificationId(id);
    const dayMap = { 'Sun': 1, 'Mon': 2, 'Tue': 3, 'Wed': 4, 'Thu': 5, 'Fri': 6, 'Sat': 7 };
    const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // 1. Cancel previous schedules for this habit
    const idsToCancel = [mainId, ...ALL_DAYS.map(d => getNotificationId(`${id}-${d}`))];
    await LocalNotifications.cancel({ notifications: idsToCancel.map(cid => ({ id: cid })) });

    if (!scheduleDays || scheduleDays.length === 0) {
      // 2a. Schedule Daily Reminder
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body: body || 'Time to complete your habit!',
            id: mainId,
            schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
            extra: { type: 'reminder', originalId: id }
          }
        ]
      });
      console.log(`[Notification] Scheduled "${title}" daily at ${timeStr} [ID: ${mainId}]`);
    } else {
      // 2b. Schedule Weekday Reminders
      const notifications = scheduleDays.map(day => ({
        title,
        body: body || 'Time to complete your habit!',
        id: getNotificationId(`${id}-${day}`),
        schedule: { on: { weekday: dayMap[day], hour, minute }, repeats: true, allowWhileIdle: true },
        extra: { type: 'reminder', originalId: id, day }
      }));
      
      await LocalNotifications.schedule({ notifications });
      console.log(`[Notification] Scheduled "${title}" for ${scheduleDays.join(',')} at ${timeStr}`);
    }
  } catch (err) {
    console.error('[Notification] Failed to schedule reminder:', err);
  }
};

export const cancelReminder = async (id) => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const mainId = getNotificationId(id);
    const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const idsToCancel = [mainId, ...ALL_DAYS.map(d => getNotificationId(`${id}-${d}`))];
    
    await LocalNotifications.cancel({ notifications: idsToCancel.map(cid => ({ id: cid })) });
    console.log(`[Notification] Cancelled all reminders for: ${id}`);
  } catch (err) {
    console.error('[Notification] Failed to cancel reminder:', err);
  }
};

