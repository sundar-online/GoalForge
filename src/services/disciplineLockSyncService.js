import * as db from '../lib/firebaseDb';
import {
  DEFAULT_DISCIPLINE_LOCK_SETTINGS,
  TARGET_INSTAGRAM_PACKAGE,
  computeDisciplineLockDecision,
  evaluateDailyGoalProgress,
} from '../utils/dailyGoalCompletionService';
import {
  disableDisciplineBlocking,
  enableDisciplineBlocking,
  syncDisciplineGoalCompletion,
} from './disciplineLockService';

const LOCAL_STORAGE_KEY_PREFIX = 'gf_discipline_lock_';

export function getLocalDisciplineLockKey(userId) {
  return `${LOCAL_STORAGE_KEY_PREFIX}${userId || 'guest'}`;
}

export function readLocalDisciplineLockState(userId) {
  try {
    const raw = localStorage.getItem(getLocalDisciplineLockKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_DISCIPLINE_LOCK_SETTINGS, ...parsed };
  } catch {
    return null;
  }
}

export function writeLocalDisciplineLockState(userId, state) {
  try {
    localStorage.setItem(getLocalDisciplineLockKey(userId), JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

/**
 * Normalizes a snapshot to send both to Native Android SharedPreferences and local cache.
 */
export function buildNativeSyncPayload(enabled, progressSummary, syncedAt = new Date().toISOString()) {
  const decision = computeDisciplineLockDecision(enabled, progressSummary);
  return {
    enabled: !!enabled,
    isLocked: !!decision.shouldLockInstagram,
    statusLabel: decision.statusLabel,
    reason: decision.reason,
    targetPackage: TARGET_INSTAGRAM_PACKAGE,
    date: progressSummary.date,
    totalRequiredTasks: progressSummary.totalRequiredTasks,
    completedRequiredTasks: progressSummary.completedRequiredTasks,
    remainingRequiredTasks: progressSummary.remainingRequiredTasks,
    overallPercentage: progressSummary.overallPercentage,
    allCompleted: !!progressSummary.allCompleted,
    emptyStateReason: progressSummary.emptyStateReason || null,
    goals: progressSummary.goals.map((g) => ({
      id: String(g.id),
      title: g.title,
      tag: g.tag,
      completionPercentage: g.completionPercentage,
      completedTasks: g.completedTasks,
      totalTasks: g.totalTasks,
      remainingTasks: g.remainingTasks,
      isCompleted: !!g.isCompleted,
      isRestDay: !!g.isRestDay,
    })),
    lastEvaluatedDate: progressSummary.date,
    lastSyncedAt: syncedAt,
  };
}

/**
 * Compact persisted representation stored inside `users/{userId}/settings/preferences.discipline_lock`.
 * Avoids bloated Firestore documents and skips redundant writes via signature comparison.
 */
export function buildFirestoreDisciplineLockSettings(enabled, progressSummary, syncedAt) {
  const decision = computeDisciplineLockDecision(enabled, progressSummary);
  return {
    enabled: !!enabled,
    targetApp: TARGET_INSTAGRAM_PACKAGE,
    lastSyncedAt: syncedAt || null,
    lastEvaluatedDate: progressSummary.date,
    isLocked: !!decision.shouldLockInstagram,
    totalRequiredTasks: progressSummary.totalRequiredTasks,
    completedRequiredTasks: progressSummary.completedRequiredTasks,
  };
}

/**
 * Signature used to avoid unnecessary Firestore writes when state hasn't materially changed.
 */
export function getDisciplineSyncSignature(settingsObj) {
  if (!settingsObj) return '';
  return [
    settingsObj.enabled ? '1' : '0',
    settingsObj.isLocked ? '1' : '0',
    settingsObj.lastEvaluatedDate || '',
    settingsObj.completedRequiredTasks ?? 0,
    settingsObj.totalRequiredTasks ?? 0,
  ].join('|');
}

/**
 * Synchronizes current Discipline Lock status to:
 * 1. Native Android plugin (SharedPreferences + AccessibilityService lock decision)
 * 2. Offline localStorage mirror
 * 3. Firestore `users/{userId}/settings/preferences` (only when signature changes or forced)
 */
export async function syncDisciplineLockState({
  userId,
  settings,
  goals,
  dateStr,
  previousSignature = '',
  forceFirestore = false,
  transitionAction = null, // 'enable' | 'disable' | null
}) {
  const enabled = !!settings?.disciplineLock?.enabled;
  const progressSummary = evaluateDailyGoalProgress(goals, dateStr);
  const nowIso = new Date().toISOString();

  const nativePayload = buildNativeSyncPayload(enabled, progressSummary, nowIso);
  writeLocalDisciplineLockState(userId, nativePayload);

  // Sync to Capacitor Android plugin (or web fallback)
  try {
    if (transitionAction === 'disable' || !enabled) {
      await disableDisciplineBlocking();
    } else if (transitionAction === 'enable') {
      await enableDisciplineBlocking(nativePayload);
    } else {
      await syncDisciplineGoalCompletion(nativePayload);
    }
  } catch (err) {
    console.warn('[DisciplineLockSync] Native sync error:', err);
  }

  const nextDisciplineSettings = buildFirestoreDisciplineLockSettings(enabled, progressSummary, nowIso);
  const nextSignature = getDisciplineSyncSignature(nextDisciplineSettings);

  let syncedToFirestore = false;
  if (userId && (forceFirestore || nextSignature !== previousSignature)) {
    try {
      await db.upsertUserSettings(userId, {
        ...settings,
        disciplineLock: nextDisciplineSettings,
      });
      syncedToFirestore = true;
    } catch (err) {
      console.warn('[DisciplineLockSync] Firestore write queued/failed (local offline state active):', err);
    }
  }

  return {
    nativePayload,
    progressSummary,
    nextDisciplineSettings,
    nextSignature,
    syncedToFirestore,
  };
}

