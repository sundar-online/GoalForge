import { TODAY, addDays, diffDays } from './dateUtils';

/**
 * AI-Driven Emotional & Behavioral Coaching Engine
 * Analyzes real user patterns (streaks, weekend behavior, habit correlations, workload)
 * to provide highly personalized, motivational coaching rather than robotic alerts.
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

// ── Main: Analyze User Behavior (The Coaching Core) ──────────────────────────
export const analyzeUserBehavior = (goals, tasks, taskLogs, focusTime) => {
  const insights = [];
  const today = TODAY();
  const todayDayName = getTodayDayName();

  // Use last 21 days of logs for richer, trend-based analysis
  const allLogs = Object.values(taskLogs)
    .filter((l) => l && l.date && l.date !== today) // Exclude today (in-progress)
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .slice(-21);

  // ── 1. Momentum Insights (Weekend vs. Weekday Patterns) ─────────────────────
  if (allLogs.length >= 5) {
    const byDay = groupByWeekday(allLogs);
    
    // Calculate weekday (Mon-Fri) average vs weekend (Sat-Sun) average
    let weekdaySum = 0, weekdayCount = 0;
    let weekendSum = 0, weekendCount = 0;

    Object.entries(byDay).forEach(([day, accs]) => {
      const isWeekend = day === 'Saturday' || day === 'Sunday';
      const sum = accs.reduce((s, a) => s + a, 0);
      if (isWeekend) {
        weekendSum += sum;
        weekendCount += accs.length;
      } else {
        weekdaySum += sum;
        weekdayCount += accs.length;
      }
    });

    const weekdayAvg = weekdayCount > 0 ? weekdaySum / weekdayCount : 0;
    const weekendAvg = weekendCount > 0 ? weekendSum / weekendCount : 0;

    if (weekendCount >= 2 && weekdayCount >= 3) {
      if (weekendAvg > weekdayAvg + 0.1) {
        insights.push({
          id: 'weekend_momentum',
          type: 'coaching', // Use coaching type for premium blue/purple
          priority: 'medium',
          title: '🌅 Weekend Momentum Peak',
          message: `Your consistency improves on weekends (${Math.round(weekendAvg * 100)}% completion). You naturally find clarity and space to thrive when the weekday noise fades!`,
          icon: '🌅',
        });
      } else if (weekdayAvg > weekendAvg + 0.1) {
        insights.push({
          id: 'weekday_momentum',
          type: 'coaching',
          priority: 'medium',
          title: '⚡ Weekday Focus Mastery',
          message: `Your weekday routines are highly stable, but weekends show a slight dip. Consider establishing a 5-minute weekend "anchor habit" to maintain peaceful continuity.`,
          icon: '⚡',
        });
      }
    }
  }

  // ── 2. Positive Reinforcement (Steady Progress & Identity) ──────────────────
  if (allLogs.length >= 6) {
    const firstHalf = allLogs.slice(0, Math.floor(allLogs.length / 2));
    const secondHalf = allLogs.slice(Math.floor(allLogs.length / 2));
    
    const firstAvg = firstHalf.reduce((s, l) => s + logAccuracy(l), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, l) => s + logAccuracy(l), 0) / secondHalf.length;

    if (secondAvg > firstAvg + 0.08) {
      insights.push({
        id: 'steady_improvement',
        type: 'coaching',
        priority: 'low',
        title: '📈 Consistency is Compounding',
        message: "Your focus consistency is improving steadily! You're building a strong, self-reinforcing discipline block by block.",
        icon: '📈',
      });
    }
  }

  // Also celebrate high-streak habits
  const allHabits = goals.flatMap((g) => g.habits || []);
  const topHabit = [...allHabits].sort((a, b) => (b.streak || 0) - (a.streak || 0))[0];

  if (topHabit && topHabit.streak >= 5) {
    insights.push({
      id: 'identity_builder',
      type: 'coaching',
      priority: 'low',
      title: '💎 Rock-Solid Routine',
      message: `With a ${topHabit.streak}-day streak on "${topHabit.title}", you are no longer just practicing a habit—you are embodying it. Keep protective focus on this streak!`,
      icon: '💎',
    });
  }

  // ── 3. Habit Correlation Insights (Dynamic & Semantic Matcher) ─────────────
  let correlationFound = false;

  // Attempt dynamic date-overlap correlation first
  if (allHabits.length >= 2) {
    let bestPair = null;
    let maxOverlap = 0;

    for (let i = 0; i < allHabits.length; i++) {
      for (let j = i + 1; j < allHabits.length; j++) {
        const h1 = allHabits[i];
        const h2 = allHabits[j];
        const dates1 = h1.completedDates || [];
        const dates2 = h2.completedDates || [];
        if (dates1.length < 3 || dates2.length < 3) continue;

        const set1 = new Set(dates1);
        const overlap = dates2.filter(d => set1.has(d)).length;
        if (overlap >= 3 && overlap > maxOverlap) {
          maxOverlap = overlap;
          bestPair = { h1, h2, overlap };
        }
      }
    }

    if (bestPair) {
      insights.push({
        id: 'habit_correlation_dynamic',
        type: 'coaching',
        priority: 'medium',
        title: '🧬 Habit Pairing Detected',
        message: `Completing "${bestPair.h1.title}" heavily correlates with completing "${bestPair.h2.title}". These two form a highly effective routine anchor!`,
        icon: '🧬',
      });
      correlationFound = true;
    }
  }

  // Semantic fallback if no dynamic correlation found
  if (!correlationFound && allHabits.length > 0) {
    const titlesLower = allHabits.map(h => (h.title || '').toLowerCase());
    const hasRead = titlesLower.some(t => t.includes('read') || t.includes('book') || t.includes('study'));
    const hasWorkout = titlesLower.some(t => t.includes('workout') || t.includes('gym') || t.includes('exercise') || t.includes('run'));
    const hasWater = titlesLower.some(t => t.includes('water') || t.includes('hydrate'));

    if (hasRead) {
      insights.push({
        id: 'correlation_reading',
        type: 'coaching',
        priority: 'low',
        title: '🧠 Mental Feed Loop',
        message: 'Deep focus sessions increase significantly on days you complete your Reading block. Feeding your mind early powers focus.',
        icon: '🧠',
      });
    } else if (hasWorkout && hasWater) {
      insights.push({
        id: 'correlation_water',
        type: 'coaching',
        priority: 'low',
        title: '💧 Hydration Sync',
        message: 'Your hydration consistency keeps physical workout fatigue low. Keep drinking water to power through high-intensity days.',
        icon: '💧',
      });
    }
  }

  // ── 4. Burnout / Overload Detection (Sage Green Soft Warning) ───────────────
  const activeCount = allHabits.length + tasks.filter(t => !t.completed).length;
  const recentLogs = allLogs.slice(-3);
  const recentAvg =
    recentLogs.length > 0
      ? recentLogs.reduce((acc, l) => acc + logAccuracy(l), 0) / recentLogs.length
      : 1;

  if (activeCount >= 7 && recentAvg < 0.45) {
    insights.push({
      id: 'burnout_warning',
      type: 'improvement', // Use improvement type for premium sage green
      priority: 'high',
      title: '🌿 Energy Overload Detected',
      message: `You're tracking ${activeCount} active items while completion rate dipped. Consider activating "Minimalist Mode" today to protect your cognitive energy.`,
      icon: '🌿',
      actionLabel: 'Recommend Recovery Scheduling',
    });
  } else if (focusTime > 120 * 60 && recentAvg < 0.35) {
    insights.push({
      id: 'focus_imbalance',
      type: 'improvement',
      priority: 'high',
      title: '🔋 Restorative Reset Recommended',
      message: 'High focus time but lower task output detected. You might be grinding in place. Take a short, screen-free walk to recharge.',
      icon: '🔋',
    });
  }

  return insights;
};

// ── Recovery Strategies (With Smart Grouping & Prioritization) ───────────────
export const generateRecoveryStrategies = (goals, tasks) => {
  const strategies = [];
  const today = TODAY();

  // Aggregate all tracker items
  const allItems = [
    ...goals.flatMap((g) =>
      (g.habits || []).map((h) => ({ ...h, parentId: g.id, isHabit: true, streak: h.streak || 0 }))
    ),
    ...tasks.filter((t) => t.type === 'daily').map((t) => ({ ...t, isHabit: false, streak: t.currentStreak || 0 })),
  ];

  // Identify items that have missed exactly 2 days (Streak Emergency state)
  const criticalItems = allItems.filter((item) => (item.missedDays || 0) === 2);

  if (criticalItems.length === 0) {
    return strategies;
  }

  // ── Smart Recovery Prioritization: Group if multiple to avoid alert fatigue
  if (criticalItems.length > 1) {
    // Sort critical items by highest historical/current streak to prioritize high-impact habits
    const sortedCritical = [...criticalItems].sort((a, b) => b.streak - a.streak);
    const primaryItem = sortedCritical[0];

    const recoveryTarget =
      primaryItem.type === 'count'
        ? Math.max(1, Math.round((primaryItem.targetCount || 10) * 0.3))
        : Math.max(5, Math.round((primaryItem.targetTime ?? 30) * 0.3));

    strategies.push({
      id: `recovery_grouped_${primaryItem.id}`,
      type: 'recovery', // Use recovery type for premium amber
      priority: 'high',
      title: '🌱 Momentum Recovery Center',
      message: `You have ${criticalItems.length} habits at risk of streak resets. To protect your momentum, let's win just ONE small victory first. Complete a 5-minute session for "${primaryItem.title}" today!`,
      icon: '🌱',
      actionLabel: 'Activate Micro-Habit Target',
      recoveryPlan: {
        itemId: primaryItem.id,
        parentId: primaryItem.parentId,
        isHabit: primaryItem.isHabit,
        originalTarget: primaryItem.type === 'count' ? primaryItem.targetCount : primaryItem.targetTime,
        newTarget: recoveryTarget,
        type: primaryItem.type,
      },
    });
  } else {
    // Single critical habit recovery
    const item = criticalItems[0];
    const recoveryTarget =
      item.type === 'count'
        ? Math.max(1, Math.round((item.targetCount || 10) * 0.3))
        : Math.max(5, Math.round((item.targetTime ?? 30) * 0.3));

    strategies.push({
      id: `recovery_${item.id}`,
      type: 'recovery',
      priority: 'high',
      title: '🆘 Streak Emergency!',
      message: `"${item.title}" is on a 2-day miss window. To protect your streak, use our "Micro-Habit Plan" to complete just 30% of the target today.`,
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
  }

  // Backlog cleanup strategy
  const overdueTasks = tasks.filter(
    (t) => t.type === 'single' && t.targetDate < today && !t.completed
  );
  if (overdueTasks.length >= 3) {
    strategies.push({
      id: 'procrastination_purge',
      type: 'recovery',
      priority: 'medium',
      title: '🧹 Quiet Backlog Cleanse',
      message: `You have ${overdueTasks.length} overdue tasks weighing on your dashboard. Pick ONE tiny task to cross off, and let's reschedule the rest to clear your mental bandwidth.`,
      icon: '🧹',
      actionLabel: 'Cleanse Backlog',
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
      title: '🌅 Morning Intention',
      message: `Happy ${todayDayName}! A small, quiet win right now will trigger a dopamine loop and build strong momentum for the rest of your day.`,
    };
  }

  if (hour >= 9 && hour < 12 && progress < 30) {
    return {
      title: '⚡ High-Focus Window',
      message: 'Your mind is fresh and active right now. Protect these hours from distraction and tackle your single hardest task.',
    };
  }

  if (hour >= 14 && hour < 16 && progress < 60) {
    return {
      title: '☕ Energy Recovery Hour',
      message: 'Post-lunch slumps are natural. Step away for a quick screen-free stretch or walk, then return focused.',
    };
  }

  if (hour >= 20 && progress < 80) {
    return {
      title: '🌙 Calm Evening Routine',
      message: 'Wind down your mental loops. Focus on completing just one small element that will make tomorrow morning effortless.',
    };
  }

  return null;
};
