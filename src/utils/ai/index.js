/**
 * GoalForge AI Engine — Unified Index
 *
 * Re-exports all engine functions and schema utilities for use in aiWorker.js.
 * Grouped by run frequency for the worker's dispatch logic.
 */

// ── Schema & Pipeline ────────────────────────────────────────────────────────
export {
  makeInsight,
  processInsights,
  sortByPriority,
  filterDismissed,
  capInsights,
  applyContradictionRules,
  PRIORITY_ORDER,
} from './insightSchema';

// ── Every-Load Engines ───────────────────────────────────────────────────────
export { analyzeStreakIntelligence } from './streakIntelligence';
export { analyzeAccuracyIntelligence } from './accuracyIntelligence';
export { generateRecoveryInsights } from './recoveryEngine';

// ── Every-6-Hour Engines ─────────────────────────────────────────────────────
export { analyzeGoalIntelligence } from './goalIntelligence';
export { analyzeHabitPatterns } from './habitPatternEngine';
export { analyzeMotivation, getSmartSuggestion } from './motivationEngine';

// ── Weekly Engine ────────────────────────────────────────────────────────────
export { generateWeeklyReview } from './weeklyReviewEngine';

// ── Monthly Engine ───────────────────────────────────────────────────────────
export { generateMonthlyReview } from './monthlyReviewEngine';
