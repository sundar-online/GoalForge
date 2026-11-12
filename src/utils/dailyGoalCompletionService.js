import { TODAY, parseLocalDate } from './dateUtils';
import { isGoalActive } from './calculationUtils';
import { isGoalExpired } from './goalEvaluation';

const DAY_ABBRS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const TARGET_INSTAGRAM_PACKAGE = 'com.instagram.android';
export const SAFE_EMPTY_STATE_POLICY = 'LOCKED_WHEN_NO_TASKS';

export const DEFAULT_DISCIPLINE_LOCK_SETTINGS = {
  enabled: false,
  targetApp: TARGET_INSTAGRAM_PACKAGE,
  lastSyncedAt: null,
  lastEvaluatedDate: null,
  isLocked: false,
  totalRequiredTasks: 0,
  completedRequiredTasks: 0,
};

/**
 * Matches AppContext's canonical goal ordering: ascending `order`,
 * tie-broken by descending `createdAt`.
 */
export function sortGoalsCanonically(goals) {
  return [...(goals || [])].sort((a, b) => {
    const orderA = a?.order ?? 1;
    const orderB = b?.order ?? 1;
    if (orderA !== orderB) return orderA - orderB;
    return String(b?.createdAt || '').localeCompare(String(a?.createdAt || ''));
  });
}

/**
 * Selects up to the first THREE active, non-expired, non-archived, non-missing-dream
 * goals in canonical GoalForge order. Never fabricates goals if fewer than 3 exist.
 */
export function getFirstThreeActiveGoals(goals, dateStr = TODAY()) {
  const ordered = sortGoalsCanonically(goals);
  return ordered
    .filter((goal) => {
      if (!isGoalActive(goal)) return false;
      if (goal.status === 'archived') return false;
      if (isGoalExpired(goal, dateStr)) return false;
      return true;
    })
    .slice(0, 3);
}

/**
 * Returns true if a goal habit/task is required on `dateStr` (YYYY-MM-DD local calendar day).
 */
export function isHabitScheduledForDate(habit, dateStr = TODAY()) {
  if (!habit) return false;
  const schedule = habit.scheduleDays;
  if (!Array.isArray(schedule) || schedule.length === 0) return true;
  const localDate = parseLocalDate(dateStr);
  if (isNaN(localDate.getTime())) return true;
  const dayAbbr = DAY_ABBRS[localDate.getDay()];
  return schedule.includes(dayAbbr);
}

/**
 * Determines whether a goal's habit/task is completed on `dateStr` without double counting
 * and immediately reflecting reopened tasks (where `completed` / `currentCount` / `timeSpent`
 * drops below target or `completedDates` no longer includes `dateStr`).
 */
export function isHabitCompletedForDate(habit, dateStr = TODAY()) {
  if (!habit || !dateStr) return false;

  const isDoneByFields = () => {
    if (habit.type === 'count') {
      return (habit.currentCount ?? 0) >= (habit.targetCount ?? 10);
    }
    if (habit.type === 'time') {
      return (habit.timeSpent ?? 0) >= (habit.targetTime ?? 15);
    }
    return !!habit.completed;
  };

  // If the habit has state for this calendar day, trust the live completion fields
  // (reopening a task updates these immediately).
  if (habit.lastActiveDate === dateStr || habit.lastCompletedDate === dateStr) {
    if (habit.lastCompletedDate === dateStr) {
      return isDoneByFields();
    }
    return false;
  }

  return Array.isArray(habit.completedDates) && habit.completedDates.includes(dateStr);
}

/**
 * Evaluates daily required task progress across the first three active goals for `dateStr`.
 */
