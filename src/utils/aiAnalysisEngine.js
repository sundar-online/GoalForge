import { TODAY, addDays, diffDays } from './dateUtils';

/**
 * AI-Driven Insights & Recovery System
 * Analyzes real user behavior patterns and provides actionable, dynamic insights.
 */

// ── Helper: Get day name from date string ────────────────────────────────────
const getDayName = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });

const getTodayDayName = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long' });

// ── Helper: Calculate real accuracy for a log entry ──────────────────────────
const logAccuracy = (log) =>
  log.total_tasks > 0 ? log.completed_tasks / log.total_tasks : 0;

// ── Helper: Group logs by weekday ────────────────────────────────────────────
const groupByWeekday = (logs) => {
  const byDay = {}; // { 'Monday': [accuracy, ...], ... }
  logs.forEach((log) => {
    if (!log.date || log.total_tasks === 0) return;
    const day = getDayName(log.date);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(logAccuracy(log));
  });
  return byDay;
};

// ── Main: Analyze User Behavior ───────────────────────────────────────────────
export const analyzeUserBehavior = (goals, tasks, taskLogs, focusTime) => {
  const insights = [];
  const today = TODAY();
  const todayDayName = getTodayDayName();

  // Use last 21 days of logs for richer analysis
  const allLogs = Object.values(taskLogs)
    .filter((l) => l && l.date && l.date !== today) // Exclude today (in-progress)
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .slice(-21);

  // ── 1. Real Peak Day Analysis ─────────────────────────────────────────────
  if (allLogs.length >= 5) {
    const byDay = groupByWeekday(allLogs);
    const dayAverages = Object.entries(byDay)
      .filter(([, accs]) => accs.length >= 2) // Need at least 2 data points per day
      .map(([day, accs]) => ({
        day,
        avg: accs.reduce((s, a) => s + a, 0) / accs.length,
        count: accs.length,
      }))
      .sort((a, b) => b.avg - a.avg);

    if (dayAverages.length >= 2) {
      const best = dayAverages[0];
      const worst = dayAverages[dayAverages.length - 1];
      const realBoost = Math.round((best.avg - worst.avg) * 100);

      if (best.avg > 0.5 && realBoost >= 10) {
        const isToday = best.day === todayDayName;
        insights.push({
          id: 'peak_performance',
          type: 'peak_performance',
          priority: isToday ? 'high' : 'medium',
          title: isToday ? '⚡ Your Peak Day is TODAY' : '🎯 Golden Pattern Detected',
          message: isToday
            ? `${todayDayName} is your best day — ${Math.round(best.avg * 100)}% avg completion. Schedule your hardest tasks now!`
            : `You're ${realBoost}% more productive on ${best.day}s (${Math.round(best.avg * 100)}% avg). Move challenging tasks there.`,
          icon: isToday ? '⚡' : '🎯',
        });
      }
    }
  }

  // ── 2. Today's Pattern-Based Coaching ────────────────────────────────────
  const todayLogs = allLogs.filter((l) => getDayName(l.date) === todayDayName);
  if (todayLogs.length >= 2) {
    const todayAvg = todayLogs.reduce((s, l) => s + logAccuracy(l), 0) / todayLogs.length;
    const todayPercent = Math.round(todayAvg * 100);

    if (todayPercent < 40) {
      insights.push({
        id: 'today_weakness',
        type: 'warning',
        priority: 'medium',
        title: `📉 ${todayDayName} Needs Work`,
        message: `Your average completion on ${todayDayName}s is only ${todayPercent}%. Try scheduling fewer but more impactful tasks today.`,
        icon: '📉',
      });
    } else if (todayPercent >= 75) {
      insights.push({
        id: 'today_strength',
        type: 'peak_performance',
        priority: 'low',
        title: `💪 ${todayDayName} is Your Strength`,
        message: `You average ${todayPercent}% completion on ${todayDayName}s. Great day to tackle a backlog item or push a tough habit.`,
        icon: '💪',
      });
    }
  }

  // ── 3. Burnout Risk Detection ─────────────────────────────────────────────
  const recentLogs = allLogs.slice(-3);
  const recentAvg =
    recentLogs.length > 0
      ? recentLogs.reduce((acc, l) => acc + logAccuracy(l), 0) / recentLogs.length
      : 1;

  if (recentAvg < 0.35 && focusTime > 90 * 60) {
    insights.push({
      id: 'burnout_warning',
      type: 'burnout',
      priority: 'high',
      title: '🔥 Burnout Risk Detected',
      message: `High focus time but only ${Math.round(recentAvg * 100)}% avg task completion lately. Consider a "Minimalist Day" to reset momentum.`,
      icon: '🔥',
      actionLabel: 'Activate Minimalist Mode',
    });
  }

  // ── 4. Momentum Drop Alert ────────────────────────────────────────────────
  if (allLogs.length >= 6) {
    const olderHalf = allLogs.slice(-6, -3);
    const recentHalf = allLogs.slice(-3);
    const olderAvg = olderHalf.reduce((s, l) => s + logAccuracy(l), 0) / olderHalf.length;
    const recentHalfAvg = recentHalf.reduce((s, l) => s + logAccuracy(l), 0) / recentHalf.length;
    const drop = Math.round((olderAvg - recentHalfAvg) * 100);

    if (drop >= 25 && !insights.find((i) => i.id === 'burnout_warning')) {
      insights.push({
        id: 'momentum_drop',
        type: 'warning',
        priority: 'medium',
        title: '📊 Momentum Slipping',
        message: `Your completion rate dropped by ${drop}% over the past 3 days. Start with your easiest task today to rebuild momentum.`,
        icon: '📊',
      });
    }
  }

  // ── 5. Consistency Champion ───────────────────────────────────────────────
  const allHabits = goals.flatMap((g) => g.habits || []);
  const topHabit = [...allHabits].sort((a, b) => (b.streak || 0) - (a.streak || 0))[0];

  if (topHabit && topHabit.streak >= 7) {
    insights.push({
      id: 'consistency_champ',
      type: 'peak_performance',
      priority: 'low',
      title: '💎 Unstoppable Momentum',
      message: `"${topHabit.title}" is on a ${topHabit.streak}-day streak. You're building a rock-solid identity habit.`,
      icon: '💎',
    });
  }

  // ── 6. Weekly Trend Insight ───────────────────────────────────────────────
  if (allLogs.length >= 7) {
    const last7 = allLogs.slice(-7);
    const perfectDays = last7.filter((l) => logAccuracy(l) === 1).length;
    if (perfectDays >= 5) {
      insights.push({
        id: 'perfect_week',
        type: 'peak_performance',
        priority: 'low',
        title: '🏆 Elite Week',
        message: `${perfectDays} out of the last 7 days were 100% completion days. You're operating at your peak — don't break the chain!`,
        icon: '🏆',
      });
    }
  }

  return insights;
};

