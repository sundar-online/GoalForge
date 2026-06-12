/**
 * GoalForge AI Worker — Frequency-Based Intelligence Pipeline
 *
 * Dispatches the 8 AI engines based on configured run frequencies to avoid
 * unnecessary recomputation on every render:
 *
 *   Every load   → Streak Intelligence, Accuracy Intelligence, Recovery Engine
 *   Every 6 hrs  → Goal Intelligence, Habit Patterns, Motivation Engine
 *   Weekly       → Weekly Review
 *   Monthly      → Monthly Review
 *
 * The caller (AppContext) passes `lastRunTimes` so the worker can decide
 * which engines to run. Results are returned selectively — unchanged engines
 * return `null` so the caller keeps its previous cached value.
 */

import { TODAY } from '../utils/dateUtils';
import {
  analyzeStreakIntelligence,
  analyzeAccuracyIntelligence,
  generateRecoveryInsights,
  analyzeGoalIntelligence,
  analyzeHabitPatterns,
  analyzeMotivation,
  getSmartSuggestion,
  generateWeeklyReview,
  generateMonthlyReview,
  processInsights,
} from '../utils/ai/index';

// Frequency thresholds (in ms)
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const ONE_WEEK_MS  = 7 * 24 * 60 * 60 * 1000;
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

const shouldRun = (lastRunTs, thresholdMs) => {
  if (!lastRunTs) return true;
  return Date.now() - lastRunTs >= thresholdMs;
};

self.onmessage = function (e) {
  const {
    goals = [],
    tasks = [],
    taskLogs = {},
    focusTime = 0,
    accuracy = 0,
    dismissedInsights = [],
    celebratedMilestones = {},
    userCreatedAt = null,
    lastRunTimes = {}, // { sixHour: ts, weekly: ts, monthly: ts }
    forceAll = false,  // set to true on first load
    aiSettings = {},   // retrieve aiSettings
  } = e.data || {};

  console.log('[AI Worker] Processing intelligence pipeline...');

  try {
    const todayKey = TODAY();
    const rawInsights = [];
    let newMilestones = {};

    // ── Every-Load Engines ─────────────────────────────────────────────────
    const { insights: streakInsights, newMilestones: nm } =
      analyzeStreakIntelligence(goals, celebratedMilestones);
    rawInsights.push(...streakInsights);
    newMilestones = { ...newMilestones, ...nm };

    rawInsights.push(...analyzeAccuracyIntelligence(goals, accuracy));
    rawInsights.push(...generateRecoveryInsights(goals, tasks, taskLogs));

    // ── Every-6-Hour Engines ───────────────────────────────────────────────
    let sixHourInsights = null;
    if (forceAll || shouldRun(lastRunTimes.sixHour, SIX_HOURS_MS)) {
      const goalIns = analyzeGoalIntelligence(goals);
      const patternIns = analyzeHabitPatterns(goals, taskLogs);
      const motivationIns = analyzeMotivation(goals, accuracy);
      sixHourInsights = [...goalIns, ...patternIns, ...motivationIns];
      rawInsights.push(...sixHourInsights);
    }

    // ── Smart Time-of-Day Suggestion (always fresh) ────────────────────────
    const suggestion = getSmartSuggestion(accuracy);

    // ── Weekly Review ──────────────────────────────────────────────────────
    let weeklyReview = null;
    if (forceAll || shouldRun(lastRunTimes.weekly, ONE_WEEK_MS)) {
      weeklyReview = generateWeeklyReview(goals, taskLogs);
    }

    // ── Monthly Review ─────────────────────────────────────────────────────
    let monthlyReview = null;
    if (forceAll || shouldRun(lastRunTimes.monthly, ONE_MONTH_MS)) {
      monthlyReview = generateMonthlyReview(goals, taskLogs, userCreatedAt);
    }

    // ── Dedup / Sort / Contradiction / Cap / Filter dismissed ─────────────
    const processedInsights = processInsights(rawInsights, dismissedInsights, todayKey);

    // Separate recovery strategies (type === 'recovery') from behavior insights
    let recoveryStrategies = processedInsights.filter(i => i.type === 'recovery');
    let behaviorInsights = processedInsights.filter(i => i.type !== 'recovery');

    // ── AI Settings Filtering ──────────────────────────────────────────────
    if (aiSettings.liveInsightsEnabled === false) {
      behaviorInsights = [];
      recoveryStrategies = [];
    } else {
      if (aiSettings.streakRiskEnabled === false) {
        behaviorInsights = behaviorInsights.filter(i => i.type !== 'streak_risk');
      }
      if (aiSettings.recoveryEnabled === false) {
        recoveryStrategies = [];
        behaviorInsights = behaviorInsights.filter(i => i.type !== 'recovery');
      }
      if (aiSettings.motivationEnabled === false) {
        behaviorInsights = behaviorInsights.filter(i => i.type !== 'motivation');
      }
      if (aiSettings.goalIntelEnabled === false) {
        behaviorInsights = behaviorInsights.filter(i => i.type !== 'goal_intelligence' && i.type !== 'habit_pattern');
      }
      if (aiSettings.accuracyIntelEnabled === false) {
        behaviorInsights = behaviorInsights.filter(i => i.type !== 'accuracy');
      }
    }

    if (aiSettings.weeklyReviewEnabled === false) {
      weeklyReview = { disabled: true };
    }
    if (aiSettings.monthlyReviewEnabled === false) {
      monthlyReview = { disabled: true };
    }

    self.postMessage({
      type: 'SUCCESS',
      payload: {
        insights: behaviorInsights,
        strategies: recoveryStrategies,
        suggestion,
        weeklyReview,
        monthlyReview,
        newMilestones,
        ranSixHour: sixHourInsights !== null,
        ranWeekly: weeklyReview !== null,
        ranMonthly: monthlyReview !== null,
        timestamp: Date.now(),
      },
    });
  } catch (err) {
    console.error('[AI Worker Runtime Error]', err);
    self.postMessage({ type: 'ERROR', error: err.message });
  }
};
