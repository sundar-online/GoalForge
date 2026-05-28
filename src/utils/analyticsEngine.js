/**
 * analyticsEngine.js
 *
 * Computes task log summary data for daily/weekly analytics.
 * Extracted from the automatic daily summary sync useEffect in AppContext.
 *
 * All functions are pure — no React state, no side effects.
 */

import { isTaskDone } from './calculationUtils';

/**
 * Filters the full task list to only those active on a given date.
 *
 * @param {object[]} tasks - All tasks from state.
 * @param {string} dateStr - YYYY-MM-DD target date.
 * @returns {object[]} Tasks active on that date.
 */
export function computeTodayTasksForLog(tasks, dateStr) {
  return (tasks || []).filter(t => {
    const type = t.type || 'daily';
    if (type === 'daily') return true;
    if (type === 'single') return (t.targetDate || t.date) === dateStr;
    if (type === 'range') return t.startDate <= dateStr && t.endDate >= dateStr;
    return false;
  });
}

/**
 * Builds the task log summary object for a given day.
 *
 * @param {object[]} tasks - All tasks from state.
 * @param {object[]} allHabits - Flat array of all habit objects from all goals.
 * @param {string} today - YYYY-MM-DD date string for today.
 * @returns {{ date: string, total_tasks: number, completed_tasks: number, time_spent: number, auto_completed: boolean }}
 */
export function buildTaskLogSummary(tasks, allHabits, today) {
  const todayTasksForLog = computeTodayTasksForLog(tasks, today);
  const completedTasksForLog = todayTasksForLog.filter(t => isTaskDone(t)).length;

  const taskTimeSpent = todayTasksForLog.reduce((acc, t) => acc + (t.timeSpent || 0), 0);
  const habitTimeSpent = (allHabits || []).reduce((acc, h) => acc + (h.timeSpent || 0), 0);

  return {
    date: today,
    total_tasks: todayTasksForLog.length,
    completed_tasks: completedTasksForLog,
    time_spent: taskTimeSpent + habitTimeSpent,
    auto_completed: true,
  };
}

/**
 * Determines whether a task log summary has meaningfully changed
 * compared to the previously saved one. Used to prevent no-op writes.
 *
 * @param {object|null} last - Previously saved summary (or null).
 * @param {object} current - Current summary.
 * @returns {boolean} true if the summary has changed and should be saved.
 */
export function hasTaskLogChanged(last, current) {
  if (!last) return true;
  return (
    last.date !== current.date ||
    last.total_tasks !== current.total_tasks ||
    last.completed_tasks !== current.completed_tasks ||
    last.time_spent !== current.time_spent
  );
}
