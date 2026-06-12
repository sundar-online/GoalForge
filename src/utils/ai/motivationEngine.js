/**
 * Motivation Engine
 *
 * Generates:
 * — Identity-based reinforcement for habits ≥ 14 days
 * — Progress celebrations (goal mastery > 50%, > 75%)
 * — Time-of-day personalized encouragement
 * — Weekly achievement summary preview
 *
 * Run frequency: Every 6 hours
 */

import { TODAY } from '../dateUtils';
import { makeInsight } from './insightSchema';

// ── Identity Statements ──────────────────────────────────────────────────────
// Maps habit title keywords to identity-based messages
const IDENTITY_PATTERNS = [
  {
    keywords: ['read', 'book', 'literature'],
    identity: 'You are no longer building a reading habit — you are becoming a reader.',
    prefix: '📚',
  },
  {
    keywords: ['workout', 'gym', 'exercise', 'run', 'fitness', 'train'],
    identity: 'You are no longer just exercising — you are an athlete in the making.',
    prefix: '🏋️',
  },
  {
    keywords: ['meditat', 'mindful', 'breath', 'calm'],
    identity: 'You are no longer practicing meditation — you are building a mindful mind.',
    prefix: '🧘',
  },
  {
    keywords: ['code', 'program', 'develop', 'build', 'hack'],
    identity: 'You are no longer learning to code — you are becoming a builder.',
    prefix: '💻',
  },
  {
    keywords: ['write', 'journal', 'essay', 'blog'],
    identity: 'You are no longer practicing writing — you are becoming a writer.',
    prefix: '✍️',
  },
  {
    keywords: ['study', 'learn', 'language', 'chess', 'skill'],
    identity: 'You are no longer studying — you are becoming someone who never stops growing.',
    prefix: '🧠',
  },
  {
    keywords: ['sleep', 'rest', 'recover'],
    identity: 'You are no longer trying to sleep better — you are someone who respects recovery.',
    prefix: '😴',
  },
];

const getIdentityStatement = (habitTitle) => {
  const lower = (habitTitle || '').toLowerCase();
  for (const pattern of IDENTITY_PATTERNS) {
    if (pattern.keywords.some(k => lower.includes(k))) {
      return pattern;
    }
  }
  return null;
};

// ── Smart Time-of-Day Suggestions ───────────────────────────────────────────
export const getSmartSuggestion = (accuracy) => {
  const hour = new Date().getHours();
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = DAY_NAMES[new Date().getDay()];

  if (hour < 9) {
    if (accuracy > 10) return {
      title: '🚀 Explosive Start',
      message: `You've already crossed ${Math.round(accuracy)}% of your goals before 9 AM. Elite performance territory — keep this fire burning.`
    };
    return {
      title: '🌅 Morning Intention',
      message: `Happy ${todayName}! A small, quiet win right now triggers a dopamine loop that builds momentum for the entire day.`
    };
  }
  if (hour < 12) {
    if (accuracy < 20) return {
      title: '⚡ High-Focus Window Open',
      message: 'Your mind is at peak capacity. Protect these hours from distraction and tackle your single hardest habit block first.'
    };
    return {
      title: '🔥 Mid-Morning Momentum',
      message: `${Math.round(accuracy)}% done — you're in the zone. Stay in the flow and clear your main priority before noon.`
    };
  }
  if (hour < 14) {
    return {
      title: '🥗 Strategic Midday Pause',
      message: 'Natural energy dips occur post-lunch. Use this window for low-friction habits — light review, hydration, or a short walk.'
    };
  }
  if (hour < 17) {
    if (accuracy < 50) return {
      title: '📈 Afternoon Re-Ignition',
      message: 'The day is far from over. Break remaining habits into 10-minute focused sprints to rebuild momentum for a strong finish.'
    };
    return {
      title: '🔋 Sustained Afternoon Drive',
      message: `You've crossed the ${Math.round(accuracy)}% mark — finish one more meaningful habit before 5 PM to lock in a productive day.`
    };
  }
  if (hour < 20) {
    if (accuracy < 80) return {
      title: '🎯 The Golden Hour',
      message: `Still at ${Math.round(accuracy)}% — pick your smallest remaining habit and close it out. Evening peace is the reward.`
    };
    return {
      title: '✨ Daily Victory Secured',
      message: `${Math.round(accuracy)}% today. This is the perfect moment to review your wins and set one clear intention for tomorrow.`
    };
  }
  if (accuracy < 70) return {
    title: '💤 Strategic Surrender',
    message: "It's late and energy is low. Don't force heavy work now — quality sleep is your brain's best performance tool for tomorrow."
  };
  return {
    title: '🌙 Calm Reflection',
    message: `${Math.round(accuracy)}% achieved today. Wind down, acknowledge your progress, and let tomorrow begin with clear intention.`
  };
};

