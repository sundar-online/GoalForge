/**
 * resetManager.js
 *
 * Pure computation layer for the GoalForge daily reset sequence.
 * Determines whether a reset is needed and computes the exact state payloads
 * to apply — without touching React state or Firestore directly.
 *
 * AppContext calls these functions and applies the results via setTasks /
 * setGoals / setSettings / db.upsert*.
 *
 * All functions are pure — no React imports, no side effects.
 */

import { addDays, parseLocalDate } from './dateUtils';
import {
  calculateStreakFromHistory,
  calculateConsecutiveMissedDays,
  calculateGoalStreak,
  calculateGoalConsecutiveMissedDays,
  recalculateGoalCompletedDates,
  getGoalScheduledDays,
  calculateOverallProgress,
  calculateTaskStreak,
  sanitizeAndValidateCompletedDates,
} from './calculationUtils';
import { getRecId, getOrBuildRecDates, buildRecurringPayload } from './recurringTaskEngine';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Should-reset gate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determines which reset sub-steps need to run for today.
 *
 * @param {object} currentSettings - Latest settings ref value.
 * @param {object[]} currentTasks - Latest tasks ref value.
 * @param {object[]} currentGoals - Latest goals ref value.
 * @param {string} todayStr - YYYY-MM-DD for today.
 * @returns {{ hasSettingsNeed: boolean, hasTaskNeed: boolean, hasHabitNeed: boolean, needsReset: boolean }}
 */
