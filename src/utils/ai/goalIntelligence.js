/**
 * Goal Intelligence Engine
 *
 * Detects:
 * — Inactive goals → Missing Dream recommendations
 * — Top-performing goal (highest completion rate last 14 days)
 * — Goals losing momentum (completion rate dropped >30% week-over-week)
 * — Goals with ALL mode + many habits that might benefit from simplification
 *
 * Run frequency: Every 6 hours
 */

import { TODAY, addDays } from '../dateUtils';
import { makeInsight } from './insightSchema';

// ── Helpers ─────────────────────────────────────────────────────────────────

const isHabitScheduledToday = (h) => {
  if (!h.scheduleDays || h.scheduleDays.length === 0) return true;
  const DAY_ABBRS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return h.scheduleDays.includes(DAY_ABBRS[new Date().getDay()]);
};

/**
 * Compute a goal's completion rate over the last N days using completedDates.
 */
const completionRateOverDays = (goal, days) => {
  const today = TODAY();
  const dates = new Set(goal.completedDates || []);
  let scheduled = 0;
  let completed = 0;
  for (let i = 1; i <= days; i++) {
    const d = addDays(today, -i);
    // Only count as scheduled if at least one habit existed (use completedDates or fallback to count all days)
    scheduled++;
    if (dates.has(d)) completed++;
  }
  return scheduled === 0 ? 0 : completed / scheduled;
};

// ── Main Export ──────────────────────────────────────────────────────────────

/**
 * @param {object[]} goals
 * @returns {object[]} insights
 */
export const analyzeGoalIntelligence = (goals) => {
  const insights = [];
  const activeGoals = (goals || []).filter(g => !g.isMissingDream);

  if (activeGoals.length === 0) return insights;

  // ── 1. Inactive Goals → Missing Dream Recommendations ────────────────────
  for (const goal of activeGoals) {
    const missedDays = goal.missedDays || 0;
    const maxHabitMissed = (goal.habits || []).length === 0
      ? 0
      : Math.max(...(goal.habits || []).map(h => h.missedDays || 0));

    if (missedDays >= 7 || maxHabitMissed >= 7) {
      insights.push(makeInsight({
        id: `missing_dream_recommend_${goal.id}`,
        type: 'goal_intelligence',
        priority: 'medium',
        title: `🌙 "${goal.title}" Has Gone Quiet`,
        message: `No progress on "${goal.title}" for ${Math.max(missedDays, maxHabitMissed)}+ days. Rather than letting it silently lower your accuracy, consider moving it to "Missing Dreams" mode — you can restore it anytime with full streak history intact.`,
        action: {
          label: 'Move to Missing Dreams',
          payload: { goalId: goal.id, action: 'move_to_missing_dream' },
        },
        dismissible: true,
        metadata: { goalId: goal.id, missedDays: Math.max(missedDays, maxHabitMissed) },
      }));
    }
  }

  // ── 2. Top-Performing Goal ───────────────────────────────────────────────
  const goalRates = activeGoals.map(g => ({
    goal: g,
    rate14: completionRateOverDays(g, 14),
  })).filter(gr => gr.rate14 > 0);

  if (goalRates.length > 0) {
    const top = goalRates.sort((a, b) => b.rate14 - a.rate14)[0];
    if (top.rate14 >= 0.7) {
      insights.push(makeInsight({
        id: `top_goal_${top.goal.id}`,
        type: 'goal_intelligence',
        priority: 'low',
        title: `⭐ "${top.goal.title}" is Your Best System`,
        message: `"${top.goal.title}" achieved a ${Math.round(top.rate14 * 100)}% completion rate over the past 14 days. This is your most consistent goal — build on its momentum.`,
        dismissible: true,
        metadata: { goalId: top.goal.id, rate14: top.rate14 },
      }));
    }
  }

  // ── 3. Goals Losing Momentum ─────────────────────────────────────────────
  for (const goal of activeGoals) {
    const rateThisWeek = completionRateOverDays(goal, 7);
    const rateLastWeek = completionRateOverDays(goal, 14) - rateThisWeek / 2; // approximation
    const drop = rateLastWeek - rateThisWeek;

    if (drop > 0.3 && rateLastWeek > 0.3 && rateThisWeek < 0.5) {
      // Don't surface if already surfaced as inactive
      const alreadyInactive = insights.some(i => i.id === `missing_dream_recommend_${goal.id}`);
      if (!alreadyInactive) {
        insights.push(makeInsight({
          id: `goal_momentum_drop_${goal.id}`,
          type: 'goal_intelligence',
          priority: 'medium',
          title: `📉 "${goal.title}" Losing Momentum`,
          message: `"${goal.title}" completion dropped significantly this week vs last. Consider simplifying the daily requirement or reviewing which habits are causing friction.`,
          dismissible: true,
          metadata: { goalId: goal.id, rateThisWeek, rateLastWeek, drop },
        }));
      }
    }
  }

  // ── 4. Simplification Suggestion for Complex ALL-mode Goals ──────────────
  for (const goal of activeGoals) {
    if (goal.mode !== 'ALL') continue;
    const scheduled = (goal.habits || []).filter(isHabitScheduledToday);
    const done = scheduled.filter(h => {
      // Check completedDates includes today
      const today = TODAY();
      return (h.completedDates || []).includes(today) || h.lastCompletedDate === today;
    }).length;
    const completionRate = scheduled.length > 0 ? done / scheduled.length : 1;

    if (scheduled.length >= 4 && completionRate < 0.5) {
      const suggested = Math.ceil(scheduled.length * 0.6);
      insights.push(makeInsight({
        id: `goal_simplify_${goal.id}`,
        type: 'goal_intelligence',
        priority: 'low',
        title: `💡 Simplify "${goal.title}"?`,
        message: `"${goal.title}" requires all ${scheduled.length} habits and is currently at ${Math.round(completionRate * 100)}% today. Switching to a "Minimum ${suggested}" rule would make this goal achievable without removing any habits.`,
        dismissible: true,
        metadata: { goalId: goal.id, scheduledCount: scheduled.length, suggested },
      }));
    }
  }

  return insights;
};
