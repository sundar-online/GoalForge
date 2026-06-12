/**
 * Streak Intelligence Engine
 *
 * Analyzes habit and goal streaks to surface:
 * — Streak-at-risk alerts (missed days, no completion today)
 * — Milestone celebrations (7, 30, 100 days)
 * — Predictive risk score per item
 *
 * Run frequency: Every dashboard load
 */

import { TODAY } from '../dateUtils';
import { makeInsight } from './insightSchema';

const MILESTONES = [7, 30, 100, 200, 365];

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
 * Predictive risk level based on missed days relative to streak length.
 * Returns: 'low' | 'medium' | 'high' | 'critical'
 */
const streakRiskLevel = (streak, missedDays) => {
  if (missedDays === 0) return 'low';
  if (missedDays === 1) return streak >= 14 ? 'high' : 'medium';
  if (missedDays === 2) return streak >= 7 ? 'critical' : 'high';
  return 'critical';
};

const riskToPriority = { critical: 'critical', high: 'high', medium: 'medium', low: 'low' };

/**
 * Return the next uncelebrated milestone for a given streak.
 * Requires `celebratedMilestones[habitId]` array to check what's already fired.
 */
const getNextMilestone = (streak, alreadyCelebrated = []) => {
  for (const m of MILESTONES) {
    if (streak >= m && !alreadyCelebrated.includes(m)) return m;
  }
  return null;
};

const milestoneEmoji = (m) => {
  if (m >= 365) return '👑';
  if (m >= 100) return '🏆';
  if (m >= 30) return '💎';
  return '🔥';
};

const milestoneLabel = (m) => {
  if (m >= 365) return 'Legendary';
  if (m >= 100) return 'Elite';
  if (m >= 30) return 'Iron Discipline';
  return 'Momentum Builder';
};

// ── Main Export ──────────────────────────────────────────────────────────────

/**
 * @param {object[]} goals — active goals with nested habits
 * @param {object} celebratedMilestones — { [habitId]: number[] } from settings
 * @returns {{ insights: object[], newMilestones: object }}
 *   insights — array of standardized insight objects
 *   newMilestones — milestones newly detected (caller must persist to settings)
 */
export const analyzeStreakIntelligence = (goals, celebratedMilestones = {}) => {
  const insights = [];
  const newMilestones = {}; // { habitId: milestoneValue }

  const activeGoals = (goals || []).filter(g => !g.isMissingDream);

  for (const goal of activeGoals) {
    const habits = goal.habits || [];

    for (const habit of habits) {
      const streak = habit.streak || 0;
      const missedDays = habit.missedDays || 0;
      const doneToday = isHabitDoneToday(habit);
      const scheduledToday = isHabitScheduledToday(habit);

      // ── 1. Milestone Celebrations ─────────────────────────────────────────
      if (streak > 0) {
        const alreadyCelebrated = celebratedMilestones[habit.id] || [];
        const milestone = getNextMilestone(streak, alreadyCelebrated);

        if (milestone !== null) {
          const emoji = milestoneEmoji(milestone);
          const label = milestoneLabel(milestone);
          insights.push(makeInsight({
            id: `milestone_${habit.id}_${milestone}`,
            type: 'milestone',
            priority: milestone >= 30 ? 'high' : 'medium',
            title: `${emoji} ${milestone}-Day ${label}!`,
            message: `"${habit.title}" has reached a ${milestone}-day streak. You've built something real—this habit is now part of who you are. Protect it.`,
            dismissible: true,
            metadata: { habitId: habit.id, habitTitle: habit.title, milestone, streak, goalTitle: goal.title },
          }));
          newMilestones[habit.id] = milestone;
        }
      }

      // ── 2. Streak-at-Risk Alerts ──────────────────────────────────────────
      if (streak > 0 && scheduledToday && !doneToday && missedDays >= 1) {
        const risk = streakRiskLevel(streak, missedDays);
        const priority = riskToPriority[risk];

        let title, message;
        if (risk === 'critical') {
          title = `🚨 Critical: "${habit.title}" Streak Breaking`;
          message = `Your ${streak}-day streak on "${habit.title}" is in critical danger after ${missedDays} missed days. Complete even a minimal session today to preserve your momentum.`;
        } else if (risk === 'high') {
          title = `⚠️ "${habit.title}" Streak at Risk`;
          message = `Your ${streak}-day streak needs protecting. ${missedDays} day${missedDays > 1 ? 's' : ''} missed—one focused session today keeps the chain alive.`;
        } else {
          title = `💡 Keep "${habit.title}" Going`;
          message = `You missed yesterday on "${habit.title}" (${streak}-day streak). A quick session today preserves everything you've built.`;
        }

        insights.push(makeInsight({
          id: `streak_risk_${habit.id}`,
          type: 'streak_risk',
          priority,
          title,
          message,
          action: null,
          dismissible: true,
          metadata: {
            habitId: habit.id,
            habitTitle: habit.title,
            goalId: goal.id,
            goalTitle: goal.title,
            streak,
            missedDays,
            risk,
          },
        }));
      }

      // ── 3. First-time completion celebration (streak just hit 1) ──────────
      if (streak === 1 && doneToday) {
        const alreadyCelebrated = celebratedMilestones[habit.id] || [];
        if (!alreadyCelebrated.includes(1)) {
          insights.push(makeInsight({
            id: `milestone_${habit.id}_1`,
            type: 'milestone',
            priority: 'low',
            title: `✨ "${habit.title}" — First Day Done!`,
            message: `Every great streak starts with a single day. You just completed your first session of "${habit.title}". The journey begins now.`,
            dismissible: true,
            metadata: { habitId: habit.id, milestone: 1, streak: 1 },
          }));
          newMilestones[habit.id] = 1;
        }
      }
    }
  }

  return { insights, newMilestones };
};