export function shouldRunReset(currentSettings, currentTasks, currentGoals, todayStr) {
  // Idempotency: skip if we've already processed this calendar day
  if (currentSettings.dailyResetProcessed === todayStr) {
    return { hasSettingsNeed: false, hasTaskNeed: false, hasHabitNeed: false, needsReset: false };
  }

  const hasSettingsNeed = currentSettings.lastActiveDate !== todayStr;

  const hasTaskNeed = (currentTasks || []).some(t =>
    (t.schedule_type || t.type) === 'daily' && t.lastActiveDate !== todayStr
  );

  const hasHabitNeed = (currentGoals || []).some(goal =>
    (goal.habits || []).some(h => h.lastActiveDate !== todayStr)
  );

  return {
    hasSettingsNeed,
    hasTaskNeed,
    hasHabitNeed,
    needsReset: hasSettingsNeed || hasTaskNeed || hasHabitNeed,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Habit reset payload
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the reset payload for a single habit.
 * Returns null if the habit doesn't need resetting for today.
 *
 * @param {object} habit - The habit object.
 * @param {object} goal - The parent goal (needed for goal.completedDates).
 * @param {string} todayStr - YYYY-MM-DD for today.
 * @param {string} fallbackLastActive - Fallback date when habit.lastActiveDate is unset.
 * @returns {{ finalHabit: object } | null}
 */
export function computeHabitResetPayload(habit, goal, todayStr, fallbackLastActive) {
  const hLastActive = habit.lastActiveDate || fallbackLastActive;
  if (hLastActive === todayStr) return null; // already reset today

  const wasDone =
    habit.completed ||
    (habit.type === 'time' && (habit.timeSpent ?? 0) >= (habit.targetTime ?? 15)) ||
    (habit.type === 'count' && (habit.currentCount ?? 0) >= (habit.targetCount ?? 10));

  // Was the last-active day a scheduled day for this habit?
  const lastActiveDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseLocalDate(hLastActive).getDay()];
  const wasScheduled =
    !habit.scheduleDays || habit.scheduleDays.length === 0 || habit.scheduleDays.includes(lastActiveDay);

  let updatedDates = habit.completedDates ? [...habit.completedDates] : [];
  if (wasDone && wasScheduled && !updatedDates.includes(hLastActive)) {
    updatedDates.push(hLastActive);
  }

  const newMissed = calculateConsecutiveMissedDays(updatedDates, habit.scheduleDays, habit.createdAt);
  // Bug 1 fix: pass habit.createdAt as 3rd arg (was incorrectly passed as 4th, silently ignored)
  const newStreak = calculateStreakFromHistory(
    updatedDates,
    habit.scheduleDays,
    habit.createdAt
  );

  const finalHabit = {
    ...habit,
    completedDates: updatedDates,
    timeSpent: 0,
    completed: false,
    currentCount: 0,
    streak: newStreak,
    missedDays: newMissed,
    lastActiveDate: todayStr,
    lastActionTimestamp: new Date().toISOString(),
  };

  // Restore original target if habit was in recovery mode
  if (habit.isRecovering && habit.originalTarget !== undefined) {
    const targetKey = habit.type === 'count' ? 'targetCount' : 'targetTime';
    finalHabit[targetKey] = habit.originalTarget;
    finalHabit.isRecovering = false;
    delete finalHabit.originalTarget;
  }

  return { finalHabit };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Goal reset payload
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the reset payload for a goal after its habits have been reset.
 *
 * @param {object} goal - The original goal object.
 * @param {object[]} updatedHabits - The already-reset habit array.
 * @param {string} todayStr - YYYY-MM-DD for today.
 * @returns {{ finalGoal: object }}
 */
export function computeGoalResetPayload(goal, updatedHabits, todayStr) {
  const updatedGoalWithoutDates = { ...goal, habits: updatedHabits };
  const updatedGoalDates = recalculateGoalCompletedDates(updatedGoalWithoutDates);
  const goalSchedule = getGoalScheduledDays(updatedGoalWithoutDates);
  const newGoalStreak = calculateGoalStreak(updatedGoalDates, goalSchedule);
  const newGoalMissed = calculateGoalConsecutiveMissedDays(
    updatedGoalDates,
    goalSchedule,
    goal.startDate || goal.createdAt
  );

  const finalGoal = {
    ...goal,
    habits: updatedHabits,
    completedDates: updatedGoalDates,
    missedDays: newGoalMissed,
    streak: newGoalStreak,
    lastActiveDate: todayStr,
    lastActionTimestamp: new Date().toISOString(),
  };
  finalGoal.progress = calculateOverallProgress(finalGoal);

  return { finalGoal };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Task reset payload
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the reset payload for a single daily task.
 * Returns null if the task doesn't need resetting for today.
 *
 * @param {object} task - The task object.
 * @param {string} todayStr - YYYY-MM-DD for today.
 * @param {string} fallbackLastActive - Fallback when task.lastActiveDate is unset.
 * @param {object} currentRecurringHistory - Latest recurringHistory ref value.
 * @returns {{ finalTask: object, recId: string, recPayload: object } | null}
 */
export function computeTaskResetPayload(task, todayStr, fallbackLastActive, currentRecurringHistory) {
  if ((task.schedule_type || task.type) !== 'daily') return null;

  const tLastActive = task.lastActiveDate || fallbackLastActive;
  if (tLastActive === todayStr) return null; // already reset today

  const isCompleted =
    task.completed ||
    (task.completionType === 'count' && (task.currentCount || 0) >= (task.targetCount || 10)) ||
    (task.completionType === 'time' && (task.timeSpent ?? 0) >= (task.targetTime ?? 30));

  const recId = getRecId(task);
  let recDates = getOrBuildRecDates(task, currentRecurringHistory);

  if (isCompleted && !recDates.includes(tLastActive)) {
    recDates.push(tLastActive);
  }

  const { sanitizedDates } = sanitizeAndValidateCompletedDates(
    recDates,
    task.createdAt,
    task.id,
    task.title,
    task.currentStreak ?? task.current_streak ?? 0
  );

  const newMissed = calculateConsecutiveMissedDays(sanitizedDates, []);
  const { current: newStreak, best: newBestStreak } = calculateTaskStreak(sanitizedDates);

  const recPayload = buildRecurringPayload(task, sanitizedDates, newStreak);

  const finalTask = {
    ...task,
    completedDates: sanitizedDates,
    timeSpent: 0,
    currentCount: 0,
    completed: false,
    currentStreak: newStreak,
    bestStreak: newBestStreak,
    missedDays: newMissed,
    lastActiveDate: todayStr,
    lastActionTimestamp: new Date().toISOString(),
  };

  // Restore original target if task was in recovery mode
  if (task.isRecovering && task.originalTarget !== undefined) {
    const targetKey = task.completionType === 'count' ? 'targetCount' : 'targetTime';
    finalTask[targetKey] = task.originalTarget;
    finalTask.isRecovering = false;
    delete finalTask.originalTarget;
  }

  return { finalTask, recId, recPayload };
}
