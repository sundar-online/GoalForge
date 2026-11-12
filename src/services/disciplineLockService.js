import { Capacitor, WebPlugin, registerPlugin } from '@capacitor/core';
import { TODAY } from '../utils/dateUtils';
import {
  DEFAULT_DISCIPLINE_LOCK_SETTINGS,
  TARGET_INSTAGRAM_PACKAGE,
} from '../utils/dailyGoalCompletionService';

const WEB_SNAPSHOT_KEY = 'gf_discipline_lock_web_snapshot';

function readWebSnapshot() {
  try {
    const raw = localStorage.getItem(WEB_SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeWebSnapshot(snapshot) {
  try {
    localStorage.setItem(WEB_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore storage quota errors
  }
}

class DisciplineLockWeb extends WebPlugin {
  async requestPermissions({ type = 'all' } = {}) {
    return {
      isNativeSupported: false,
      requestedType: type,
      accessibilityEnabled: false,
      usageStatsGranted: false,
      overlayGranted: false,
      batteryOptimizationIgnored: false,
      instagramInstalled: false,
      allCriticalGranted: false,
      message: 'System app-blocking permissions are only available in the GoalForge Android APK.',
    };
  }

  async getPermissionStatus() {
    return {
      isNativeSupported: false,
      accessibilityEnabled: false,
      usageStatsGranted: false,
      overlayGranted: false,
      batteryOptimizationIgnored: false,
      instagramInstalled: false,
      allCriticalGranted: false,
    };
  }

  async enableBlocking(payload = {}) {
    const todayStr = TODAY();
    const snapshot = {
      ...DEFAULT_DISCIPLINE_LOCK_SETTINGS,
      ...readWebSnapshot(),
      ...payload,
      enabled: true,
      targetApp: TARGET_INSTAGRAM_PACKAGE,
      lastEvaluatedDate: payload.date || todayStr,
      lastSyncedAt: new Date().toISOString(),
    };
    writeWebSnapshot(snapshot);
    this.notifyListeners('lockStateChanged', snapshot);
    return snapshot;
  }

  async disableBlocking() {
    const snapshot = {
      ...DEFAULT_DISCIPLINE_LOCK_SETTINGS,
      ...readWebSnapshot(),
      enabled: false,
      isLocked: false,
      lastSyncedAt: new Date().toISOString(),
    };
    writeWebSnapshot(snapshot);
    this.notifyListeners('lockStateChanged', snapshot);
    return snapshot;
  }

  async updateLockStatus(payload = {}) {
    const todayStr = TODAY();
    const current = readWebSnapshot() || {};
    const snapshot = {
      ...DEFAULT_DISCIPLINE_LOCK_SETTINGS,
      ...current,
      ...payload,
      lastEvaluatedDate: payload.date || current.lastEvaluatedDate || todayStr,
      lastSyncedAt: new Date().toISOString(),
    };
    writeWebSnapshot(snapshot);
    return snapshot;
  }

  async getLockStatus() {
    const todayStr = TODAY();
    const saved = readWebSnapshot();
    if (!saved) {
      return {
        ...DEFAULT_DISCIPLINE_LOCK_SETTINGS,
        date: todayStr,
        needsRecalculation: false,
        isNativeSupported: false,
      };
    }
    const staleDate = saved.enabled && saved.lastEvaluatedDate && saved.lastEvaluatedDate !== todayStr;
    return {
      ...saved,
      date: todayStr,
      isLocked: staleDate ? true : !!saved.isLocked,
      needsRecalculation: !!staleDate,
      isNativeSupported: false,
    };
  }

  async syncGoalCompletion(payload = {}) {
    return this.updateLockStatus(payload);
  }

  async checkInstagramStatus() {
    const status = await this.getLockStatus();
    return {
      targetPackage: TARGET_INSTAGRAM_PACKAGE,
      installed: false,
      isForeground: false,
      blocked: !!(status.enabled && status.isLocked),
      isNativeSupported: false,
    };
  }

  async openNativeLockScreen() {
    return { opened: false, isNativeSupported: false };
  }
}

const DisciplineLockPlugin = registerPlugin('DisciplineLock', {
  web: async () => new DisciplineLockWeb(),
});

export function isNativeAndroidPlatform() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function requestDisciplinePermissions(type = 'all') {
  return DisciplineLockPlugin.requestPermissions({ type });
}

export async function getDisciplinePermissionStatus() {
  try {
    return await DisciplineLockPlugin.getPermissionStatus();
  } catch (err) {
    console.warn('[DisciplineLock] getPermissionStatus failed:', err);
    return {
      isNativeSupported: isNativeAndroidPlatform(),
      accessibilityEnabled: false,
      usageStatsGranted: false,
      overlayGranted: false,
      batteryOptimizationIgnored: false,
      instagramInstalled: false,
      allCriticalGranted: false,
    };
  }
}

export async function enableDisciplineBlocking(payload) {
  return DisciplineLockPlugin.enableBlocking(payload);
}

export async function disableDisciplineBlocking() {
  return DisciplineLockPlugin.disableBlocking();
}

export async function updateDisciplineLockStatus(payload) {
  return DisciplineLockPlugin.updateLockStatus(payload);
}

export async function getDisciplineLockStatus() {
  return DisciplineLockPlugin.getLockStatus();
}

export async function syncDisciplineGoalCompletion(payload) {
  return DisciplineLockPlugin.syncGoalCompletion(payload);
}

export async function checkInstagramLockStatus() {
  return DisciplineLockPlugin.checkInstagramStatus();
}

export async function openNativeLockScreen() {
  return DisciplineLockPlugin.openNativeLockScreen();
}

export function addDisciplineLockListener(eventName, callback) {
  return DisciplineLockPlugin.addListener(eventName, callback);
}

export default DisciplineLockPlugin;

