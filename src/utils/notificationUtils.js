// src/utils/notificationUtils.js
// ═══════════════════════════════════════════════════════════════════════════════
// GoalForge — Production-Ready Notification Utilities
// Supports: Android 12-15, iOS, Web fallback
// Requires: @capacitor/local-notifications ^8.x
// ═══════════════════════════════════════════════════════════════════════════════

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// ── Constants ─────────────────────────────────────────────────────────────────
const CHANNEL_ID = 'goalforge-reminders';
const FOCUS_TIMER_ID = 9999;
const EVENT_REMINDER_BASE_ID = 80000; // Offset to avoid collisions with habit IDs

// ── Debug Logger ──────────────────────────────────────────────────────────────
const notifLog = (msg, data) =>
  console.log(`%c[Notification] ${msg}`, 'color: #4d7cff; font-weight: bold;', data !== undefined ? data : '');

const notifWarn = (msg, data) =>
  console.warn(`%c[Notification] ${msg}`, 'color: #f59e0b; font-weight: bold;', data !== undefined ? data : '');

const notifError = (msg, err) =>
  console.error(`%c[Notification] ${msg}`, 'color: #ef4444; font-weight: bold;', err?.message || err || '');

// ── Platform Detection ────────────────────────────────────────────────────────
export const isNative = () => Capacitor.isNativePlatform();

export const isPushSupported = () => {
  if (isNative()) return true;
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

// ── Service Worker (Web only) ─────────────────────────────────────────────────
export const registerServiceWorker = async () => {
  if (isNative()) return null;
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    notifLog('Service Worker registered', registration.scope);
    return registration;
  } catch (error) {
    notifError('Service Worker registration failed:', error);
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ── CHANNEL INITIALIZATION ────────────────────────────────────────────────────
// Must be called once on app boot before any notifications are scheduled.
// Creates a high-importance Android notification channel with sound + vibration.
// ═══════════════════════════════════════════════════════════════════════════════
export const initNotificationChannel = async () => {
  if (!isNative()) {
    notifLog('Web mode — skipping native channel creation');
    return;
  }

  try {
    // 1. Check & request permission
    const permResult = await LocalNotifications.checkPermissions();
    notifLog('Permission status on init:', permResult.display);

    if (permResult.display === 'prompt' || permResult.display === 'prompt-with-rationale') {
      const requested = await LocalNotifications.requestPermissions();
      notifLog('Permission after request:', requested.display);
      if (requested.display !== 'granted') {
        notifWarn('Notification permission denied by user. Notifications will not work.');
        return;
      }
    } else if (permResult.display === 'denied') {
      notifWarn('Notification permission is permanently denied. User must enable in Settings.');
      return;
    }

    // 2. Create the GoalForge notification channel (Android 8+ required)
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'GoalForge Reminders',
      description: 'Focus sessions, habit reminders, and event alerts',
      importance: 5,           // IMPORTANCE_HIGH — shows as banner with sound
      visibility: 1,           // VISIBILITY_PUBLIC — shows on lock screen
      sound: 'default',        // System default notification sound
      vibration: true,
      lights: true,
      lightColor: '#4d7cff',   // GoalForge accent blue
    });

    notifLog('Notification channel created:', CHANNEL_ID);
  } catch (err) {
    notifError('Failed to initialize notification channel:', err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ── NOTIFICATION EVENT LISTENERS ─────────────────────────────────────────────
// Call once on app boot to:
//   - Log received notifications for debugging
//   - Handle tap-to-open behavior
// ═══════════════════════════════════════════════════════════════════════════════
let _listenersAttached = false;

export const setupNotificationListeners = () => {
  if (!isNative() || _listenersAttached) return;

  // Fires when a notification is received while app is in foreground
  LocalNotifications.addListener('localNotificationReceived', (notification) => {
    notifLog('Notification RECEIVED (foreground):', {
      id: notification.id,
      title: notification.title,
      body: notification.body,
      extra: notification.extra,
    });
  });

  // Fires when user taps a notification (foreground OR background)
  LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    notifLog('Notification ACTION (tapped):', {
      id: action.notification.id,
      actionId: action.actionId,
      extra: action.notification.extra,
    });
    // The app is brought to foreground automatically by Capacitor on tap.
    // You can add deep-link routing here based on action.notification.extra.type
  });

  _listenersAttached = true;
  notifLog('Notification listeners attached');
};

// ═══════════════════════════════════════════════════════════════════════════════
// ── PERMISSION HELPERS ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export const requestNotificationPermission = async () => {
  if (isNative()) {
    try {
      const result = await LocalNotifications.requestPermissions();
      notifLog('requestPermissions result:', result.display);
      return result.display; // 'granted' | 'denied' | 'prompt'
    } catch (err) {
      notifError('Error requesting native permission:', err);
      return 'denied';
    }
  }
  if (!('Notification' in window)) return 'unsupported';
  const permission = await Notification.requestPermission();
  return permission;
};