// ── Main Export ──────────────────────────────────────────────────────────────

/**
 * @param {object[]} goals
 * @param {number} accuracy — 0-100
 * @returns {object[]} insights
 */
export const analyzeMotivation = (goals, accuracy) => {
  const insights = [];

  const activeGoals = (goals || []).filter(g => !g.isMissingDream);
  const allHabits = activeGoals.flatMap(g => g.habits || []);

  // ── 1. Identity Statements (habits ≥ 14 days) ────────────────────────────
  const longHabits = allHabits
    .filter(h => (h.streak || 0) >= 14)
    .sort((a, b) => (b.streak || 0) - (a.streak || 0));

  // Surface at most one identity statement (highest streak first)
  for (const habit of longHabits) {
    const pattern = getIdentityStatement(habit.title);
    if (pattern) {
      insights.push(makeInsight({
        id: `motivation_identity_${habit.id}`,
        type: 'motivation',
        priority: 'low',
        title: `${pattern.prefix} Identity Builder — ${habit.streak} Days`,
        message: `${pattern.identity} With a ${habit.streak}-day streak on "${habit.title}", this is now who you are.`,
        dismissible: true,
        metadata: { habitId: habit.id, habitTitle: habit.title, streak: habit.streak },
      }));
      break; // Only one identity card at a time
    }
  }

  // ── 2. Goal Mastery Progress Celebrations ────────────────────────────────
  for (const goal of activeGoals) {
    const progress = goal.progress || 0;

    if (progress >= 75 && progress < 100) {
      insights.push(makeInsight({
        id: `motivation_mastery_75_${goal.id}`,
        type: 'motivation',
        priority: 'low',
        title: `🏁 "${goal.title}" — Final Stretch`,
        message: `"${goal.title}" is at ${progress}% mastery — you're in the final quarter. One focused week can bring this goal to completion.`,
        dismissible: true,
        metadata: { goalId: goal.id, progress },
      }));
    } else if (progress >= 50 && progress < 75) {
      insights.push(makeInsight({
        id: `motivation_mastery_50_${goal.id}`,
        type: 'motivation',
        priority: 'low',
        title: `🎯 "${goal.title}" — Past Halfway`,
        message: `"${goal.title}" has crossed the halfway point at ${progress}% mastery. The hardest part is behind you — momentum is now on your side.`,
        dismissible: true,
        metadata: { goalId: goal.id, progress },
      }));
    }
  }

  // ── 3. Rock-Solid Routine (top habit with streak ≥ 5) ────────────────────
  const topHabit = allHabits
    .filter(h => (h.streak || 0) >= 5 && (h.streak || 0) < 14) // 14+ handled by identity
    .sort((a, b) => (b.streak || 0) - (a.streak || 0))[0];

  if (topHabit) {
    insights.push(makeInsight({
      id: `motivation_streak_${topHabit.id}`,
      type: 'motivation',
      priority: 'low',
      title: `💎 ${topHabit.streak}-Day Streak: "${topHabit.title}"`,
      message: `With ${topHabit.streak} consecutive days on "${topHabit.title}", your routine is becoming automatic. Keep this chain unbroken — the discipline compounds daily.`,
      dismissible: true,
      metadata: { habitId: topHabit.id, habitTitle: topHabit.title, streak: topHabit.streak },
    }));
  }

  return insights;
};
