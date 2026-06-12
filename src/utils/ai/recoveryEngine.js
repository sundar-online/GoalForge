/**
 * Recovery Engine
 *
 * Surfaces:
 * — Micro-habit activation for habits with missed days + active streak
 * — Burnout score based on item count + recent miss rate
 * — Overdue task backlog cleanup suggestion
 * — Low-energy alternative messaging
 *
 * Run frequency: Every dashboard load
 */

import { TODAY } from '../dateUtils';
import { makeInsight } from './insightSchema';

// ── Helpers ─────────────────────────────────────────────────────────────────

const isHabitDoneToday = (h) => {
  const today = TODAY();
  if (h.lastCompletedDate !== today) return false;
  if (h.type === 'check') return !!h.completed;
  if (h.type === 'count') return (h.currentCount ?? 0) >= (h.targetCount ?? 10);
  return (h.timeSpent ?? 0) >= (h.targetTime ?? 15);
};

const logAccuracy = (log) =>
  log && log.total_tasks > 0 ? log.completed_tasks / log.total_tasks : 0;

/**
 * Burnout score 0-100.
 * Combines: active item count + recent miss rate.
 */
const computeBurnoutScore = (habits, tasks, recentLogs) => {
  const activeItemCount = habits.length + tasks.filter(t => !t.completed).length;
  const recentAvg = recentLogs.length > 0
    ? recentLogs.reduce((sum, l) => sum + logAccuracy(l), 0) / recentLogs.length
    : 1;

  // Score: high item count + low completion = high burnout
  const itemScore = Math.min(50, (activeItemCount / 15) * 50);
  const missScore = (1 - recentAvg) * 50;
  return Math.round(itemScore + missScore);
};

const lowEnergyAlternative = (habit) => {
  const t = (habit.title || '').toLowerCase();
  if (t.includes('workout') || t.includes('gym') || t.includes('exercise') || t.includes('run'))
    return '5-minute stretching session';
  if (t.includes('read') || t.includes('book'))
    return '2-page light read';
  if (t.includes('meditat') || t.includes('mindful'))
    return '2-minute breathing exercise';
  if (t.includes('study') || t.includes('learn') || t.includes('code'))
    return '10-minute review session';
  if (t.includes('write') || t.includes('journal'))
    return '3-sentence journal entry';
  return '5-minute focused session';
};

// ── Main Export ──────────────────────────────────────────────────────────────

/**
 * @param {object[]} goals
 * @param {object[]} tasks
 * @param {object} taskLogs — { [dateStr]: logObject }
 * @returns {object[]} insights (recovery strategies)
 */
export const generateRecoveryInsights = (goals, tasks, taskLogs) => {
  const insights = [];
  const today = TODAY();

  const activeGoals = (goals || []).filter(g => !g.isMissingDream);
  const allHabits = activeGoals.flatMap(g =>
    (g.habits || []).map(h => ({ ...h, parentId: g.id, isHabit: true, streak: h.streak || 0, goalTitle: g.title }))
  );
  const dailyTasks = (tasks || []).filter(t => t.type === 'daily').map(t => ({
    ...t, isHabit: false, streak: t.currentStreak || 0
  }));

  // Recent 5 logs (excluding today)
  const recentLogs = Object.values(taskLogs || {})
    .filter(l => l && l.date && l.date !== today)
    .sort((a, b) => b.date > a.date ? 1 : -1)
    .slice(0, 5);

  // ── 1. Burnout Detection ─────────────────────────────────────────────────
  const burnoutScore = computeBurnoutScore(allHabits, tasks, recentLogs);
  if (burnoutScore >= 65) {
    insights.push(makeInsight({
      id: 'burnout_warning',
      type: 'recovery',
      priority: burnoutScore >= 80 ? 'high' : 'medium',
      title: '🌿 Energy Overload Detected',
      message: `Your burnout risk score is ${burnoutScore}/100. You're managing ${allHabits.length} habits and recent completion has dipped. Today, focus on your top 2 priorities only. Everything else can wait.`,
      dismissible: true,
      metadata: { burnoutScore, habitCount: allHabits.length },
    }));
  }

  // ── 2. Micro-Habit Recovery Plans ───────────────────────────────────────
  const criticalItems = [...allHabits, ...dailyTasks].filter(item =>
    (item.missedDays || 0) >= 2 &&
    (item.streak || 0) > 0 &&
    !isHabitDoneToday(item) &&
    !item.isRecovering
  );

  if (criticalItems.length > 1) {
    const sorted = [...criticalItems].sort((a, b) => (b.streak || 0) - (a.streak || 0));
    const primary = sorted[0];
    const recoveryTarget = primary.type === 'count'
      ? Math.max(1, Math.round((primary.targetCount || 10) * 0.3))
      : Math.max(5, Math.round((primary.targetTime ?? 30) * 0.3));
    const altText = primary.isHabit ? lowEnergyAlternative(primary) : '10-minute focused session';

    insights.push(makeInsight({
      id: `recovery_grouped_${primary.id}`,
      type: 'recovery',
      priority: 'high',
      title: '🌱 Momentum Recovery Center',
      message: `${criticalItems.length} habits are at risk. Start with just one: try a "${altText}" for "${primary.title}" to keep your ${primary.streak}-day streak alive.`,
      action: {
        label: 'Activate Micro-Habit Target',
        payload: {
          itemId: primary.id,
          parentId: primary.parentId,
          isHabit: primary.isHabit,
          originalTarget: primary.type === 'count' ? primary.targetCount : primary.targetTime,
          newTarget: recoveryTarget,
          type: primary.type,
        },
      },
      dismissible: true,
      metadata: { criticalCount: criticalItems.length, primaryHabitTitle: primary.title, burnoutScore },
    }));
  } else if (criticalItems.length === 1) {
    const item = criticalItems[0];
    const recoveryTarget = item.type === 'count'
      ? Math.max(1, Math.round((item.targetCount || 10) * 0.3))
      : Math.max(5, Math.round((item.targetTime ?? 30) * 0.3));
    const altText = item.isHabit ? lowEnergyAlternative(item) : '10-minute focused session';

    insights.push(makeInsight({
      id: `recovery_${item.id}`,
      type: 'recovery',
      priority: 'high',
      title: `🆘 Protect Your "${item.title}" Streak`,
      message: `Your ${item.streak}-day streak is at risk after ${item.missedDays} missed days. Instead of the full session, try a "${altText}" — just 30% of the normal target — to keep it alive.`,
      action: {
        label: 'Accept Recovery Plan',
        payload: {
          itemId: item.id,
          parentId: item.parentId,
          isHabit: item.isHabit,
          originalTarget: item.type === 'count' ? item.targetCount : item.targetTime,
          newTarget: recoveryTarget,
          type: item.type,
        },
      },
      dismissible: true,
      metadata: { habitTitle: item.title, streak: item.streak, missedDays: item.missedDays },
    }));
  }

  // ── 3. Overdue Task Backlog ──────────────────────────────────────────────
  const overdueTasks = (tasks || []).filter(
    t => t.type === 'single' && t.targetDate < today && !t.completed
  );
  if (overdueTasks.length >= 3) {
    insights.push(makeInsight({
      id: 'recovery_backlog',
      type: 'recovery',
      priority: 'medium',
      title: `🧹 ${overdueTasks.length} Overdue Tasks Pending`,
      message: `${overdueTasks.length} tasks have passed their target date. Pick the smallest one to complete now, reschedule the rest. Clearing mental debt restores focus energy.`,
      dismissible: true,
      metadata: { overdueCount: overdueTasks.length },
    }));
  }

  return insights;
};
