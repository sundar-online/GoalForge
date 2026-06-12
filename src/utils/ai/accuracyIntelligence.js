/**
 * Accuracy Intelligence Engine
 *
 * Explains today's accuracy score with goal-level breakdown:
 * — Top contributor (goal closest to 100%)
 * — Accuracy drag (goal furthest from completion)
 * — Improvement suggestions based on goal mode
 * — Perfect day celebration
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

const isHabitScheduledToday = (h) => {
  if (!h.scheduleDays || h.scheduleDays.length === 0) return true;
  const DAY_ABBRS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return h.scheduleDays.includes(DAY_ABBRS[new Date().getDay()]);
};

/**
 * Compute a 0-100 daily progress for a goal respecting its mode.
 */
const goalDailyProgress = (goal) => {
  const habits = goal.habits || [];
  const scheduled = habits.filter(isHabitScheduledToday);
  if (scheduled.length === 0) return 100; // rest day
  const done = scheduled.filter(isHabitDoneToday).length;
  if (goal.mode === 'ANY') return done > 0 ? 100 : 0;
  const target = goal.mode === 'CUSTOM'
    ? Math.min(goal.minHabits || 1, scheduled.length)
    : scheduled.length;
  return Math.min(100, Math.round((done / target) * 100));
};

// ── Main Export ──────────────────────────────────────────────────────────────

/**
 * @param {object[]} goals
 * @param {number} accuracy — 0-100
 * @returns {object[]} insights
 */
export const analyzeAccuracyIntelligence = (goals, accuracy) => {
  const insights = [];

  const activeGoals = (goals || []).filter(g => {
    if (g.isMissingDream) return false;
    return (g.habits || []).some(isHabitScheduledToday);
  });

  if (activeGoals.length === 0) return insights;

  // Compute per-goal progress
  const goalProgress = activeGoals.map(g => ({
    goal: g,
    progress: goalDailyProgress(g),
    mode: g.mode || 'ALL',
    minHabits: g.minHabits || 1,
    scheduledCount: (g.habits || []).filter(isHabitScheduledToday).length,
    doneCount: (g.habits || []).filter(h => isHabitScheduledToday(h) && isHabitDoneToday(h)).length,
  }));

  // ── 1. Perfect Day Celebration ────────────────────────────────────────────
  if (accuracy === 100) {
    insights.push(makeInsight({
      id: 'accuracy_perfect_day',
      type: 'accuracy',
      priority: 'high',
      title: '🎯 100% Accuracy Today!',
      message: `Every active goal completed per its rule today. Maintaining this for 7 consecutive days will dramatically improve your monthly consistency score and discipline rating.`,
      dismissible: true,
      metadata: { accuracy, goalCount: activeGoals.length },
    }));
    return insights; // No drag insights needed on a perfect day
  }

  // ── 2. Top Contributor ────────────────────────────────────────────────────
  const topContributor = [...goalProgress].sort((a, b) => b.progress - a.progress)[0];
  if (topContributor && topContributor.progress >= 80) {
    const modeLabel = topContributor.mode === 'CUSTOM'
      ? `Min ${topContributor.minHabits} rule`
      : topContributor.mode === 'ANY' ? 'Any habit rule' : 'All habits rule';

    insights.push(makeInsight({
      id: `accuracy_top_${topContributor.goal.id}`,
      type: 'accuracy',
      priority: 'low',
      title: `✅ "${topContributor.goal.title}" Leading Today`,
      message: `"${topContributor.goal.title}" is your strongest performer at ${topContributor.progress}% (${modeLabel}). ${topContributor.progress === 100 ? 'Fully completed!' : `${topContributor.doneCount}/${topContributor.scheduledCount} habits done.`}`,
      dismissible: true,
      metadata: { goalId: topContributor.goal.id, progress: topContributor.progress },
    }));
  }

  // ── 3. Accuracy Drag (Lowest performing goal) ─────────────────────────────
  const dragGoal = [...goalProgress].sort((a, b) => a.progress - b.progress)[0];
  if (dragGoal && dragGoal.progress < 50) {
    let suggestion = '';
    if (dragGoal.mode === 'ALL' && dragGoal.scheduledCount >= 4) {
      suggestion = ` Consider switching "${dragGoal.goal.title}" to a "Minimum ${Math.ceil(dragGoal.scheduledCount / 2)}" rule to make it more achievable.`;
    } else if (dragGoal.mode === 'CUSTOM') {
      suggestion = ` A quick session on any one habit here will move the needle.`;
    } else {
      suggestion = ` Complete just one more habit in this goal to improve your overall accuracy.`;
    }

    insights.push(makeInsight({
      id: `accuracy_drag_${dragGoal.goal.id}`,
      type: 'accuracy',
      priority: dragGoal.progress === 0 ? 'high' : 'medium',
      title: `📉 "${dragGoal.goal.title}" Lowering Accuracy`,
      message: `"${dragGoal.goal.title}" is at ${dragGoal.progress}% today (${dragGoal.doneCount}/${dragGoal.scheduledCount} habits done).${suggestion}`,
      action: null,
      dismissible: true,
      metadata: { goalId: dragGoal.goal.id, progress: dragGoal.progress, mode: dragGoal.mode },
    }));
  }

  // ── 4. Accuracy Explanation (always include a data-driven summary) ─────────
  if (accuracy < 100 && accuracy > 0) {
    const completedGoals = goalProgress.filter(gp => gp.progress === 100).length;
    const totalGoals = goalProgress.length;

    insights.push(makeInsight({
      id: 'accuracy_explanation',
      type: 'accuracy',
      priority: 'low',
      title: `📊 Today's Accuracy: ${accuracy}%`,
      message: `${completedGoals} of ${totalGoals} goal${totalGoals > 1 ? 's' : ''} fully completed today. Each goal's score is based on its own completion rule (All / Any / Custom Minimum), then averaged for overall accuracy.`,
      dismissible: true,
      metadata: { accuracy, completedGoals, totalGoals, breakdown: goalProgress.map(gp => ({ title: gp.goal.title, progress: gp.progress })) },
    }));
  }

  return insights;
};
