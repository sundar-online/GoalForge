/**
 * GoalForge AI Insight System — Schema & Deduplication Layer
 *
 * Every insight returned by any engine must conform to this shape.
 * This module also handles contradiction prevention and priority sorting.
 */

// ── Priority ordering (lower index = higher priority) ──────────────────────
export const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

/**
 * Build a standardized insight object.
 * All fields are explicit to prevent accidental shape divergence.
 */
export const makeInsight = ({
  id,
  type,          // 'streak_risk' | 'milestone' | 'recovery' | 'accuracy' |
                 // 'goal_intelligence' | 'habit_pattern' | 'motivation' | 'coaching'
  priority,      // 'critical' | 'high' | 'medium' | 'low'
  title,
  message,
  action = null, // { label, payload } — optional CTA
  dismissible = true,
  metadata = {}, // engine-specific data (e.g. { streakCount, habitId })
}) => ({
  id,
  type,
  priority,
  title,
  message,
  action,
  dismissible,
  metadata,
  timestamp: Date.now(),
});

// ── Contradiction rules ─────────────────────────────────────────────────────
// Each rule: if insight A exists, suppress insight B (by id prefix match).
const CONTRADICTION_RULES = [
  // A streak milestone celebration should not coexist with a streak risk for the same item
  { if: 'milestone_', suppress: 'streak_risk_' },
  // A top-performing goal card should not coexist with a "move to missing dream" card for the same goal
  { if: 'top_goal_', suppress: 'missing_dream_recommend_' },
  // A burnout warning should suppress any "push harder" motivation cards
  { if: 'burnout_', suppress: 'motivation_push_' },
  // Recovery center active → suppress generic motivation that contradicts rest
  { if: 'recovery_grouped_', suppress: 'motivation_push_' },
];

/**
 * Apply contradiction prevention rules.
 * Suppresses insights whose IDs match a suppression rule triggered by another insight.
 */
export const applyContradictionRules = (insights) => {
  const ids = insights.map(i => i.id);

  const suppressedPrefixes = new Set();
  for (const rule of CONTRADICTION_RULES) {
    const triggerExists = ids.some(id => id.startsWith(rule.if));
    if (triggerExists) {
      suppressedPrefixes.add(rule.suppress);
    }
  }

  if (suppressedPrefixes.size === 0) return insights;

  return insights.filter(i => {
    for (const prefix of suppressedPrefixes) {
      if (i.id.startsWith(prefix)) return false;
    }
    return true;
  });
};

/**
 * Sort insights by priority then timestamp (newer first within same priority).
 */
export const sortByPriority = (insights) =>
  [...insights].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 3;
    const pb = PRIORITY_ORDER[b.priority] ?? 3;
    if (pa !== pb) return pa - pb;
    return b.timestamp - a.timestamp;
  });

/**
 * Filter out insights that were dismissed today.
 * Dismissed IDs are stamped as `${id}__YYYY-MM-DD`.
 */
export const filterDismissed = (insights, dismissedInsights = [], todayKey) => {
  const dismissedSet = new Set(dismissedInsights);
  return insights.filter(i => {
    const stamped = `${i.id}__${todayKey}`;
    return !dismissedSet.has(stamped) && !dismissedSet.has(i.id);
  });
};

/**
 * Cap total Live Insights (non-weekly/monthly) displayed.
 * critical insights are always shown; others capped at 6 total.
 */
export const capInsights = (insights, maxNonCritical = 5) => {
  const critical = insights.filter(i => i.priority === 'critical');
  const rest = insights.filter(i => i.priority !== 'critical').slice(0, maxNonCritical);
  return [...critical, ...rest];
};

/**
 * Full pipeline: sort → dedup by id prefix → contradiction rules → cap.
 * Use this in the worker before sending results back.
 */
export const processInsights = (rawInsights, dismissedInsights, todayKey) => {
  const sorted = sortByPriority(rawInsights);
  // Dedup: keep only one per unique id (first wins after sort)
  const seenIds = new Set();
  const deduped = sorted.filter(i => {
    if (seenIds.has(i.id)) return false;
    seenIds.add(i.id);
    return true;
  });
  const cleaned = applyContradictionRules(deduped);
  const filtered = filterDismissed(cleaned, dismissedInsights, todayKey);
  return capInsights(filtered);
};