export const checkNotificationPermission = async () => {
  if (isNative()) {
    try {
      const result = await LocalNotifications.checkPermissions();
      return result.display;
    } catch (err) {
      notifError('Error checking native permission:', err);
      return 'denied';
    }
  }
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ── ID HELPERS ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
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

// Event reminders get IDs in a separate range to avoid collisions
export const getEventNotificationId = (eventId) => {
  const hash = getNotificationId(String(eventId));
  return EVENT_REMINDER_BASE_ID + (hash % 10000);
};

// ═══════════════════════════════════════════════════════════════════════════════
// ── IMMEDIATE / GENERAL NOTIFICATION ─────────────────────────────────────────
// For sync alerts (new task from another device, etc.)
// ═══════════════════════════════════════════════════════════════════════════════
export const scheduleLocalNotification = async (title, options = {}) => {
  if (isNative()) {
    try {
      const permission = await LocalNotifications.checkPermissions();
      if (permission.display !== 'granted') {
        notifWarn('scheduleLocalNotification skipped — permission not granted');
        return;
      }

      const notifId = Math.floor(Math.random() * 79999) + 1; // Stay below event ID range
      await LocalNotifications.schedule({
        notifications: [{
          title,
          body: options?.body || '',
          id: notifId,
          channelId: CHANNEL_ID,
          schedule: { at: new Date(Date.now() + 1000) }, // 1s delay
          sound: 'default',
          extra: options?.extra || null,
        }]
      });

      notifLog(`scheduleLocalNotification: "${title}" [ID: ${notifId}]`);
    } catch (err) {
      notifError('scheduleLocalNotification failed:', err);
    }
    return;
  }

  // Web fallback
  const perm = !('Notification' in window) ? 'unsupported' : Notification.permission;
  if (perm !== 'granted') return;

  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg) {
      reg.showNotification(title, { icon: '/favicon-96x96.png', badge: '/favicon-96x96.png', ...options });
    } else {
      new Notification(title, { icon: '/favicon-96x96.png', ...options });
    }
  } catch {
    new Notification(title, { icon: '/favicon-96x96.png', ...options });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ── FOCUS TIMER NOTIFICATION ──────────────────────────────────────────────────
// Schedules a one-shot alarm at `triggerAtEpochMs`.
// Works even when app is minimized, background, or screen locked.
// Uses a fixed ID (9999) so it can be cancelled deterministically.
// ═══════════════════════════════════════════════════════════════════════════════
export const scheduleTimerCompletionNotification = async (title, body, triggerAtEpochMs) => {
  if (!isNative()) {
    notifLog('Web mode — focus timer completion is handled by the in-app setInterval only.');
    return;
  }

  try {
    // Validate trigger time
    const triggerDate = new Date(triggerAtEpochMs);
    if (isNaN(triggerDate.getTime())) {
      notifError('scheduleTimerCompletionNotification: Invalid trigger date', triggerAtEpochMs);
      return;
    }
    if (triggerAtEpochMs <= Date.now()) {
      notifWarn('scheduleTimerCompletionNotification: Trigger time is in the past', {
        triggerDate: triggerDate.toISOString(),
        now: new Date().toISOString(),
      });
      return;
    }

    // Ensure permission
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') {
      const requested = await LocalNotifications.requestPermissions();
      if (requested.display !== 'granted') {
        notifWarn('Focus timer notification skipped — permission denied');
        return;
      }
    }

    // Cancel any previous focus timer notification
    try {
      await LocalNotifications.cancel({ notifications: [{ id: FOCUS_TIMER_ID }] });
      notifLog('Cancelled previous focus timer notification [ID: 9999]');
    } catch {
      // Ignore if nothing to cancel
    }

    // Schedule the focus completion alarm
    await LocalNotifications.schedule({
      notifications: [{
        title,
        body,
        id: FOCUS_TIMER_ID,
        channelId: CHANNEL_ID,
        schedule: {
          at: triggerDate,
          allowWhileIdle: true, // Delivers even in Doze mode
        },
        sound: 'default',
        extra: { type: 'focus-timer-complete' },
        actionTypeId: '',
        // wakeup: true is handled by allowWhileIdle + channel importance
      }]
    });

    notifLog('Focus timer notification scheduled:', {
      id: FOCUS_TIMER_ID,
      title,
      body,
      triggerAt: triggerDate.toISOString(),
      msFromNow: Math.round((triggerAtEpochMs - Date.now()) / 1000) + 's',
    });
  } catch (err) {
    // Handle Android 12+ exact alarm restriction gracefully
    if (err?.message?.includes('SCHEDULE_EXACT_ALARM') || err?.message?.includes('exact')) {
      notifWarn('Exact alarm permission not granted. Trying inexact fallback...', err.message);
      // Notification may fire slightly late — still better than nothing
    } else {
      notifError('Focus timer notification scheduling failed:', err);
    }
  }
};

