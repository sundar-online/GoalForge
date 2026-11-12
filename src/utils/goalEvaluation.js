import { TODAY, addDays, parseLocalDate } from './dateUtils';
import { normalizeDateStr, isGoalFinalized, isGoalActive } from './calculationUtils';

export { isGoalFinalized, isGoalActive };

const DAY_ABBRS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_EVALUATION_DAYS = 20000;

export const DEFAULT_PROFILE_STATS = {
  totalGoals: 0,
  passedGoals: 0,
  failedGoals: 0,
  averageGoalCompletion: 0,
  totalTasksCompleted: 0,
  totalTasksFailed: 0,
  evaluatedGoals: {},
};

/**
 * Normalizes a calendar date (such as startDate or deadline) to local YYYY-MM-DD
 * without shifting midnight UTC strings backward across timezones.
 */
export function toDateOnlyStr(val, fallback = null) {
  if (!val) return fallback;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (DATE_REGEX.test(trimmed)) return trimmed;
    if (/^\d{4}-\d{2}-\d{2}T00:00:00(?:\.000)?Z?$/i.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
  }
  const normalized = normalizeDateStr(val, fallback);
  if (normalized && DATE_REGEX.test(normalized)) return normalized;
  return fallback;
}

/**
 * Returns true if a goal is still in active status and its target deadline has strictly passed
 * using date-only (YYYY-MM-DD) local comparisons.
 */
export function isGoalExpired(goal, todayStr = TODAY()) {
  if (!goal || goal.deleted || goal.isDeleted) return false;
  const status = goal.status || 'active';
  if (status !== 'active') return false;

  const deadlineStr = toDateOnlyStr(goal.deadline, null);
  if (!deadlineStr || !DATE_REGEX.test(deadlineStr)) return false;

  return todayStr > deadlineStr;
}

/**
 * Builds a deduplicated Set of YYYY-MM-DD completion dates for a habit.
 * Ensures the same date is never counted twice even if stored arrays contain duplicates.
 */
function getHabitCompletedDateSet(habit) {
  const completedSet = new Set();
  const rawDates = Array.isArray(habit?.completedDates) ? habit.completedDates : [];

  for (const raw of rawDates) {
    const dateStr = toDateOnlyStr(raw, null);
    if (dateStr && DATE_REGEX.test(dateStr)) {
      completedSet.add(dateStr);
    }
  }

  if (habit?.lastCompletedDate) {
    const lastStr = toDateOnlyStr(habit.lastCompletedDate, null);
    if (lastStr && DATE_REGEX.test(lastStr)) {
      completedSet.add(lastStr);
    }
  }

  return completedSet;
}

/**
 * Resolves inclusive [startStr, endStr] date-only bounds for evaluating a goal.
 */
export function getGoalPlannedDateBounds(goal, fallbackTodayStr = TODAY()) {
  const endStr = toDateOnlyStr(goal?.deadline, null) || fallbackTodayStr;

  const habitDates = (goal?.habits || [])
    .flatMap(h => [...getHabitCompletedDateSet(h)]);
  const goalDates = (goal?.completedDates || [])
    .map(d => toDateOnlyStr(d, null))
    .filter(Boolean);
  const allKnownDates = [...habitDates, ...goalDates].sort();
  const earliestKnownDate = allKnownDates.length > 0 ? allKnownDates[0] : null;

  let startStr =
    toDateOnlyStr(goal?.startDate, null) ||
    toDateOnlyStr(goal?.createdAt || goal?.created_at, null) ||
    earliestKnownDate ||
    endStr;

  if (earliestKnownDate && earliestKnownDate < startStr) {
    startStr = earliestKnownDate;
  }

  return { startStr, endStr };
}

/**
 * Evaluates a goal's completion statistics across all planned task occurrences
 * between its start date and deadline.
 *
 * Rules:
 * - Planned tasks are counted from scheduled habit occurrences respecting goal.mode ('ALL' | 'ANY' | 'CUSTOM').
 * - Duplicate completion dates and duplicate habit IDs are never double-counted.
 * - Goals with 0 planned tasks safely evaluate to 0% -> FAILED (no division by zero).
 * - Threshold: 75% - 100% => PASSED ('completed'), 0% - 74.99% => FAILED ('failed').
 */
