/**
 * Weekly Review Engine
 *
 * Generates a structured 7-day summary:
 * — Goals completed count
 * — Streak changes (gains vs losses)
 * — Best-performing habit
 * — Worst-performing habit
 * — Overall accuracy trend
 * — Recommended adjustment
 *
 * Run frequency: Weekly (cached; re-runs every Monday or on demand)
 */

import { TODAY, addDays } from '../dateUtils';

const logAccuracy = (log) =>
  log && log.total_tasks > 0 ? log.completed_tasks / log.total_tasks : 0;

/**
 * @param {object[]} goals
 * @param {object} taskLogs — { [dateStr]: logObject }
 * @returns {object} weeklyReview — structured review object
 */
export const generateWeeklyReview = (goals, taskLogs) => {
  const today = TODAY();
  const last7 = [];
  for (let i = 1; i <= 7; i++) last7.push(addDays(today, -i));

  const logs7 = last7.map(d => taskLogs[d] || { date: d, completed_tasks: 0, total_tasks: 0 });
  const activeGoals = (goals || []).filter(g => !g.isMissingDream);
  const allHabits = activeGoals.flatMap(g => g.habits || []);

  // ── Overall accuracy this week ────────────────────────────────────────────
  const totalCompleted = logs7.reduce((s, l) => s + (l.completed_tasks || 0), 0);
  const totalTasks = logs7.reduce((s, l) => s + (l.total_tasks || 0), 0);
  const weeklyAccuracy = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  // ── Previous week for comparison ─────────────────────────────────────────
  const prev7 = [];
  for (let i = 8; i <= 14; i++) prev7.push(addDays(today, -i));
  const prevLogs = prev7.map(d => taskLogs[d] || { completed_tasks: 0, total_tasks: 0 });
  const prevCompleted = prevLogs.reduce((s, l) => s + (l.completed_tasks || 0), 0);
  const prevTotal = prevLogs.reduce((s, l) => s + (l.total_tasks || 0), 0);
  const prevAccuracy = prevTotal > 0 ? Math.round((prevCompleted / prevTotal) * 100) : 0;
  const accuracyDelta = weeklyAccuracy - prevAccuracy;

  // ── Goals completed this week ─────────────────────────────────────────────
  const goalsCompletedThisWeek = activeGoals.filter(g => {
    const completedDates = g.completedDates || [];
    return last7.some(d => completedDates.includes(d));
  }).length;

  // ── Best & Worst habit ────────────────────────────────────────────────────
  const habitStats = allHabits.map(h => {
    const completedDates = new Set(h.completedDates || []);
    const completedThisWeek = last7.filter(d => completedDates.has(d)).length;
    return { habit: h, completedThisWeek, rate: completedThisWeek / 7 };
  }).filter(hs => hs.habit.streak > 0 || hs.completedThisWeek > 0);

  const bestHabitStat = habitStats.sort((a, b) => b.completedThisWeek - a.completedThisWeek)[0] || null;
  const worstHabitStat = [...habitStats].sort((a, b) => a.completedThisWeek - b.completedThisWeek)[0] || null;

  // ── Streak changes ────────────────────────────────────────────────────────
  const streakGains = allHabits.filter(h => (h.streak || 0) > 0 && (h.missedDays || 0) === 0).length;
  const streakLosses = allHabits.filter(h => (h.missedDays || 0) >= 3).length;

  // ── Recommended adjustment ────────────────────────────────────────────────
  let recommendation = '';
  if (weeklyAccuracy >= 90) {
    recommendation = 'Outstanding week. Consider adding a new stretch habit to push your growth edge.';
  } else if (weeklyAccuracy >= 70) {
    recommendation = 'Strong week. Focus on your one most-missed habit to close the gap next week.';
  } else if (weeklyAccuracy >= 50) {
    recommendation = 'Decent progress. Identify your lowest-completion goal and consider switching it to a simpler rule.';
  } else {
    recommendation = 'This was a tough week. Start next week with just your top 3 habits to rebuild momentum without overwhelm.';
  }

  // ── Active days ───────────────────────────────────────────────────────────
  const activeDays = logs7.filter(l => (l.completed_tasks || 0) > 0).length;

  return {
    weeklyAccuracy,
    prevAccuracy,
    accuracyDelta,
    goalsCompletedThisWeek,
    totalGoals: activeGoals.length,
    bestHabit: bestHabitStat ? {
      title: bestHabitStat.habit.title,
      completedDays: bestHabitStat.completedThisWeek,
      streak: bestHabitStat.habit.streak || 0,
    } : null,
    worstHabit: worstHabitStat && worstHabitStat !== bestHabitStat ? {
      title: worstHabitStat.habit.title,
      completedDays: worstHabitStat.completedThisWeek,
      streak: worstHabitStat.habit.streak || 0,
    } : null,
    streakGains,
    streakLosses,
    activeDays,
    recommendation,
    generatedAt: today,
    period: { start: last7[last7.length - 1], end: last7[0] },
  };
};