export function evaluateDailyGoalProgress(goals, dateStr = TODAY()) {
  const selectedGoals = getFirstThreeActiveGoals(goals, dateStr);

  let totalRequiredTasks = 0;
  let completedRequiredTasks = 0;
  let hasAnyConfiguredHabits = false;

  const evaluatedGoals = selectedGoals.map((goal) => {
    const rawHabits = Array.isArray(goal.habits) ? goal.habits : [];
    const seenHabitIds = new Set();
    const uniqueHabits = [];

    for (const h of rawHabits) {
      if (!h || !h.id) continue;
      if (seenHabitIds.has(h.id)) continue;
      seenHabitIds.add(h.id);
      uniqueHabits.push(h);
    }

    if (uniqueHabits.length > 0) {
      hasAnyConfiguredHabits = true;
    }

    const scheduledHabits = uniqueHabits.filter((h) => isHabitScheduledForDate(h, dateStr));
    const goalTotal = scheduledHabits.length;
    let goalCompleted = 0;

    const tasks = scheduledHabits.map((h) => {
      const done = isHabitCompletedForDate(h, dateStr);
      if (done) goalCompleted += 1;
      return {
        id: h.id,
        title: h.title || 'Untitled Task',
        type: h.type || 'check',
        completed: done,
      };
    });

    totalRequiredTasks += goalTotal;
    completedRequiredTasks += goalCompleted;

    const completionPercentage = goalTotal > 0 ? Math.round((goalCompleted / goalTotal) * 100) : 0;
    const isCompleted = goalTotal > 0 && goalCompleted === goalTotal;

    return {
      id: goal.id,
      title: goal.title || 'Untitled Goal',
      tag: goal.tag || 'General',
      order: goal.order ?? 1,
      totalTasks: goalTotal,
      completedTasks: goalCompleted,
      remainingTasks: Math.max(0, goalTotal - goalCompleted),
      completionPercentage,
      isCompleted,
      hasConfiguredTasks: uniqueHabits.length > 0,
      isRestDay: uniqueHabits.length > 0 && goalTotal === 0,
      tasks,
    };
  });

  const remainingRequiredTasks = Math.max(0, totalRequiredTasks - completedRequiredTasks);
  const overallPercentage =
    totalRequiredTasks > 0
      ? Math.round((completedRequiredTasks / totalRequiredTasks) * 100)
      : 0;

  let emptyStateReason = null;
  if (selectedGoals.length === 0) {
    emptyStateReason = 'no_active_goals';
  } else if (totalRequiredTasks === 0) {
    emptyStateReason = hasAnyConfiguredHabits ? 'no_tasks_today' : 'no_tasks_configured';
  }

  // Safe Empty-State Policy: never auto-unlock if there are 0 required tasks today.
  const allCompleted =
    totalRequiredTasks > 0 && completedRequiredTasks === totalRequiredTasks;

  return {
    date: dateStr,
    goals: evaluatedGoals,
    totalRequiredTasks,
    completedRequiredTasks,
    remainingRequiredTasks,
    overallPercentage,
    allCompleted,
    emptyStateReason,
    policy: SAFE_EMPTY_STATE_POLICY,
  };
}

/**
 * Combines user's Discipline Lock toggle state with today's goal completion evaluation.
 */
export function computeDisciplineLockDecision(enabled, progressSummary) {
  const isEnabled = !!enabled;
  if (!isEnabled) {
    return {
      enabled: false,
      shouldLockInstagram: false,
      statusLabel: 'Disabled',
      reason: 'disabled',
    };
  }

  if (progressSummary?.allCompleted) {
    return {
      enabled: true,
      shouldLockInstagram: false,
      statusLabel: 'Instagram Unlocked',
      reason: 'all_goals_completed',
    };
  }

  return {
    enabled: true,
    shouldLockInstagram: true,
    statusLabel: 'Instagram Locked',
    reason: progressSummary?.emptyStateReason || 'incomplete_goals',
  };
}

export function getGoalProgressColor(percentage) {
  if (percentage >= 100) return '#22c55e'; // Emerald
  if (percentage >= 50) return '#4d7cff';  // GoalForge Blue
  if (percentage > 0) return '#f59e0b';   // Amber
  return '#ef4444';                        // Rose / Red
}