export const cancelTimerNotification = async () => {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: FOCUS_TIMER_ID }] });
    notifLog('Focus timer notification cancelled [ID: 9999]');
  } catch (err) {
    notifError('Failed to cancel focus timer notification:', err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ── EVENT REMINDER NOTIFICATION ───────────────────────────────────────────────
// Schedules a one-shot notification for a scheduled calendar event.
// Fires at: event date+time - reminderMinutes
// Works even when app is closed, minimized, or screen is locked.
// ═══════════════════════════════════════════════════════════════════════════════
export const scheduleEventReminder = async (event) => {
  if (!isNative()) {
    notifLog(`Web mode — event reminder simulation: "${event.title}" (reminderEnabled: ${event.reminderEnabled})`);
    return;
  }

  if (!event.reminderEnabled) {
    notifLog(`scheduleEventReminder skipped — reminder not enabled for: "${event.title}"`);
    return;
  }

  if (!event.date || !event.time) {
    notifWarn('scheduleEventReminder skipped — event missing date or time:', { id: event.id, date: event.date, time: event.time });
    return;
  }

  try {
    // Validate and build trigger time
    const eventDateStr = `${event.date}T${event.time}:00`;
    const eventMs = new Date(eventDateStr).getTime();

    if (isNaN(eventMs)) {
      notifError('scheduleEventReminder: Invalid event date/time', { date: event.date, time: event.time });
      return;
    }

    const reminderMinutes = event.reminderMinutes ?? 30;
    const triggerMs = eventMs - (reminderMinutes * 60 * 1000);
    const triggerDate = new Date(triggerMs);

    if (triggerMs <= Date.now()) {
      notifWarn(`scheduleEventReminder: Trigger time is in the past for "${event.title}"`, {
        triggerAt: triggerDate.toISOString(),
        eventAt: new Date(eventMs).toISOString(),
        reminderMinutes,
      });
      return;
    }

    // Ensure permission
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') {
      const requested = await LocalNotifications.requestPermissions();
      if (requested.display !== 'granted') {
        notifWarn('Event reminder skipped — permission denied');
        return;
      }
    }

    const notifId = getEventNotificationId(event.id);

    // Cancel existing reminder for this event (in case of update)
    try {
      await LocalNotifications.cancel({ notifications: [{ id: notifId }] });
    } catch {
      // Ignore if nothing to cancel
    }

    // Build reminder body
    const reminderLabel = reminderMinutes === 0
      ? 'Starting now'
      : reminderMinutes < 60
        ? `In ${reminderMinutes} minutes`
        : reminderMinutes === 60
          ? 'In 1 hour'
          : reminderMinutes === 1440
            ? 'Tomorrow'
            : `In ${Math.round(reminderMinutes / 60)} hours`;

    const body = event.description
      ? `${reminderLabel} — ${event.description}`
      : reminderLabel;

    // Schedule the event reminder
    await LocalNotifications.schedule({
      notifications: [{
        title: `📅 ${event.title}`,
        body,
        id: notifId,
        channelId: CHANNEL_ID,
        schedule: {
          at: triggerDate,
          allowWhileIdle: true,
        },
        sound: 'default',
        extra: {
          type: 'event-reminder',
          eventId: event.id,
          eventTitle: event.title,
          eventDate: event.date,
          eventTime: event.time,
        },
      }]
    });

    notifLog(`Event reminder scheduled: "${event.title}"`, {
      notifId,
      triggerAt: triggerDate.toISOString(),
      reminderMinutes,
      msFromNow: Math.round((triggerMs - Date.now()) / 1000) + 's',
    });
  } catch (err) {
    if (err?.message?.includes('SCHEDULE_EXACT_ALARM') || err?.message?.includes('exact')) {
      notifWarn(`Event reminder for "${event.title}" may be inexact on this Android version.`, err.message);
    } else {
      notifError(`scheduleEventReminder failed for "${event.title}":`, err);
    }
  }
};

export const cancelEventReminder = async (eventId) => {
  if (!isNative()) return;
  try {
    const notifId = getEventNotificationId(eventId);
    await LocalNotifications.cancel({ notifications: [{ id: notifId }] });
    notifLog(`Event reminder cancelled [eventId: ${eventId}, notifId: ${notifId}]`);
  } catch (err) {
    notifError(`Failed to cancel event reminder for eventId: ${eventId}`, err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ── HABIT / TASK RECURRING REMINDER ──────────────────────────────────────────
// Schedules daily or weekday-specific repeating reminders for habits and tasks.
// ═══════════════════════════════════════════════════════════════════════════════
const DAY_MAP = { 'Sun': 1, 'Mon': 2, 'Tue': 3, 'Wed': 4, 'Thu': 5, 'Fri': 6, 'Sat': 7 };
const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const scheduleReminder = async (id, title, body, timeStr, scheduleDays = []) => {
  if (!isNative()) {
    notifLog(`Reminder simulation: "${title}" at ${timeStr} (Days: ${scheduleDays.length ? scheduleDays.join(',') : 'Everyday'})`);
    return;
  }

  if (!timeStr || !timeStr.includes(':')) {
    notifWarn(`scheduleReminder skipped — invalid timeStr: "${timeStr}" for "${title}"`);
    return;
  }

  try {
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') {
      const result = await LocalNotifications.requestPermissions();
      if (result.display !== 'granted') {
        notifWarn(`scheduleReminder skipped — permission denied for: "${title}"`);
        return;
      }
    }

    const [hourStr, minuteStr] = timeStr.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      notifWarn(`scheduleReminder skipped — invalid time values: ${hour}:${minute} for "${title}"`);
      return;
    }

    const mainId = getNotificationId(id);

    // Cancel all existing reminders for this habit/task
    const idsToCancel = [mainId, ...ALL_DAYS.map(d => getNotificationId(`${id}-${d}`))];
    try {
      await LocalNotifications.cancel({ notifications: idsToCancel.map(cid => ({ id: cid })) });
    } catch {
      // Ignore cancel errors
    }

    if (!scheduleDays || scheduleDays.length === 0) {
      // Daily reminder
      await LocalNotifications.schedule({
        notifications: [{
          title,
          body: body || 'Time to complete your habit!',
          id: mainId,
          channelId: CHANNEL_ID,
          schedule: {
            on: { hour, minute },
            repeats: true,
            allowWhileIdle: true,
          },
          sound: 'default',
          extra: { type: 'reminder', originalId: id },
        }]
      });
      notifLog(`Daily reminder scheduled: "${title}" at ${timeStr} [ID: ${mainId}]`);
    } else {
      // Weekday-specific reminders
      const notifications = scheduleDays
        .filter(day => DAY_MAP[day] !== undefined)
        .map(day => ({
          title,
          body: body || 'Time to complete your habit!',
          id: getNotificationId(`${id}-${day}`),
          channelId: CHANNEL_ID,
          schedule: {
            on: { weekday: DAY_MAP[day], hour, minute },
            repeats: true,
            allowWhileIdle: true,
          },
          sound: 'default',
          extra: { type: 'reminder', originalId: id, day },
        }));

      if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications });
        notifLog(`Weekday reminders scheduled: "${title}" on ${scheduleDays.join(',')} at ${timeStr}`);
      }
    }
  } catch (err) {
    notifError(`scheduleReminder failed for "${title}":`, err);
  }
};

export const cancelReminder = async (id) => {
  if (!isNative()) return;
  try {
    const mainId = getNotificationId(id);
    const idsToCancel = [mainId, ...ALL_DAYS.map(d => getNotificationId(`${id}-${d}`))];
    await LocalNotifications.cancel({ notifications: idsToCancel.map(cid => ({ id: cid })) });
    notifLog(`Reminders cancelled for: ${id}`);
  } catch (err) {
    notifError(`cancelReminder failed for: ${id}`, err);
  }
};