// ── Recovery Strategies ───────────────────────────────────────────────────────
export const generateRecoveryStrategies = (goals, tasks) => {
  const strategies = [];
  const today = TODAY();

  // 1. Streak Recovery (The 2-Day Rule)
  const allItems = [
    ...goals.flatMap((g) =>
      (g.habits || []).map((h) => ({ ...h, parentId: g.id, isHabit: true }))
    ),
    ...tasks.filter((t) => t.type === 'daily').map((t) => ({ ...t, isHabit: false })),
  ];

  const criticalItems = allItems.filter((item) => (item.missedDays || 0) === 2);

  criticalItems.forEach((item) => {
    const recoveryTarget =
      item.type === 'count'
        ? Math.max(1, Math.round((item.targetCount || 10) * 0.3))
        : Math.max(5, Math.round((item.targetTime ?? 30) * 0.3));

    strategies.push({
      id: `recovery_${item.id}`,
      type: 'recovery',
      priority: 'high',
      title: '🆘 Streak Emergency!',
      message: `You've missed "${item.title}" for 2 days. Don't let the streak die. Use the "Micro-Habit" recovery plan.`,
      icon: '🆘',
      actionLabel: 'Accept Recovery Plan',
      recoveryPlan: {
        itemId: item.id,
        parentId: item.parentId,
        isHabit: item.isHabit,
        originalTarget: item.type === 'count' ? item.targetCount : item.targetTime,
        newTarget: recoveryTarget,
        type: item.type,
      },
    });
  });

  // 2. Procrastination Recovery
  const overdueTasks = tasks.filter(
    (t) => t.type === 'single' && t.targetDate < today && !t.completed
  );
  if (overdueTasks.length >= 3) {
    strategies.push({
      id: 'procrastination_purge',
      type: 'recovery',
      priority: 'medium',
      title: '🧹 Backlog Overload',
      message: `You have ${overdueTasks.length} overdue tasks. Pick ONE to tackle now and archive the rest to clear mental load.`,
      icon: '🧹',
      actionLabel: 'Start Purge',
    });
  }

  return strategies;
};

// ── Smart Time-of-Day Suggestions ────────────────────────────────────────────
export const getSmartSuggestions = (currentTime, tasks, progress) => {
  const hour = new Date().getHours();
  const todayDayName = getTodayDayName();

  if (hour < 9 && progress < 5) {
    return {
      title: '🌅 Morning Momentum',
      message: `Happy ${todayDayName}! Start with your smallest task to trigger a dopamine loop and build early momentum.`,
    };
  }

  if (hour >= 9 && hour < 12 && progress < 30) {
    return {
      title: '⚡ Peak Focus Window',
      message: 'Morning hours are your cognitive peak. Tackle your most demanding task before lunch.',
    };
  }

  if (hour >= 14 && hour < 16 && progress < 60) {
    return {
      title: '☕ Afternoon Recovery',
      message: 'Post-lunch slump is real. Try a 5-min walk then return — you\'ll process tasks 20% faster.',
    };
  }

  if (hour >= 20 && progress < 80) {
    return {
      title: '🌙 Evening Sprint',
      message: 'Power down distractions. Focus on the one task that will make tomorrow easier.',
    };
  }

  return null;
};
