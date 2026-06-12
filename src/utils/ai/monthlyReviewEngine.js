/**
 * Monthly Review Engine
 *
 * Generates a structured 30-day strategic review:
 * — Goal mastery trends per goal
 * — Habit success rates (completion ÷ scheduled days)
 * — Goals requiring redesign (consistent underperformance)
 * — Focus recommendation for next month
 * — Data sufficiency check (placeholder for <30 days of data)
 *
 * Run frequency: Monthly
 */

import { TODAY, addDays, diffDays } from '../dateUtils';

const logAccuracy = (log) =>
  log && log.total_tasks > 0 ? log.completed_tasks / log.total_tasks : 0;

/**
 * @param {object[]} goals
 * @param {object} taskLogs — { [dateStr]: logObject }
 * @param {string|null} userCreatedAt — ISO date string of account creation (for data sufficiency)
 * @returns {object} monthlyReview — structured review object or placeholder
 */
export const generateMonthlyReview = (goals, taskLogs, userCreatedAt = null) => {
  const today = TODAY();

  // ── Data Sufficiency Check ────────────────────────────────────────────────
  const logDates = Object.keys(taskLogs || {}).filter(d => d < today).sort();
  const daysWithData = logDates.length;

  // Determine days since account creation (or earliest log)
  let daysSinceStart = daysWithData;
  if (userCreatedAt) {
    try {
      const createdDate = typeof userCreatedAt === 'string'
        ? userCreatedAt.split('T')[0]
        : today;
      daysSinceStart = diffDays(today, createdDate);
    } catch { /* use daysWithData */ }
  }

  if (daysWithData < 14) {
    const daysNeeded = Math.max(0, 30 - daysWithData);
    return {
      hasEnoughData: false,
      daysWithData,
      daysNeeded,
      message: `Your first strategic review unlocks in ${daysNeeded} day${daysNeeded !== 1 ? 's' : ''}. Keep forging daily consistency to reveal deeper AI insights about your long-term patterns.`,
      generatedAt: today,
    };
  }

  // ── Data Range ────────────────────────────────────────────────────────────
  const daysToAnalyze = Math.min(30, daysWithData);
  const last30 = [];
  for (let i = 1; i <= daysToAnalyze; i++) last30.push(addDays(today, -i));

  const logs30 = last30.map(d => taskLogs[d] || { date: d, completed_tasks: 0, total_tasks: 0 });

  // ── Overall Monthly Accuracy ──────────────────────────────────────────────
  const totalCompleted = logs30.reduce((s, l) => s + (l.completed_tasks || 0), 0);
  const totalTasks = logs30.reduce((s, l) => s + (l.total_tasks || 0), 0);
  const monthlyAccuracy = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  const activeGoals = (goals || []).filter(g => !g.isMissingDream);
  const allHabits = activeGoals.flatMap(g => g.habits || []);

  // ── Goal Mastery Trends ───────────────────────────────────────────────────
  const goalTrends = activeGoals.map(g => {
    const completedDates = new Set(g.completedDates || []);
    const completedThisMonth = last30.filter(d => completedDates.has(d)).length;
    const completionRate = Math.round((completedThisMonth / daysToAnalyze) * 100);
    return {
      goalId: g.id,
      title: g.title,
      completionRate,
      completedDays: completedThisMonth,
      totalDays: daysToAnalyze,
      mode: g.mode || 'ALL',
      progress: g.progress || 0,
      needsRedesign: completionRate < 40,
    };
  });

  // ── Habit Success Rates ───────────────────────────────────────────────────
  const habitStats = allHabits.map(h => {
    const completedDates = new Set(h.completedDates || []);
    const completedThisMonth = last30.filter(d => completedDates.has(d)).length;
    return {
      habitId: h.id,
      title: h.title,
      streak: h.streak || 0,
      completedDays: completedThisMonth,
      successRate: Math.round((completedThisMonth / daysToAnalyze) * 100),
    };
  }).sort((a, b) => b.successRate - a.successRate);

  const topHabits = habitStats.slice(0, 3);
  const needsAttention = habitStats.filter(h => h.successRate < 40);

  // ── Goals Requiring Redesign ──────────────────────────────────────────────
  const goalsToRedesign = goalTrends.filter(g => g.needsRedesign);

  // ── Focus Recommendation ──────────────────────────────────────────────────
  let focusRecommendation = '';
  if (monthlyAccuracy >= 85) {
    focusRecommendation = 'Excellent month. Next month, challenge yourself by adding one new ambitious habit or increasing an existing target by 20%.';
  } else if (monthlyAccuracy >= 65) {
    focusRecommendation = 'Good month overall. Next month, focus on eliminating the bottom 1-2 consistency drains identified above.';
  } else if (goalsToRedesign.length > 0) {
    const names = goalsToRedesign.slice(0, 2).map(g => `"${g.title}"`).join(' and ');
    focusRecommendation = `Next month, prioritize redesigning ${names}. Switch to simpler completion rules or reduce daily habit count to rebuild sustainable momentum.`;
  } else {
    focusRecommendation = 'Next month, reduce your active goals to 2-3 and master those before expanding. Quality consistency beats quantity every time.';
  }

  // ── Active days ───────────────────────────────────────────────────────────
  const activeDays = logs30.filter(l => (l.completed_tasks || 0) > 0).length;
  const perfectDays = logs30.filter(l => l.total_tasks > 0 && l.completed_tasks === l.total_tasks).length;

  return {
    hasEnoughData: true,
    daysWithData,
    daysAnalyzed: daysToAnalyze,
    monthlyAccuracy,
    activeDays,
    perfectDays,
    goalTrends,
    topHabits,
    needsAttention,
    goalsToRedesign,
    focusRecommendation,
    generatedAt: today,
    period: { start: last30[last30.length - 1], end: last30[0] },
  };
};