export function evaluateGoalPerformance(goal, todayStr = TODAY()) {
  if (!goal) {
    return {
      goalId: '',
      goalTitle: '',
      completedTasks: 0,
      totalPlannedTasks: 0,
      failedTasks: 0,
      completionPercentage: 0,
      finalResult: 'FAILED',
      newStatus: 'failed',
    };
  }

  const { startStr, endStr } = getGoalPlannedDateBounds(goal, todayStr);

  // Deduplicate habits by ID so the same habit cannot be counted twice
  const uniqueHabits = [];
  const seenHabitIds = new Set();
  for (const h of goal.habits || []) {
    if (!h) continue;
    const key = h.id !== undefined && h.id !== null ? String(h.id) : null;
    if (key && seenHabitIds.has(key)) continue;
    if (key) seenHabitIds.add(key);

    const completedSet = getHabitCompletedDateSet(h);
    const sortedCompleted = [...completedSet].sort();
    const earliestHabitCompletion = sortedCompleted.length > 0 ? sortedCompleted[0] : null;
    const rawCreated = toDateOnlyStr(h.createdAt || h.created_at, null);

    let effectiveStart = startStr;
    if (rawCreated && rawCreated > effectiveStart) {
      effectiveStart = rawCreated;
    }
    if (earliestHabitCompletion && earliestHabitCompletion < effectiveStart && earliestHabitCompletion >= startStr) {
      effectiveStart = earliestHabitCompletion;
    }

    uniqueHabits.push({
      habit: h,
      completedSet,
      effectiveStart,
      scheduleDays: Array.isArray(h.scheduleDays) ? h.scheduleDays : [],
    });
  }

  let totalPlannedTasks = 0;
  let completedTasks = 0;

  if (uniqueHabits.length > 0 && startStr <= endStr) {
    const mode = goal.mode || 'ALL';
    const minHabits = Math.max(1, Number(goal.minHabits) || 1);

    let currentStr = startStr;
    let guard = 0;

    while (currentStr <= endStr && guard < MAX_EVALUATION_DAYS) {
      const dateObj = parseLocalDate(currentStr);
      const dayAbbr = DAY_ABBRS[dateObj.getDay()];

      let scheduledCount = 0;
      let doneCount = 0;

      for (const entry of uniqueHabits) {
        if (currentStr < entry.effectiveStart) continue;
        const isScheduled = entry.scheduleDays.length === 0 || entry.scheduleDays.includes(dayAbbr);
        if (!isScheduled) continue;

        scheduledCount++;
        if (entry.completedSet.has(currentStr)) {
          doneCount++;
        }
      }

      if (scheduledCount > 0) {
        if (mode === 'ANY') {
          totalPlannedTasks += 1;
          completedTasks += doneCount > 0 ? 1 : 0;
        } else if (mode === 'CUSTOM') {
          const required = Math.min(minHabits, scheduledCount);
          totalPlannedTasks += required;
          completedTasks += Math.min(doneCount, required);
        } else {
          // 'ALL'
          totalPlannedTasks += scheduledCount;
          completedTasks += doneCount;
        }
      }

      currentStr = addDays(currentStr, 1);
      guard++;
    }
  }

  const failedTasks = Math.max(0, totalPlannedTasks - completedTasks);
  const rawPercentage = totalPlannedTasks > 0 ? (completedTasks / totalPlannedTasks) * 100 : 0;
  const isPassed = rawPercentage >= 75;
  const finalResult = isPassed ? 'PASSED' : 'FAILED';
  const newStatus = isPassed ? 'completed' : 'failed';

  const rounded = Math.round(rawPercentage * 100) / 100;
  const completionPercentage = !isPassed && rounded >= 75
    ? 74.99
    : Math.min(100, Math.max(0, rounded));

  return {
    goalId: String(goal.id ?? ''),
    goalTitle: goal.title || '',
    completedTasks,
    totalPlannedTasks,
    failedTasks,
    completionPercentage,
    finalResult,
    newStatus,
  };
}

/**
 * Returns the persisted evaluation snapshot if the goal is already finalized,
 * otherwise computes a fresh evaluation.
 */
export function getGoalFinalEvaluation(goal, todayStr = TODAY()) {
  if (
    isGoalFinalized(goal) &&
    goal.finalCompletionPercentage !== null &&
    goal.finalCompletionPercentage !== undefined &&
    goal.completedTasksCount !== null &&
    goal.completedTasksCount !== undefined &&
    goal.totalPlannedTasksCount !== null &&
    goal.totalPlannedTasksCount !== undefined
  ) {
    const totalPlannedTasks = Number(goal.totalPlannedTasksCount) || 0;
    const completedTasks = Number(goal.completedTasksCount) || 0;
    const failedTasks =
      goal.failedTasksCount !== null && goal.failedTasksCount !== undefined
        ? Number(goal.failedTasksCount)
        : Math.max(0, totalPlannedTasks - completedTasks);
    const completionPercentage = Number(goal.finalCompletionPercentage) || 0;
    const finalResult = goal.finalResult || (goal.status === 'completed' || completionPercentage >= 75 ? 'PASSED' : 'FAILED');

    return {
      goalId: String(goal.id ?? ''),
      goalTitle: goal.title || '',
      completedTasks,
      totalPlannedTasks,
      failedTasks,
      completionPercentage,
      finalResult,
      newStatus: finalResult === 'PASSED' ? 'completed' : 'failed',
      finalizedAt: goal.finalizedAt || null,
      evaluatedDate: goal.evaluatedDate || null,
    };
  }

  return evaluateGoalPerformance(goal, todayStr);
}

/**
 * Idempotently reconciles profile statistics from the persisted evaluatedGoals map
 * and the current goals list. Guarantees:
 * - A finalized goal is never evaluated or counted twice.
 * - Active and extended goals do NOT contribute to Passed/Failed/Average Goal Completion.
 * - Zero finalized goals safely produces 0% Average Goal Completion.
 */
export function reconcileProfileStats(currentStats = DEFAULT_PROFILE_STATS, goals = []) {
  const existingMap = currentStats?.evaluatedGoals && typeof currentStats.evaluatedGoals === 'object'
    ? currentStats.evaluatedGoals
    : {};

  const evaluatedGoals = {};
  for (const [id, entry] of Object.entries(existingMap)) {
    if (!entry) continue;
    evaluatedGoals[String(id)] = {
      goalId: String(entry.goalId ?? entry.goal_id ?? id),
      goalTitle: entry.goalTitle ?? entry.goal_title ?? '',
      completedTasks: Number(entry.completedTasks ?? entry.completed_tasks ?? 0),
      totalPlannedTasks: Number(entry.totalPlannedTasks ?? entry.total_planned_tasks ?? 0),
      failedTasks: Number(entry.failedTasks ?? entry.failed_tasks ?? 0),
      completionPercentage: Number(entry.completionPercentage ?? entry.completion_percentage ?? 0),
      finalResult: entry.finalResult ?? entry.final_result ?? 'FAILED',
      finalizedAt: entry.finalizedAt ?? entry.finalized_at ?? null,
      evaluatedDate: entry.evaluatedDate ?? entry.evaluated_date ?? null,
    };
  }

  let nonFinalizedGoalsCount = 0;

  for (const goal of goals || []) {
    if (!goal || goal.deleted || goal.isDeleted) continue;

    if (isGoalFinalized(goal)) {
      const gId = String(goal.id);
      if (!evaluatedGoals[gId]) {
        const evalData = getGoalFinalEvaluation(goal);
        evaluatedGoals[gId] = {
          goalId: gId,
          goalTitle: evalData.goalTitle,
          completedTasks: evalData.completedTasks,
          totalPlannedTasks: evalData.totalPlannedTasks,
          failedTasks: evalData.failedTasks,
          completionPercentage: evalData.completionPercentage,
          finalResult: evalData.finalResult,
          finalizedAt: goal.finalizedAt || new Date().toISOString(),
          evaluatedDate: goal.evaluatedDate || TODAY(),
        };
      }
    } else {
      nonFinalizedGoalsCount++;
    }
  }

  const finalizedEntries = Object.values(evaluatedGoals);
  const passedGoals = finalizedEntries.filter(e => e.finalResult === 'PASSED').length;
  const failedGoals = finalizedEntries.filter(e => e.finalResult === 'FAILED').length;
  const finalizedCount = passedGoals + failedGoals;

  const completionSum = finalizedEntries.reduce((sum, e) => sum + (Number(e.completionPercentage) || 0), 0);
  const averageGoalCompletion = finalizedCount > 0
    ? Math.round((completionSum / finalizedCount) * 100) / 100
    : 0;

  const totalTasksCompleted = finalizedEntries.reduce((sum, e) => sum + (Number(e.completedTasks) || 0), 0);
  const totalTasksFailed = finalizedEntries.reduce((sum, e) => sum + (Number(e.failedTasks) || 0), 0);
  const totalGoals = nonFinalizedGoalsCount + finalizedCount;

  return {
    totalGoals,
    passedGoals,
    failedGoals,
    averageGoalCompletion,
    totalTasksCompleted,
    totalTasksFailed,
    evaluatedGoals,
  };
}
